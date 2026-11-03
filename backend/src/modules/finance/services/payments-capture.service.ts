import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { ProviderEvent, ProviderEventStatus } from '../entities/provider-event.entity';
import { EscrowHold, EscrowHoldStatus } from '../entities/escrow-hold.entity';
import { CommissionSnapshot } from '../entities/commission-snapshot.entity';
import { TaxLine, TaxType } from '../entities/tax-line.entity';
import { Booking, BookingStatus, PaymentStatus as BookingPaymentStatus } from '../../bookings/entities/booking.entity';
import { User, UserRole } from '../../../users/entities/user.entity';
import { SandboxPaymentProvider } from '../providers/sandbox-payment.provider';
import { ChapaPaymentProvider } from '../providers/chapa-payment.provider';
import { LedgerService } from './ledger.service';
import { FinanceSettingsService } from './finance-settings.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { calculateBasisPoints, toMinorUnits } from '../../../lib/money';
import { LedgerTransactionType } from '../entities/ledger-transaction.entity';

export interface CreateSessionDto {
  bookingId: string;
  paymentMethod: string;
  currency?: string;
  customerPhone?: string;
  returnUrl?: string;
}

@Injectable()
export class PaymentsCaptureService {
  private readonly logger = new Logger(PaymentsCaptureService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(ProviderEvent)
    private readonly eventRepository: Repository<ProviderEvent>,
    @InjectRepository(EscrowHold)
    private readonly escrowRepository: Repository<EscrowHold>,
    @InjectRepository(CommissionSnapshot)
    private readonly commissionRepository: Repository<CommissionSnapshot>,
    @InjectRepository(TaxLine)
    private readonly taxRepository: Repository<TaxLine>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly sandboxProvider: SandboxPaymentProvider,
    private readonly chapaProvider: ChapaPaymentProvider,
    private readonly ledgerService: LedgerService,
    private readonly settingsService: FinanceSettingsService,
    private readonly auditService: AuditService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Guest initiates payment session. Amount is derived strictly from server booking quote.
   */
  async createPaymentSession(dto: CreateSessionDto, user: User) {
    if (!dto.bookingId) {
      throw new BadRequestException('bookingId is required');
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
      relations: ['property'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    // SEC-03: Booking ownership check - only guest or admin may initiate payment
    if (booking.guestId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to pay for this booking');
    }

    // SEC-03: Prevent payment on cancelled or completed bookings
    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException(`Cannot initiate payment for a ${booking.status.toLowerCase()} booking`);
    }

    // PAY-01: Update booking payment method to match user selection
    if (dto.paymentMethod && booking.paymentMethod !== dto.paymentMethod) {
      booking.paymentMethod = dto.paymentMethod as any;
      if (booking.paymentStatus !== BookingPaymentStatus.PAID) {
        booking.paymentStatus = BookingPaymentStatus.PENDING;
      }
      await this.bookingRepository.save(booking);
    }

    // Rental cash on arrival is no longer allowed for new bookings
    if (dto.paymentMethod === 'CASH_ON_ARRIVAL') {
      throw new BadRequestException(
        'Cash on arrival is no longer accepted for rental reservations. Please select an electronic payment method.',
      );
    }

    if (booking.paymentStatus === BookingPaymentStatus.PAID) {
      throw new ConflictException('This booking has already been paid');
    }

    // SEC-05: Enforce single active session per booking
    const existingActive = await this.paymentRepository.findOne({
      where: [
        { bookingId: booking.id, status: PaymentStatus.INITIATED },
        { bookingId: booking.id, status: PaymentStatus.PENDING },
      ],
      order: { createdAt: 'DESC' },
    });

    if (existingActive) {
      const isExpired = existingActive.expiresAt && existingActive.expiresAt.getTime() <= Date.now();
      if (isExpired) {
        existingActive.status = PaymentStatus.EXPIRED;
        await this.paymentRepository.save(existingActive);
      } else if (existingActive.method === dto.paymentMethod) {
        return {
          paymentId: existingActive.id,
          sessionId: existingActive.metadata?.sessionId || existingActive.idempotencyKey,
          checkoutUrl: existingActive.metadata?.checkoutUrl,
          providerPaymentId: existingActive.providerPaymentId,
          status: existingActive.status,
          amount: booking.totalPrice,
          currency: existingActive.currency,
          mode: existingActive.provider === 'CHAPA' ? 'live' : 'sandbox',
        };
      } else {
        existingActive.status = PaymentStatus.EXPIRED;
        await this.paymentRepository.save(existingActive);
      }
    }

    const amountMinor = toMinorUnits(booking.totalPrice);
    if (amountMinor <= 0n) {
      throw new BadRequestException('Booking amount must be greater than zero');
    }

    const currency = dto.currency || booking.paymentCurrency || 'ETB';
    const settings = await this.settingsService.getAllSettings();
    const liveAllowed = settings.liveCaptureEnabled;

    const provider =
      liveAllowed && dto.paymentMethod === 'CHAPA'
        ? this.chapaProvider
        : this.sandboxProvider;

    const idempotencyKey = `bkg_${booking.id}_pay_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const sessionResult = await provider.createSession({
      bookingId: booking.id,
      amountMinor,
      currency,
      paymentMethod: dto.paymentMethod,
      customerEmail: user.email,
      customerName: user.name || 'Guest',
      customerPhone: dto.customerPhone,
      returnUrl: dto.returnUrl,
      propertyTitle: booking.property?.title || 'ENGIDA Stay',
      city: booking.property?.city || 'Addis Ababa',
      idempotencyKey,
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const payment = this.paymentRepository.create({
      bookingId: booking.id,
      provider: provider.providerName,
      providerPaymentId: sessionResult.providerPaymentId || sessionResult.sessionId,
      idempotencyKey,
      status: PaymentStatus.INITIATED,
      method: dto.paymentMethod,
      amountMinor: amountMinor.toString(),
      currency,
      expiresAt,
      metadata: {
        ...(sessionResult.metadata || {}),
        sessionId: sessionResult.sessionId,
        checkoutUrl: sessionResult.checkoutUrl,
      },
    });

    const savedPayment = await this.paymentRepository.save(payment);

    return {
      paymentId: savedPayment.id,
      sessionId: sessionResult.sessionId,
      checkoutUrl: sessionResult.checkoutUrl,
      providerPaymentId: savedPayment.providerPaymentId,
      status: savedPayment.status,
      amount: booking.totalPrice,
      currency: savedPayment.currency,
      mode: sessionResult.mode,
    };
  }

  /**
   * Retrieves public payment session status (no secrets or sensitive PAN data).
   */
  async getPaymentSession(id: string, user: User) {
    const payment = await this.paymentRepository.findOne({
      where: [{ id }, { providerPaymentId: id }, { idempotencyKey: id }],
      relations: ['booking'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Owner check: booking guest or admin
    if (payment.booking?.guestId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have access to this payment session');
    }

    return {
      id: payment.id,
      bookingId: payment.bookingId,
      status: payment.status,
      method: payment.method,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      capturedAt: payment.capturedAt,
      failureCode: payment.failureCode,
      failureMessage: payment.failureMessage,
    };
  }

  /**
   * Webhook ingestion with signature verification and replay safety.
   */
  /**
   * Evaluates whether sandbox payments and webhooks are permitted.
   * Allowed in non-production, when explicitly enabled via env, or when live gateway
   * capture is not active in platform settings (default sandbox mode).
   */
  private async isSandboxAllowed(): Promise<boolean> {
    if (
      process.env.SANDBOX_WEBHOOKS_ENABLED === 'false' ||
      process.env.ALLOW_SANDBOX_PAYMENTS === 'false'
    ) {
      return false;
    }
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.SANDBOX_WEBHOOKS_ENABLED === 'true' ||
      process.env.ALLOW_SANDBOX_PAYMENTS === 'true'
    ) {
      return true;
    }
    try {
      const settings = await this.settingsService.getAllSettings();
      // If live gateway capture is not enabled, sandbox simulation is the active checkout method
      return !settings.liveCaptureEnabled;
    } catch {
      return true;
    }
  }

  async handleWebhook(
    providerName: string,
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) {
    if (providerName.toUpperCase() === 'SANDBOX') {
      const allowed = await this.isSandboxAllowed();
      if (!allowed) {
        throw new ForbiddenException('Sandbox payment gateway is disabled in production');
      }
    }

    const provider =
      providerName.toUpperCase() === 'CHAPA'
        ? this.chapaProvider
        : this.sandboxProvider;

    const verification = await provider.verifyWebhook(rawBody, headers);

    // Replay safety: check if this event was already ingested
    const existingEvent = await this.eventRepository.findOne({
      where: {
        provider: provider.providerName,
        providerEventId: verification.providerEventId,
      },
    });

    if (existingEvent) {
      existingEvent.replayCount += 1;
      await this.eventRepository.save(existingEvent);
      this.logger.warn(`Duplicate webhook received: ${provider.providerName}/${verification.providerEventId}`);
      return { received: true, duplicate: true };
    }

    const event = this.eventRepository.create({
      provider: provider.providerName,
      providerEventId: verification.providerEventId,
      eventType: verification.eventType,
      signatureVerified: verification.isValid,
      payload: verification.payload,
      status: verification.isValid ? ProviderEventStatus.RECEIVED : ProviderEventStatus.FAILED,
      error: verification.isValid ? null : 'Signature verification failed',
    });

    await this.eventRepository.save(event);

    if (!verification.isValid) {
      this.logger.error(`Webhook rejected: invalid signature for ${provider.providerName}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Check if event signals successful payment capture
    const isSuccess =
      verification.status === 'success' ||
      verification.eventType === 'charge.completed' ||
      verification.eventType === 'payment.succeeded';

    if (isSuccess && (verification.providerPaymentId || verification.txRef)) {
      await this.processCaptureSuccess(verification, event);
    }

    return { received: true, status: event.status };
  }

  /**
   * Processes successful capture atomically in one DB transaction:
   * 1. Marks payment SUCCEEDED
   * 2. Creates EscrowHold (HELD)
   * 3. Creates CommissionSnapshot & TaxLine
   * 4. Posts balanced double-entry transaction:
   *    Debit PROVIDER_CLEARING (1010)
   *    Credit ESCROW_LIABILITY (2010)
   * 5. Updates booking to PAID
   * 6. Writes audit record
   */
  private async processCaptureSuccess(
    verification: any,
    event: ProviderEvent,
  ) {
    const ref = verification.providerPaymentId || verification.txRef;

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const payRepo = manager.getRepository(Payment);
      const bookRepo = manager.getRepository(Booking);
      const escrowRepo = manager.getRepository(EscrowHold);
      const commRepo = manager.getRepository(CommissionSnapshot);
      const taxRepo = manager.getRepository(TaxLine);

      // Locate payment attempt
      let payment = await payRepo.findOne({
        where: [
          { providerPaymentId: ref },
          { idempotencyKey: ref },
          { id: verification.payload?.payment_id },
        ],
      });

      // Fallback: look up booking if tx_ref maps to booking reference
      if (!payment && verification.txRef) {
        const booking = await bookRepo.findOne({
          where: [{ paymentReference: verification.txRef }, { reference: verification.txRef }],
        });
        if (booking) {
          payment = await payRepo.findOne({
            where: { bookingId: booking.id },
            order: { createdAt: 'DESC' },
          });
        }
      }

      if (!payment) {
        this.logger.warn(`No payment record found for verified capture event ref ${ref}`);
        event.status = ProviderEventStatus.IGNORED;
        event.error = `Payment record not found for ref ${ref}`;
        await manager.save(event);
        return;
      }

      if (payment.status === PaymentStatus.SUCCEEDED) {
        this.logger.log(`Payment ${payment.id} is already marked SUCCEEDED`);
        event.status = ProviderEventStatus.PROCESSED;
        event.processedAt = new Date();
        await manager.save(event);
        return;
      }

      const booking = await bookRepo.findOne({
        where: { id: payment.bookingId },
        relations: ['property'],
      });
      if (!booking) {
        throw new NotFoundException(`Booking ${payment.bookingId} not found during capture`);
      }

      // SEC-05: Prevent duplicate captures for an already paid booking
      if (booking.paymentStatus === BookingPaymentStatus.PAID) {
        this.logger.warn(`Booking ${booking.id} is already marked PAID. Ignoring capture event ${ref}`);
        event.status = ProviderEventStatus.IGNORED;
        event.error = `Booking ${booking.id} already paid`;
        await manager.save(event);
        return;
      }

      // SEC-04: Validate webhook amount matches recorded payment amount
      if (verification.amountMinor !== undefined && verification.amountMinor !== BigInt(payment.amountMinor)) {
        this.logger.error(
          `Payment capture amount mismatch: provider=${verification.amountMinor}, recorded=${payment.amountMinor}`,
        );
        event.status = ProviderEventStatus.FAILED;
        event.error = `Amount mismatch: expected ${payment.amountMinor}, got ${verification.amountMinor}`;
        await manager.save(event);
        throw new BadRequestException('Payment capture amount mismatch');
      }

      // SEC-04: Validate webhook currency matches recorded payment currency
      if (
        verification.currency &&
        payment.currency &&
        verification.currency.toUpperCase() !== payment.currency.toUpperCase()
      ) {
        this.logger.error(
          `Payment capture currency mismatch: provider=${verification.currency}, recorded=${payment.currency}`,
        );
        event.status = ProviderEventStatus.FAILED;
        event.error = `Currency mismatch: expected ${payment.currency}, got ${verification.currency}`;
        await manager.save(event);
        throw new BadRequestException('Payment capture currency mismatch');
      }

      // SEC-04: Strict verification mode check
      if (verification.amountMinor === undefined && process.env.PAYMENTS_STRICT_VERIFICATION === 'true') {
        this.logger.error('Payment capture rejected: amount is missing in strict verification mode');
        event.status = ProviderEventStatus.FAILED;
        event.error = 'Missing capture amount in strict mode';
        await manager.save(event);
        throw new BadRequestException('Missing capture amount');
      }

      const capturedAt = new Date();
      payment.status = PaymentStatus.SUCCEEDED;
      payment.capturedAt = capturedAt;
      payment.providerPaymentId = ref;
      await payRepo.save(payment);

      const settings = await this.settingsService.getAllSettings();
      const amountMinor = BigInt(payment.amountMinor);

      // 1. Create active EscrowHold with releaseEligibleAt calculated by trigger policy
      const delayMs = settings.escrowReleaseDelayHours * 3600 * 1000;
      let releaseEligibleAt: Date;

      if (settings.escrowReleaseTrigger === 'CHECK_IN_PLUS_24H' && booking.checkInDate) {
        const checkIn = new Date(`${booking.checkInDate}T15:00:00.000Z`);
        releaseEligibleAt = isNaN(checkIn.getTime())
          ? new Date(Date.now() + delayMs)
          : new Date(checkIn.getTime() + delayMs);
      } else if (settings.escrowReleaseTrigger === 'COMPLETED_PLUS_24H' && booking.status === BookingStatus.COMPLETED) {
        releaseEligibleAt = new Date(Date.now() + delayMs);
      } else if (booking.checkOutDate) {
        // Default: CHECKOUT_PLUS_24H
        const checkOut = new Date(`${booking.checkOutDate}T12:00:00.000Z`);
        releaseEligibleAt = isNaN(checkOut.getTime())
          ? new Date(Date.now() + delayMs)
          : new Date(checkOut.getTime() + delayMs);
      } else {
        releaseEligibleAt = new Date(Date.now() + delayMs);
      }

      const escrowHold = escrowRepo.create({
        bookingId: booking.id,
        paymentId: payment.id,
        amountMinor: payment.amountMinor,
        refundedMinor: '0',
        currency: payment.currency,
        status: EscrowHoldStatus.HELD,
        releaseEligibleAt,
      });
      await escrowRepo.save(escrowHold);

      // 2. Snaphot commission and tax rates
      const commissionRateBps = settings.commissionRateBps;
      const commissionMinor = calculateBasisPoints(
        amountMinor,
        commissionRateBps,
        settings.commissionRounding,
      );
      const hostNetMinor = amountMinor - commissionMinor;

      const commSnapshot = commRepo.create({
        bookingId: booking.id,
        rateBps: commissionRateBps,
        commissionMinor: commissionMinor.toString(),
        hostNetMinor: hostNetMinor.toString(),
        currency: payment.currency,
        ruleVersion: 'v1.0',
      });
      await commRepo.save(commSnapshot);

      if (settings.vatRateBps > 0) {
        const vatMinor = calculateBasisPoints(commissionMinor, settings.vatRateBps, 'HALF_UP');
        const taxLine = taxRepo.create({
          bookingId: booking.id,
          type: TaxType.VAT,
          rateBps: settings.vatRateBps,
          baseMinor: commissionMinor.toString(),
          amountMinor: vatMinor.toString(),
          currency: payment.currency,
          jurisdiction: settings.vatJurisdiction,
        });
        await taxRepo.save(taxLine);
      }

      if (settings.withholdingRateBps > 0) {
        const withholdingMinor = calculateBasisPoints(hostNetMinor, settings.withholdingRateBps, 'HALF_UP');
        const withholdingLine = taxRepo.create({
          bookingId: booking.id,
          type: TaxType.WITHHOLDING,
          rateBps: settings.withholdingRateBps,
          baseMinor: hostNetMinor.toString(),
          amountMinor: withholdingMinor.toString(),
          currency: payment.currency,
          jurisdiction: settings.vatJurisdiction,
        });
        await taxRepo.save(withholdingLine);
      }

      // 3. Post balanced double-entry capture transaction
      await this.ledgerService.recordTransaction(
        {
          type: LedgerTransactionType.PAYMENT_CAPTURE,
          reference: `CAP-${payment.id.slice(0, 8)}`,
          idempotencyKey: `tx_capture_${payment.id}`,
          bookingId: booking.id,
          paymentId: payment.id,
          description: `Guest capture for booking ${booking.reference || booking.id}`,
          entries: [
            {
              accountCode: '1010',
              accountName: 'PROVIDER_CLEARING',
              debitMinor: amountMinor,
              creditMinor: 0n,
              currency: payment.currency,
              memo: `PSP settlement clearing (${payment.provider})`,
            },
            {
              accountCode: '2010',
              accountName: 'ESCROW_LIABILITY',
              debitMinor: 0n,
              creditMinor: amountMinor,
              currency: payment.currency,
              memo: `Funds held in custody for booking ${booking.reference || booking.id}`,
            },
          ],
        },
        manager,
      );

      // 4. Update booking payment summary
      booking.paymentStatus = BookingPaymentStatus.PAID;
      booking.paymentReference = payment.providerPaymentId || ref;
      booking.paymentMethod = (payment.method as any) || booking.paymentMethod;
      booking.paidAt = capturedAt;
      booking.paymentReconciliationStatus = 'MATCHED';

      // BOOK-02: Instant book confirm vs Request to book
      if ((booking.property as any)?.instantBook === true) {
        booking.status = BookingStatus.CONFIRMED;
        this.logger.log(`Instant booking ${booking.id} automatically CONFIRMED upon capture`);
      }

      await bookRepo.save(booking);

      // 5. Update provider event
      event.status = ProviderEventStatus.PROCESSED;
      event.processedAt = capturedAt;
      await manager.save(event);

      // 6. Record audit action
      await this.auditService.record(
        {
          action: 'finance.payment_captured',
          entityType: 'payment',
          entityId: payment.id,
          after: {
            bookingId: booking.id,
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            provider: payment.provider,
            reference: ref,
          },
          metadata: {
            escrowHoldId: escrowHold.id,
            commissionMinor: commissionMinor.toString(),
          },
        },
        manager,
      );

      this.logger.log(
        `Successfully captured payment ${payment.id} for booking ${booking.id}: ${amountMinor} ${payment.currency}`,
      );

      // 7. Notify guest and host of secured payment & escrow
      if (this.notificationsService) {
        const propTitle = booking.property?.title || 'your reservation';
        const refStr = booking.reference || `#${booking.id.slice(0, 8)}`;
        if (booking.guestId) {
          try {
            await this.notificationsService.createNotification({
              userId: booking.guestId,
              type: NotificationType.BOOKING_CONFIRMED,
              title: 'Payment Secured & Escrow Active',
              message: `Your payment for ${refStr} ("${propTitle}") is confirmed and held safely in platform escrow.`,
              link: '/dashboard',
              metadata: { bookingId: booking.id, propertyId: booking.property?.id, paymentId: payment.id },
              idempotencyKey: `payment_${payment.id}_captured_guest`,
            });
          } catch (notifErr: unknown) {
            this.logger.warn(`Failed to dispatch guest payment notification: ${notifErr}`);
          }
        }
        if (booking.property?.hostId) {
          try {
            await this.notificationsService.createNotification({
              userId: booking.property.hostId,
              type: NotificationType.BOOKING_REQUESTED,
              title: 'Payment Received in Escrow',
              message: `Guest payment for ${refStr} ("${propTitle}") was captured and secured in escrow.`,
              link: '/host/reservations',
              metadata: { bookingId: booking.id, propertyId: booking.property?.id, paymentId: payment.id },
              idempotencyKey: `payment_${payment.id}_captured_host`,
            });
          } catch (notifErr: unknown) {
            this.logger.warn(`Failed to dispatch host payment notification: ${notifErr}`);
          }
        }
      }
    });
  }

