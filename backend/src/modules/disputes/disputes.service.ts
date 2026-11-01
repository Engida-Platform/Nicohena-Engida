import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Case,
  CaseCategory,
  CasePriority,
  CaseSeverity,
  CaseStatus,
  CaseType,
  CompensationStatus,
} from '../admin/cases/entities/case.entity';
import {
  CaseMessage,
  CaseMessageChannel,
  CaseMessageDeliveryStatus,
  CaseMessageDirection,
} from '../admin/cases/entities/case-message.entity';
import { CaseEvent } from '../admin/cases/entities/case-event.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { EscrowHold } from '../finance/entities/escrow-hold.entity';
import { EscrowService } from '../finance/services/escrow.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CreateDisputeDto, AddDisputeMessageDto } from './dto/create-dispute.dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @InjectRepository(Case)
    private readonly caseRepo: Repository<Case>,
    @InjectRepository(CaseMessage)
    private readonly messageRepo: Repository<CaseMessage>,
    @InjectRepository(CaseEvent)
    private readonly eventRepo: Repository<CaseEvent>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(EscrowHold)
    private readonly escrowRepo: Repository<EscrowHold>,
    @Optional()
    private readonly escrowService?: EscrowService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  private async nextCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CASE-${year}-`;
    const latest = await this.caseRepo
      .createQueryBuilder('c')
      .where('c.number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('c.number', 'DESC')
      .getOne();
    let seq = 1;
    if (latest) {
      const parts = latest.number.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) seq = num + 1;
    }
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  /**
   * File a dispute on a reservation and freeze escrow payout
   */
  async createDispute(dto: CreateDisputeDto, user: User) {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: ['property', 'guest', 'property.host'],
    });

    if (!booking) {
      throw new NotFoundException('Reservation not found');
    }

    const isGuest = booking.guestId === user.id;
    const isHost = booking.property?.hostId === user.id;

    if (!isGuest && !isHost && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only file disputes for your own reservations');
    }

    // Check if an active dispute already exists
    const existing = await this.caseRepo.findOne({
      where: {
        bookingId: booking.id,
        status: In([
          CaseStatus.OPEN,
          CaseStatus.IN_PROGRESS,
          CaseStatus.WAITING_ON_REQUESTER,
          CaseStatus.WAITING_ON_INTERNAL,
        ]),
      },
    });

    if (existing) {
      throw new ConflictException(`An active dispute (${existing.number}) is already open for this reservation.`);
    }

    const number = await this.nextCaseNumber();
    const now = new Date();

    const compensationAmount = dto.requestedCompensationETB
      ? Number(dto.requestedCompensationETB).toFixed(2)
      : null;

    const supportCase = this.caseRepo.create({
      number,
      type: CaseType.DISPUTE,
      category: CaseCategory.BOOKING,
      priority: CasePriority.HIGH,
      severity: CaseSeverity.HIGH,
      status: CaseStatus.OPEN,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      requesterUserId: user.id,
      requesterName: user.name || 'User',
      requesterEmail: user.email,
      bookingId: booking.id,
      propertyId: booking.propertyId,
      compensationAmount,
      compensationStatus: dto.requestedCompensationETB ? CompensationStatus.PROPOSED : CompensationStatus.NONE,
      firstResponseDueAt: new Date(now.getTime() + 4 * 3600 * 1000),
      resolutionDueAt: new Date(now.getTime() + 48 * 3600 * 1000),
      context: {
        issueType: dto.category,
        filedByRole: isGuest ? 'GUEST' : 'HOST',
        propertyTitle: booking.property?.title,
        propertyCity: booking.property?.city,
        bookingTotal: booking.totalPrice,
      },
    });

    const savedCase = await this.caseRepo.save(supportCase);

    // Initial message from requester
    const initialMessage = this.messageRepo.create({
      caseId: savedCase.id,
      direction: CaseMessageDirection.INBOUND,
      channel: CaseMessageChannel.IN_APP,
      authorName: user.name || 'User',
      authorEmail: user.email,
      body: dto.description.trim(),
      deliveryStatus: CaseMessageDeliveryStatus.DELIVERED_IN_APP,
      createdById: user.id,
    });
    await this.messageRepo.save(initialMessage);

    // Record creation event
    const event = this.eventRepo.create({
      caseId: savedCase.id,
      actorId: user.id,
      type: 'DISPUTE_FILED',
      toValue: CaseStatus.OPEN,
      reason: `Dispute filed by ${isGuest ? 'guest' : 'host'}: ${dto.category}`,
      metadata: { issueType: dto.category, compensationETB: dto.requestedCompensationETB },
    });
    await this.eventRepo.save(event);

    // Freeze escrow hold on the booking
    try {
      if (this.escrowService) {
        await this.escrowService.freezeHold(
          booking.id,
          `Dispute case ${savedCase.number} filed: ${dto.subject}`,
          user,
        );
        this.logger.log(`Escrow hold frozen for booking ${booking.id} due to dispute ${savedCase.number}`);
      }
    } catch (escrowErr: any) {
      this.logger.warn(`Could not freeze escrow for booking ${booking.id}: ${escrowErr.message}`);
    }

    // Send notification to counterparty
    const counterpartyId = isGuest ? booking.property?.hostId : booking.guestId;
    if (counterpartyId && this.notificationsService) {
      try {
        await this.notificationsService.createNotification({
          userId: counterpartyId,
          type: NotificationType.BOOKING_CANCELLED,
          title: `Dispute Case ${savedCase.number} Opened`,
          message: `A dispute has been raised regarding your stay at "${booking.property?.title || 'property'}". Funds are secured in escrow while support reviews.`,
          link: isGuest ? '/host/reservations' : '/dashboard',
          metadata: { caseId: savedCase.id, caseNumber: savedCase.number, bookingId: booking.id },
        });
      } catch {
        // Non-fatal
      }
    }

    return this.getDisputeDetail(savedCase.id, user);
  }

  /**
   * Get dispute for a specific booking
   */
  async getDisputeForBooking(bookingId: string, user: User) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['property'],
    });
    if (!booking) throw new NotFoundException('Reservation not found');

    const isGuest = booking.guestId === user.id;
    const isHost = booking.property?.hostId === user.id;
    if (!isGuest && !isHost && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not authorized to view disputes for this reservation');
    }

    const dispute = await this.caseRepo.findOne({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });

    if (!dispute) return { hasDispute: false, dispute: null };
    const detail = await this.getDisputeDetail(dispute.id, user);
    return { hasDispute: true, dispute: detail };
  }

  /**
   * List all disputes involving the user
   */
  async getMyDisputes(user: User) {
    return this.caseRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.booking', 'b')
      .leftJoinAndSelect('c.property', 'p')
      .where('c.requesterUserId = :userId OR b.guestId = :userId OR p.hostId = :userId', {
        userId: user.id,
      })
      .orderBy('c.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get full dispute detail with conversation messages and timeline
   */
  async getDisputeDetail(caseId: string, user: User) {
    const supportCase = await this.caseRepo.findOne({
      where: { id: caseId },
      relations: ['booking', 'property', 'messages'],
    });

    if (!supportCase) {
      throw new NotFoundException('Dispute case not found');
    }

    const isGuest = supportCase.booking?.guestId === user.id || supportCase.requesterUserId === user.id;
    const isHost = supportCase.property?.hostId === user.id;

    if (!isGuest && !isHost && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have access to this dispute case');
    }

    // Get messages
    const messages = await this.messageRepo.find({
      where: { caseId },
      order: { createdAt: 'ASC' },
    });

    // Get escrow hold status if booking exists
    let escrowStatus: string | null = null;
    let escrowAmountMinor: string | null = null;
    if (supportCase.bookingId) {
      const hold = await this.escrowRepo.findOne({
        where: { bookingId: supportCase.bookingId },
      });
      if (hold) {
        escrowStatus = hold.status;
        escrowAmountMinor = hold.amountMinor;
      }
    }

    return {
      id: supportCase.id,
      number: supportCase.number,
      type: supportCase.type,
      category: supportCase.category,
      priority: supportCase.priority,
      status: supportCase.status,
      subject: supportCase.subject,
      description: supportCase.description,
      requesterName: supportCase.requesterName,
      isRequester: supportCase.requesterUserId === user.id,
      bookingId: supportCase.bookingId,
      propertyId: supportCase.propertyId,
      propertyTitle: supportCase.property?.title,
      compensationAmount: supportCase.compensationAmount,
      compensationStatus: supportCase.compensationStatus,
      escrowStatus,
      escrowAmountMinor,
      context: supportCase.context,
      firstResponseDueAt: supportCase.firstResponseDueAt,
      resolutionDueAt: supportCase.resolutionDueAt,
      createdAt: supportCase.createdAt,
      messages: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        channel: m.channel,
        authorName: m.authorName,
        body: m.body,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Add message/evidence to dispute thread
   */
  async addDisputeMessage(caseId: string, dto: AddDisputeMessageDto, user: User) {
    const detail = await this.getDisputeDetail(caseId, user);
    const content = dto.message.trim();
    if (!content) throw new BadRequestException('Message cannot be empty');

    const msg = this.messageRepo.create({
      caseId,
      direction: CaseMessageDirection.INBOUND,
      channel: CaseMessageChannel.IN_APP,
      authorName: user.name || 'User',
      authorEmail: user.email,
      body: content,
      deliveryStatus: CaseMessageDeliveryStatus.DELIVERED_IN_APP,
      createdById: user.id,
    });
    const saved = await this.messageRepo.save(msg);

    await this.caseRepo.update(caseId, {
      lastMessageAt: new Date(),
    });

    return {
      id: saved.id,
      direction: saved.direction,
      channel: saved.channel,
      authorName: saved.authorName,
      body: saved.body,
      createdAt: saved.createdAt,
    };
  }

  /**
   * Claimant accepts compensation proposal
   */
  async acceptCompensation(caseId: string, user: User) {
    const supportCase = await this.caseRepo.findOne({
      where: { id: caseId },
      relations: ['booking', 'property'],
    });

    if (!supportCase) {
      throw new NotFoundException('Dispute case not found');
    }

    if (supportCase.requesterUserId !== user.id && supportCase.booking?.guestId !== user.id) {
      throw new ForbiddenException('Only the dispute claimant can accept compensation');
    }

    if (supportCase.compensationStatus !== CompensationStatus.PROPOSED) {
      throw new BadRequestException('No compensation proposal is currently pending acceptance');
    }

    supportCase.compensationStatus = CompensationStatus.APPROVED;
    supportCase.status = CaseStatus.RESOLVED;
    supportCase.resolvedAt = new Date();
    await this.caseRepo.save(supportCase);

    const event = this.eventRepo.create({
      caseId: supportCase.id,
      actorId: user.id,
      type: 'COMPENSATION_ACCEPTED',
      toValue: CompensationStatus.APPROVED,
      reason: 'Claimant accepted resolution compensation',
      metadata: { amount: supportCase.compensationAmount },
    });
    await this.eventRepo.save(event);

    return this.getDisputeDetail(supportCase.id, user);
  }
}
