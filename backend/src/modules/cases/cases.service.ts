import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  Case,
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
import { Booking } from '../bookings/entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import {
  AddUserCaseMessageDto,
  CreateUserCaseDto,
  DecideCaseCompensationDto,
} from './dto/user-case.dto';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    @InjectRepository(Case)
    private readonly caseRepository: Repository<Case>,
    @InjectRepository(CaseMessage)
    private readonly messageRepository: Repository<CaseMessage>,
    @InjectRepository(CaseEvent)
    private readonly eventRepository: Repository<CaseEvent>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Creates a new user-initiated support case / dispute.
   */
  async create(dto: CreateUserCaseDto, user: User): Promise<Case> {
    const year = new Date().getFullYear();
    const shortCode = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    const number = `CAS-${year}-${shortCode}`;

    if (dto.bookingId) {
      const booking = await this.bookingRepository.findOne({
        where: { id: dto.bookingId },
      });
      if (!booking) {
        throw new NotFoundException('Linked reservation not found');
      }
    }

    if (dto.propertyId) {
      const property = await this.propertyRepository.findOne({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException('Linked property not found');
      }
    }

    const now = new Date();
    const resolutionDueAt = new Date(now.getTime() + 48 * 3600 * 1000); // 48h SLA

    const newCase = this.caseRepository.create({
      number,
      type: dto.type || CaseType.SUPPORT,
      category: dto.category,
      priority: CasePriority.NORMAL,
      severity: CaseSeverity.MEDIUM,
      status: CaseStatus.OPEN,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      requesterUserId: user.id,
      requesterName: user.name || 'User',
      requesterEmail: user.email || null,
      bookingId: dto.bookingId || null,
      propertyId: dto.propertyId || null,
      resolutionDueAt,
      firstResponseDueAt: new Date(now.getTime() + 4 * 3600 * 1000), // 4h SLA
      lastMessageAt: now,
    });

    const savedCase = await this.caseRepository.save(newCase);

    // Initial message
    const initialMessage = this.messageRepository.create({
      caseId: savedCase.id,
      direction: CaseMessageDirection.INBOUND,
      channel: CaseMessageChannel.IN_APP,
      authorName: user.name || 'User',
      authorEmail: user.email || null,
      body: dto.description.trim(),
      deliveryStatus: CaseMessageDeliveryStatus.DELIVERED_IN_APP,
      createdById: user.id,
    });
    await this.messageRepository.save(initialMessage);

    // Timeline event
    const event = this.eventRepository.create({
      caseId: savedCase.id,
      actorId: user.id,
      type: 'case.created',
      metadata: {
        category: dto.category,
        subject: dto.subject,
        source: 'USER_PORTAL',
      },
    });
    await this.eventRepository.save(event);

    await this.auditService.record({
      actor: user,
      action: 'case.created',
      entityType: 'case',
      entityId: savedCase.id,
      after: {
        number: savedCase.number,
        category: savedCase.category,
        subject: savedCase.subject,
      },
    });

    this.logger.log(`Created support case ${savedCase.number} by user ${user.id}`);
    return savedCase;
  }

  /**
   * Lists all cases created by or involving the authenticated user.
   */
  async listMine(
    user: User,
    page = 1,
    limit = 20,
  ): Promise<{ items: Case[]; total: number; page: number; limit: number }> {
    const [items, total] = await this.caseRepository.findAndCount({
      where: { requesterUserId: user.id },
      relations: ['booking', 'property'],
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  /**
   * Retrieves case details and full message history for the customer.
   */
  async detail(id: string, user: User): Promise<Case> {
    const supportCase = await this.caseRepository.findOne({
      where: { id },
      relations: ['messages', 'booking', 'property'],
    });

    if (!supportCase) {
      throw new NotFoundException(`Support case ${id} not found`);
    }

    if (supportCase.requesterUserId !== user.id) {
      throw new ForbiddenException('You do not have permission to view this support case');
    }

    if (supportCase.messages) {
      supportCase.messages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }

    return supportCase;
  }

  /**
   * Adds an inbound message reply from the customer.
   */
  async addMessage(id: string, dto: AddUserCaseMessageDto, user: User): Promise<CaseMessage> {
    const supportCase = await this.caseRepository.findOne({ where: { id } });

    if (!supportCase) {
      throw new NotFoundException(`Support case ${id} not found`);
    }

    if (supportCase.requesterUserId !== user.id) {
      throw new ForbiddenException('You do not have permission to reply to this support case');
    }

    if (supportCase.status === CaseStatus.CLOSED) {
      throw new BadRequestException('This support case has been closed and cannot receive new replies');
    }

    const message = this.messageRepository.create({
      caseId: id,
      direction: CaseMessageDirection.INBOUND,
      channel: CaseMessageChannel.IN_APP,
      authorName: user.name || 'User',
      authorEmail: user.email || null,
      body: dto.body.trim(),
      deliveryStatus: CaseMessageDeliveryStatus.DELIVERED_IN_APP,
      createdById: user.id,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Transition status to WAITING_ON_INTERNAL and update timestamp
    supportCase.status = CaseStatus.WAITING_ON_INTERNAL;
    supportCase.lastMessageAt = new Date();
    await this.caseRepository.save(supportCase);

    const event = this.eventRepository.create({
      caseId: id,
      actorId: user.id,
      type: 'message.inbound',
      metadata: {
        length: dto.body.length,
      },
    });
    await this.eventRepository.save(event);

    return savedMessage;
  }

  /**
   * Customer accepts or declines a compensation offer proposed by staff.
   */
  async decideCompensation(
    id: string,
    dto: DecideCaseCompensationDto,
    user: User,
  ): Promise<Case> {
    const supportCase = await this.caseRepository.findOne({ where: { id } });

    if (!supportCase) {
      throw new NotFoundException(`Support case ${id} not found`);
    }

    if (supportCase.requesterUserId !== user.id) {
      throw new ForbiddenException('You do not have permission to decide compensation on this case');
    }

    if (supportCase.compensationStatus !== CompensationStatus.PROPOSED) {
      throw new BadRequestException('No pending compensation offer is awaiting decision on this case');
    }

    if (dto.action === 'ACCEPT') {
      supportCase.compensationStatus = CompensationStatus.APPROVED;
      supportCase.compensationNote = dto.note?.trim() || 'Accepted by customer';
    } else {
      supportCase.compensationStatus = CompensationStatus.REJECTED;
      supportCase.compensationNote = dto.note?.trim() || 'Declined by customer';
    }

    supportCase.compensationDecidedAt = new Date();
    const updated = await this.caseRepository.save(supportCase);

    const event = this.eventRepository.create({
      caseId: id,
      actorId: user.id,
      type: `compensation.${dto.action.toLowerCase()}`,
      metadata: {
        action: dto.action,
        note: dto.note || null,
        amount: supportCase.compensationAmount,
      },
    });
    await this.eventRepository.save(event);

    await this.auditService.record({
      actor: user,
      action: `case.compensation.${dto.action.toLowerCase()}`,
      entityType: 'case',
      entityId: id,
      metadata: {
        action: dto.action,
        amount: supportCase.compensationAmount,
      },
    });

    return updated;
  }
}