  /**
   * SEC-02: Authenticated simulation endpoint for sandbox checkout completion.
   * Only enabled in non-production environments or when SANDBOX_WEBHOOKS_ENABLED is true.
   */
  async completeSandboxPayment(
    dto: { bookingId: string; providerPaymentId?: string; txRef?: string },
    user: User,
  ) {
    const allowed = await this.isSandboxAllowed();
    if (!allowed && user.role !== UserRole.ADMIN) {
      this.logger.warn(`Sandbox payment simulation rejected for user ${user.id}: sandbox disabled while live capture is active`);
      throw new ForbiddenException('Sandbox payment simulation is disabled while live payments are active in production');
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
      relations: ['property'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    const isGuest = booking.guestId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    const isHost = booking.property?.hostId === user.id;

    if (!isGuest && !isAdmin && !isHost) {
      this.logger.warn(
        `Sandbox payment forbidden: user ${user.id} is not guest (${booking.guestId}), host (${booking.property?.hostId}), or admin`,
      );
      throw new ForbiddenException('You do not have permission to pay for this booking');
    }

    if (booking.paymentStatus === BookingPaymentStatus.PAID) {
      return { success: true, bookingId: booking.id, status: 'PAID' };
    }

    let payment = await this.paymentRepository.findOne({
      where: [
        { bookingId: booking.id, status: PaymentStatus.INITIATED },
        { bookingId: booking.id, status: PaymentStatus.PENDING },
      ],
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      const session = await this.createPaymentSession(
        {
          bookingId: booking.id,
          paymentMethod: booking.paymentMethod || 'TELEBIRR',
        },
        user,
      );
      payment = await this.paymentRepository.findOne({
        where: { id: session.paymentId },
      });
    }

    if (!payment) {
      throw new BadRequestException('Could not establish payment session for sandbox capture');
    }

    const ref =
      dto.providerPaymentId ||
      dto.txRef ||
      payment.providerPaymentId ||
      payment.idempotencyKey;

    const payloadObj = {
      event: 'charge.completed',
      status: 'success',
      tx_ref: ref,
      provider_payment_id: ref,
      amount_minor: payment.amountMinor,
      currency: payment.currency,
      data: {
        tx_ref: ref,
        status: 'success',
        amount: Number(payment.amountMinor) / 100,
        currency: payment.currency,
      },
    };

    const payloadStr = JSON.stringify(payloadObj);
    const signature = this.sandboxProvider.generateSignature(payloadStr);

    await this.handleWebhook('SANDBOX', payloadStr, {
      'x-sandbox-signature': signature,
    });

    return {
      success: true,
      bookingId: booking.id,
      paymentId: payment.id,
      status: 'PAID',
    };
  }
}
