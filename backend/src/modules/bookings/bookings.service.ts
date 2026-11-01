import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, EntityManager } from 'typeorm';
import { Booking, BookingStatus, PaymentMethod, PaymentStatus } from './entities/booking.entity';
import { BookingStatusHistory, BookingActorType } from './entities/booking-status-history.entity';
import { CancellationPolicyTier } from './entities/cancellation-policy';
import {
  CancellationRequest,
  CancellationRequestStatus,
  CancellationRequestSource,
} from './entities/cancellation-request.entity';
import { previewCancellationPolicy } from './cancellation-policy.service';
import { Property, ListingType, ListingStatus } from '../properties/entities/property.entity';
import { Room } from '../properties/entities/room.entity';
import { AvailabilityBlock } from '../properties/entities/availability-block.entity';
import { HostProfile, HostVerificationStatus } from '../../users/entities/host-profile.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UserRole, User } from '../../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { PricingService, PriceQuote } from './pricing.service';
import { Coupon } from '../coupons/entities/coupon.entity';
import { CouponRedemption } from '../coupons/entities/coupon-redemption.entity';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(AvailabilityBlock)
    private readonly availabilityBlockRepository: Repository<AvailabilityBlock>,
    @InjectRepository(HostProfile)
    private readonly hostProfileRepository: Repository<HostProfile>,
    @Optional()
    private readonly notificationsService?: NotificationsService,
    @Optional()
    @InjectRepository(BookingStatusHistory)
    private readonly statusHistoryRepository?: Repository<BookingStatusHistory>,
    @Optional()
    private readonly pricingService?: PricingService,
    @Optional()
    @InjectRepository(CancellationRequest)
    private readonly cancellationRequestRepository?: Repository<CancellationRequest>,
  ) {}

  async create(createBookingDto: CreateBookingDto, guestId: string): Promise<Booking> {
    const { propertyId, roomId, checkInDate, checkOutDate } = createBookingDto;
    const guestCount = createBookingDto.guestCount ?? 1;

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Booking creation and host date blocks share a lock on the property row.
    // The lock keeps overlap checks and writes in one serialized transaction.
    const { id, totalPrice, hostId, propertyTitle } =
      await this.bookingRepository.manager.transaction(async (manager) => {
      const propertyRepository = manager.getRepository(Property);
      const bookingRepository = manager.getRepository(Booking);
      const roomRepository = manager.getRepository(Room);
      const availabilityBlockRepository = manager.getRepository(AvailabilityBlock);

      const property = await propertyRepository.findOne({
        where: { id: propertyId, isAvailable: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!property) {
        throw new NotFoundException('Property not found or not available');
      }
      if (property.listingType === ListingType.SALE) {
        throw new BadRequestException('This property is listed for sale, not for short-term booking');
      }
      if (property.status !== ListingStatus.PUBLISHED) {
        throw new BadRequestException('This property is not currently published for booking');
      }
      if (property.adminHidden) {
        throw new BadRequestException('This property is temporarily unavailable for booking');
      }

      // Prevent new bookings for listings whose host is not currently VERIFIED
      const hostProfile = await manager.getRepository(HostProfile).findOne({
        where: { userId: property.hostId },
      });
      if (!hostProfile || hostProfile.verificationStatus !== HostVerificationStatus.VERIFIED) {
        throw new BadRequestException(
          'This property is not currently available for booking because the host is not verified',
        );
      }

      if (!roomId && guestCount > property.maxGuests) {
        throw new BadRequestException(`This property allows up to ${property.maxGuests} guests`);
      }
      if (property.hostId === guestId) {
        throw new BadRequestException('You cannot book your own property');
      }

      let pricePerNight = Number(property.pricePerNight);
      if (roomId) {
        const room = await roomRepository.findOne({
          where: { id: roomId, propertyId, isAvailable: true },
        });
        if (!room) throw new NotFoundException('Room not found or not available');
        if (guestCount > room.capacity) {
          throw new BadRequestException(`This room allows up to ${room.capacity} guests`);
        }
        pricePerNight = Number(room.pricePerNight);
      }

      const overlapping = await bookingRepository
        .createQueryBuilder('booking')
        .where('booking.propertyId = :propertyId', { propertyId })
        .andWhere('booking.status NOT IN (:...excludedStatuses)', {
          excludedStatuses: [BookingStatus.CANCELLED],
        })
        .andWhere('(booking.check_in_date < :checkOut AND booking.check_out_date > :checkIn)', {
          checkIn: checkInDate,
          checkOut: checkOutDate,
        })
        .andWhere(
          roomId ? '(booking.room_id IS NULL OR booking.room_id = :roomId)' : '1=1',
          { roomId },
        )
        .getCount();

      if (overlapping > 0) {
        throw new BadRequestException('The selected dates overlap with an existing booking');
      }

      const blocked = await availabilityBlockRepository
        .createQueryBuilder('block')
        .where('block.propertyId = :propertyId', { propertyId })
        .andWhere('(block.start_date < :checkOut AND block.end_date > :checkIn)', {
          checkIn: checkInDate,
          checkOut: checkOutDate,
        })
        .getCount();

      if (blocked > 0) {
        throw new BadRequestException('The selected dates are blocked by the host and not available for booking');
      }

      let quote: PriceQuote;
      if (this.pricingService) {
        quote = await this.pricingService.quote({
          propertyId,
          roomId: roomId || undefined,
          checkInDate,
          checkOutDate,
          guestCount,
          couponCode: createBookingDto.couponCode,
          userId: guestId,
        });
      } else {
        const basePrice = nights * pricePerNight;
        const cleaningFee = Number(property.cleaningFee) || 0;
        const total = basePrice + cleaningFee;
        quote = {
          nights,
          pricePerNight,
          basePrice,
          cleaningFee,
          subtotal: total,
          serviceFee: 0,
          discount: 0,
          totalPrice: total,
          currency: 'ETB',
          breakdown: {
            nights,
            nightlyRate: pricePerNight,
            basePrice,
            cleaningFee,
            serviceFee: 0,
            discount: 0,
            total,
            currency: 'ETB',
            quoteVersion: 'v2',
          },
        };
      }

      const totalPrice = quote.totalPrice;
      const discountAmount = quote.discount || 0;
      const couponCode = quote.coupon?.code || null;
      const priceBreakdown = quote.breakdown;

      if (quote.coupon) {
        const couponRepo = manager.getRepository(Coupon);
        const redemptionRepo = manager.getRepository(CouponRedemption);
        await redemptionRepo.save(
          redemptionRepo.create({
            couponId: quote.coupon.id,
            userId: guestId,
            discountAmountMinor: Math.round(quote.coupon.discountAmount * 100),
          }),
        );
        await couponRepo.increment({ id: quote.coupon.id }, 'redemptionsCount', 1);
      }

      const method = createBookingDto.paymentMethod || PaymentMethod.CASH_ON_ARRIVAL;
      const paymentStatus =
        method === PaymentMethod.CASH_ON_ARRIVAL
          ? PaymentStatus.ON_ARRIVAL
          : PaymentStatus.PENDING;

      const reference = await this.nextBookingReference(manager);

      const booking = bookingRepository.create({
        reference,
        propertyId,
        roomId: roomId || null,
        guestId,
        checkInDate,
        checkOutDate,
        guestCount,
        totalPrice,
        discountAmount,
        couponCode,
        priceBreakdown,
        quoteVersion: 'v2',
        status: BookingStatus.PENDING,
        cancellationPolicy: CancellationPolicyTier.MODERATE,
        paymentMethod: method,
        paymentStatus,
        paymentReference: null,
        paymentCurrency: createBookingDto.paymentCurrency || quote.currency || 'ETB',
        paidAt: null,
      });
      const saved = await bookingRepository.save(booking);
      return {
        id: saved.id,
        reference,
        totalPrice,
        hostId: property.hostId,
        propertyTitle: property.title,
      };
    });

    try {
      await this.statusHistoryRepository?.save(
        this.statusHistoryRepository.create({
          bookingId: id,
          fromStatus: null,
          toStatus: BookingStatus.PENDING,
          source: BookingActorType.GUEST,
          actorId: guestId,
          reason: 'Reservation requested',
        }),
      );
    } catch (historyError: unknown) {
      this.logger.warn(
        `Booking ${id} was created without a status history row: ${
          historyError instanceof Error ? historyError.message : String(historyError)
        }`,
      );
    }

    this.logger.log(
      `Booking created: ${id} for property ${propertyId} (${nights} nights, ETB ${totalPrice})`,
    );

    if (this.notificationsService) {
      try {
        await this.notificationsService.createNotification({
          userId: hostId,
          type: NotificationType.BOOKING_REQUESTED,
          title: 'New Reservation Request',
          message: `You received a new reservation request for "${propertyTitle}" (${nights} ${nights === 1 ? 'night' : 'nights'}).`,
          link: '/host/reservations',
          metadata: { bookingId: id, propertyId },
          idempotencyKey: `booking_${id}_REQUESTED`,
        });
      } catch (notifErr: unknown) {
        this.logger.warn(`Failed to dispatch booking notification: ${notifErr}`);
      }
    }

    return this.findOne(id, guestId);
  }

  async findOne(
    id: string,
    requesterId: string,
    requesterRole: UserRole = UserRole.USER,
  ): Promise<Booking> {
    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoin('booking.guest', 'guest')
      .addSelect(['guest.id', 'guest.name', 'guest.email'])
      .where('booking.id = :id', { id })
      .getOne();

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    if (booking.guestId !== requesterId && booking.property.hostId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view reservations for your own stay or property');
    }

    return booking;
  }

  async findMyBookings(guestId: string): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: { guestId },
      relations: ['property', 'property.host', 'room'],
      order: { createdAt: 'DESC' },
    });
  }

  async findHostReservations(hostId: string): Promise<Booking[]> {
    const profile = await this.hostProfileRepository.findOne({ where: { userId: hostId } });
    if (!profile) throw new ForbiddenException('Create a host profile before viewing host reservations');

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoin('booking.guest', 'guest')
      .addSelect(['guest.id', 'guest.name'])
      .where('property.hostId = :hostId', { hostId })
      .orderBy('booking.createdAt', 'DESC')
      .getMany();
    return bookings;
  }

  async updateStatus(
    id: string,
    updateDto: UpdateBookingStatusDto,
    userId: string,
    userRole: UserRole,
    options?: {
      actor?: User;
      reason?: string;
      source?: BookingActorType;
      manager?: EntityManager;
    },
  ): Promise<Booking> {
    const bookingRepo = options?.manager
      ? options.manager.getRepository(Booking)
      : this.bookingRepository;
    const historyRepo = options?.manager
      ? options.manager.getRepository(BookingStatusHistory)
      : this.statusHistoryRepository;

    const booking = await bookingRepo.findOne({
      where: { id },
      relations: ['property'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    const isHost = booking.property.hostId === userId;
    const isGuest = booking.guestId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    // Authorization rules
    if (updateDto.status === BookingStatus.CONFIRMED) {
      if (!isHost && !isAdmin) {
        throw new ForbiddenException('Only the property host can confirm bookings');
      }
    } else if (updateDto.status === BookingStatus.CANCELLED) {
      if (!isHost && !isGuest && !isAdmin) {
        throw new ForbiddenException('Only the host or guest can cancel a booking');
      }
    } else if (updateDto.status === BookingStatus.COMPLETED) {
      if (!isHost && !isAdmin) {
        throw new ForbiddenException('Only the property host can mark a booking as completed');
      }
    }

    // Validate status transitions
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.COMPLETED]: [],
    };

    if (!validTransitions[booking.status]?.includes(updateDto.status)) {
      throw new BadRequestException(
        `Cannot transition from "${booking.status}" to "${updateDto.status}"`,
      );
    }

    if (updateDto.status === BookingStatus.COMPLETED) {
      const today = new Date().toISOString().slice(0, 10);
      if (booking.checkOutDate > today) {
        throw new BadRequestException('A reservation can only be completed on or after its check-out date');
      }
    }

    const updateResult = await bookingRepo.update(
      { id, status: booking.status },
      {
        status: updateDto.status,
        ...(updateDto.status === BookingStatus.CANCELLED
          ? {
              cancelledById: userId,
              cancelledByType:
                userRole === UserRole.ADMIN
                  ? BookingActorType.ADMIN
                  : isHost
                    ? BookingActorType.HOST
                    : BookingActorType.GUEST,
              cancelledAt: new Date(),
              cancellationReason:
                options?.reason?.trim() || 'Reservation cancelled',
            }
          : {}),
      },
    );
    if (updateResult.affected !== 1) {
      throw new ConflictException('This reservation changed while you were acting. Reload it and try again.');
    }

    const source =
      options?.source ??
      (userRole === UserRole.ADMIN
        ? BookingActorType.ADMIN
        : isHost
          ? BookingActorType.HOST
          : BookingActorType.GUEST);

    try {
      await historyRepo?.save(
        historyRepo.create({
          bookingId: id,
          fromStatus: booking.status,
          toStatus: updateDto.status,
          source,
          actorId: userId,
          reason:
            options?.reason?.trim() ||
            (updateDto.status === BookingStatus.CANCELLED
              ? 'Reservation cancelled'
              : `Reservation marked ${updateDto.status.toLowerCase()}`),
        }),
      );
    } catch (historyError: unknown) {
      this.logger.warn(
        `Booking ${id} changed status without a history row: ${
          historyError instanceof Error ? historyError.message : String(historyError)
        }`,
      );
    }

    if (this.notificationsService) {
      try {
        const propTitle = booking.property?.title || 'your property';
        const refStr = booking.reference || `#${booking.id.slice(0, 8)}`;

        if (booking.property?.hostId) {
          if (updateDto.status === BookingStatus.CANCELLED) {
            await this.notificationsService.createNotification({
              userId: booking.property.hostId,
              type: NotificationType.BOOKING_CANCELLED,
              title: 'Reservation Cancelled',
              message: `Reservation ${refStr} for "${propTitle}" has been cancelled.`,
              link: '/host/reservations',
              metadata: { bookingId: id, propertyId: booking.property.id },
              idempotencyKey: `booking_${id}_CANCELLED_host`,
            });
          } else if (updateDto.status === BookingStatus.CONFIRMED) {
            await this.notificationsService.createNotification({
              userId: booking.property.hostId,
              type: NotificationType.BOOKING_CONFIRMED,
              title: 'Reservation Confirmed',
              message: `Reservation ${refStr} for "${propTitle}" has been confirmed.`,
              link: '/host/reservations',
              metadata: { bookingId: id, propertyId: booking.property.id },
              idempotencyKey: `booking_${id}_CONFIRMED_host`,
            });
          } else if (updateDto.status === BookingStatus.COMPLETED) {
            await this.notificationsService.createNotification({
              userId: booking.property.hostId,
              type: NotificationType.BOOKING_COMPLETED,
              title: 'Reservation Completed',
              message: `Reservation ${refStr} for "${propTitle}" has been marked complete.`,
              link: '/host/reservations',
              metadata: { bookingId: id, propertyId: booking.property.id },
              idempotencyKey: `booking_${id}_COMPLETED_host`,
            });
          }
        }

        if (booking.guestId) {
          if (updateDto.status === BookingStatus.CANCELLED) {
            await this.notificationsService.createNotification({
              userId: booking.guestId,
              type: NotificationType.BOOKING_CANCELLED,
              title: 'Reservation Cancelled',
              message: `Your reservation ${refStr} at "${propTitle}" has been cancelled.`,
              link: `/bookings/${id}`,
              metadata: { bookingId: id, propertyId: booking.property?.id },
              idempotencyKey: `booking_${id}_CANCELLED_guest`,
            });
          } else if (updateDto.status === BookingStatus.CONFIRMED) {
            await this.notificationsService.createNotification({
              userId: booking.guestId,
              type: NotificationType.BOOKING_CONFIRMED,
              title: 'Reservation Confirmed',
              message: `Your reservation ${refStr} at "${propTitle}" has been confirmed!`,
              link: `/bookings/${id}`,
              metadata: { bookingId: id, propertyId: booking.property?.id },
              idempotencyKey: `booking_${id}_CONFIRMED_guest`,
            });
          } else if (updateDto.status === BookingStatus.COMPLETED) {
            await this.notificationsService.createNotification({
              userId: booking.guestId,
              type: NotificationType.BOOKING_COMPLETED,
              title: 'Reservation Completed',
              message: `Your stay at "${propTitle}" is complete. We hope you had a great time!`,
              link: `/bookings/${id}`,
              metadata: { bookingId: id, propertyId: booking.property?.id },
              idempotencyKey: `booking_${id}_COMPLETED_guest`,
            });
          }
        }
      } catch (notifErr: unknown) {
        this.logger.warn(`Failed to dispatch booking status notification: ${notifErr}`);
      }
    }

    this.logger.log(`Booking ${id} status updated to ${updateDto.status} by user ${userId}`);
    return this.findOne(id, userId, userRole);
  }

  /**
   * BOOK-03: Guest cancellation request with policy evaluation and automated refunds.
   */
  async requestCancellation(bookingId: string, guestId: string, reason: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['property'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.guestId !== guestId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException(`Booking is already ${booking.status.toLowerCase()}`);
    }

    // If unpaid or cash on arrival, cancel immediately with no refund required
    if (booking.paymentStatus !== PaymentStatus.PAID) {
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledById = guestId;
      booking.cancelledByType = BookingActorType.GUEST;
      booking.cancelledAt = new Date();
      booking.cancellationReason = reason || 'Guest cancelled unpaid reservation';
      await this.bookingRepository.save(booking);

      await this.statusHistoryRepository?.save(
        this.statusHistoryRepository.create({
          bookingId: booking.id,
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.CANCELLED,
          source: BookingActorType.GUEST,
          actorId: guestId,
          reason: booking.cancellationReason,
        }),
      );

      return {
        message: 'Reservation cancelled successfully',
        status: BookingStatus.CANCELLED,
        refundRequired: false,
      };
    }

    // For paid booking: check if there is already an open cancellation request
    if (this.cancellationRequestRepository) {
      const existing = await this.cancellationRequestRepository.findOne({
        where: {
          bookingId: booking.id,
          status: CancellationRequestStatus.REQUESTED,
        },
      });

      if (existing) {
        throw new ConflictException('A cancellation request is already open for this booking');
      }

      const preview = previewCancellationPolicy({
        policyTier: booking.cancellationPolicy,
        checkInDate: booking.checkInDate,
        totalPrice: booking.totalPrice,
        currency: booking.paymentCurrency || 'ETB',
      });

      const request = this.cancellationRequestRepository.create({
        bookingId: booking.id,
        source: CancellationRequestSource.GUEST,
        requestedById: guestId,
        policyTier: preview.policyTier,
        estimatedRefundAmount: preview.refundAmount.toString(),
        policyPreview: preview as unknown as Record<string, unknown>,
        currency: preview.currency,
        reason: reason || 'Guest cancellation request',
        status: CancellationRequestStatus.REQUESTED,
      });

      const saved = await this.cancellationRequestRepository.save(request);

      // Notify host
      if (this.notificationsService && booking.property?.hostId) {
        await this.notificationsService.createNotification({
          userId: booking.property.hostId,
          type: NotificationType.BOOKING_CANCELLED,
          title: 'Guest Requested Cancellation',
          message: `Guest requested cancellation for booking ${booking.reference || booking.id}. Policy refund: ${preview.refundPercent}%.`,
          link: '/host/reservations',
          metadata: {
            bookingId: booking.id,
            cancellationRequestId: saved.id,
            refundAmount: preview.refundAmount,
          },
        });
      }

      return {
        message: 'Cancellation request submitted for review',
        cancellationRequestId: saved.id,
        policyPreview: preview,
        status: 'CANCELLATION_REQUESTED',
      };
    }

    return {
      message: 'Cancellation request recorded',
      status: 'CANCELLATION_REQUESTED',
    };
  }

  /**
   * Allocate the next human-readable booking reference inside the booking
   * transaction. The database sequence is the source of truth; the fallback
   * keeps isolated unit-test mocks usable.
   */
  private async nextBookingReference(manager: EntityManager): Promise<string> {
    const year = new Date().getUTCFullYear();
    const query = (manager as unknown as { query?: (sql: string) => Promise<unknown> })
      .query;

    if (typeof query === 'function') {
      const rows = (await query.call(
        manager,
        `SELECT nextval('booking_reference_seq') AS value`,
      )) as Array<{ value: string | number }>;
      const sequence = Number(rows?.[0]?.value);
      if (Number.isFinite(sequence) && sequence > 0) {
        return `BKG-${year}-${String(sequence).padStart(6, '0')}`;
      }
    }

    return `BKG-${year}-${String(Date.now()).slice(-6)}`;
  }
}
