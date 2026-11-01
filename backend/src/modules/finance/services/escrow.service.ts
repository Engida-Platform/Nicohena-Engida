import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EscrowHold, EscrowHoldStatus } from '../entities/escrow-hold.entity';
import { CommissionSnapshot } from '../entities/commission-snapshot.entity';
import { TaxLine, TaxType } from '../entities/tax-line.entity';
import { Booking, BookingStatus } from '../../bookings/entities/booking.entity';
import { Case, CaseStatus } from '../../admin/cases/entities/case.entity';
import { LedgerService, LedgerEntryInput } from './ledger.service';
import { LedgerAccountType } from '../entities/ledger-account.entity';
import { FinanceSettingsService } from './finance-settings.service';
import { AuditService } from '../../audit/audit.service';
import { User } from '../../../users/entities/user.entity';
import { LedgerTransactionType } from '../entities/ledger-transaction.entity';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EscrowHold)
    private readonly escrowRepo: Repository<EscrowHold>,
    @InjectRepository(CommissionSnapshot)
    private readonly commissionRepo: Repository<CommissionSnapshot>,
    @InjectRepository(TaxLine)
    private readonly taxRepo: Repository<TaxLine>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Case)
    private readonly caseRepo: Repository<Case>,
    private readonly ledgerService: LedgerService,
    private readonly settingsService: FinanceSettingsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves active hold for a booking.
   */
  async getHoldForBooking(bookingId: string) {
    return this.escrowRepo.findOne({
      where: { bookingId },
      relations: ['booking', 'payment'],
    });
  }

  /**
   * Freezes escrow hold due to an open dispute or safety case.
   * Supports lookup by hold ID or booking ID.
   */
  async freezeHold(
    identifier: string,
    reason: string,
    actor?: User | null,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const hold = await this.escrowRepo.findOne({
      where: [
        { id: identifier, status: EscrowHoldStatus.HELD },
        { bookingId: identifier, status: EscrowHoldStatus.HELD },
      ],
      relations: ['booking'],
    });

    if (!hold) {
      const anyHold = await this.escrowRepo.findOne({
        where: [{ id: identifier }, { bookingId: identifier }],
      });
      if (anyHold) {
        if (anyHold.status === EscrowHoldStatus.FROZEN) {
          throw new BadRequestException('Escrow hold is already frozen');
        }
        throw new BadRequestException(`Cannot freeze escrow hold in status ${anyHold.status}`);
      }
      throw new NotFoundException(`Escrow hold ${identifier} not found`);
    }

    const beforeStatus = hold.status;
    hold.status = EscrowHoldStatus.FROZEN;
    hold.frozenAt = new Date();
    hold.freezeReason = reason;
    await this.escrowRepo.save(hold);

    await this.auditService.record({
      actor,
      action: 'finance.escrow_frozen',
      entityType: 'escrow_hold',
      entityId: hold.id,
      before: { status: beforeStatus },
      after: { status: hold.status, freezeReason: reason },
      metadata: { bookingId: hold.bookingId },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    this.logger.log(`Escrow hold ${hold.id} for booking ${hold.bookingId} FROZEN: ${reason}`);
    return hold;
  }

  async freezeHoldById(
    holdId: string,
    reason: string,
    actor?: User | null,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    return this.freezeHold(holdId, reason, actor, context);
  }

  /**
   * Unfreezes escrow hold after case resolution or finance review.
   */
  async unfreezeHold(
    holdId: string,
    reason: string,
    actor: User,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const hold = await this.escrowRepo.findOne({
      where: { id: holdId },
      relations: ['booking'],
    });

    if (!hold) {
      throw new NotFoundException(`Escrow hold ${holdId} not found`);
    }

    if (hold.status !== EscrowHoldStatus.FROZEN) {
      throw new BadRequestException('Hold is not currently frozen');
    }

    // Verify there are no open dispute or safety cases still pending
    const openCases = await this.caseRepo.count({
      where: [
        { bookingId: hold.bookingId, status: CaseStatus.OPEN },
        { bookingId: hold.bookingId, status: CaseStatus.IN_PROGRESS },
        { bookingId: hold.bookingId, status: CaseStatus.WAITING_ON_REQUESTER },
        { bookingId: hold.bookingId, status: CaseStatus.WAITING_ON_INTERNAL },
      ],
    });

    if (openCases > 0) {
      throw new BadRequestException(
        `Cannot unfreeze: ${openCases} active support case(s) are still unresolved for this booking`,
      );
    }

    hold.status = EscrowHoldStatus.HELD;
    hold.frozenAt = null;
    hold.freezeReason = null;
    await this.escrowRepo.save(hold);

    await this.auditService.record({
      actor,
      action: 'finance.escrow_unfrozen',
      entityType: 'escrow_hold',
      entityId: hold.id,
      after: { status: hold.status },
      metadata: { reason },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return hold;
  }

  /**
   * Releases an eligible escrow hold to host payable and platform commission.
   */
  async releaseHold(
    holdId: string,
    actor?: User | null,
    reason = 'Automated stay completion release',
    manager?: EntityManager,
  ) {
    const execute = async (em: EntityManager) => {
      const holdRepo = em.getRepository(EscrowHold);
      const bookRepo = em.getRepository(Booking);
      const commRepo = em.getRepository(CommissionSnapshot);

      const hold = await holdRepo.findOne({
        where: { id: holdId },
        relations: ['booking', 'booking.property'],
      });

      if (!hold) {
        throw new NotFoundException(`Escrow hold ${holdId} not found`);
      }

      if (hold.status === EscrowHoldStatus.RELEASED) {
        this.logger.log(`Escrow hold ${holdId} is already released`);
        return hold;
      }

      if (hold.status === EscrowHoldStatus.FROZEN) {
        throw new ForbiddenException(`Escrow hold ${holdId} is frozen and cannot be released: ${hold.freezeReason}`);
      }

      // Check for dispute cases
      const activeCases = await em.getRepository(Case).count({
        where: [
          { bookingId: hold.bookingId, status: CaseStatus.OPEN },
          { bookingId: hold.bookingId, status: CaseStatus.IN_PROGRESS },
          { bookingId: hold.bookingId, status: CaseStatus.WAITING_ON_REQUESTER },
          { bookingId: hold.bookingId, status: CaseStatus.WAITING_ON_INTERNAL },
        ],
      });

      if (activeCases > 0) {
        await this.freezeHold(hold.bookingId, `Dispute case pending (${activeCases} active case(s))`, actor);
        throw new ForbiddenException(`Cannot release: ${activeCases} dispute case(s) open for booking ${hold.bookingId}`);
      }

      const totalMinor = BigInt(hold.amountMinor);
      const refundedMinor = BigInt(hold.refundedMinor);
      const unrefundedMinor = totalMinor - refundedMinor;

      if (unrefundedMinor <= 0n) {
        hold.status = EscrowHoldStatus.REFUNDED;
        await holdRepo.save(hold);
        return hold;
      }

      // Read snapshot
      const comm = await commRepo.findOne({ where: { bookingId: hold.bookingId } });
      const hostId = hold.booking?.property?.hostId || (hold.booking as any)?.hostId;

      if (!comm || !hostId) {
        throw new BadRequestException(`Missing commission snapshot or host identity for booking ${hold.bookingId}`);
      }

      const commissionMinor = BigInt(comm.commissionMinor);
      const hostNetMinor = BigInt(comm.hostNetMinor);

      let effectiveCommission = commissionMinor;
      let effectiveHostNet = hostNetMinor;

      if (unrefundedMinor < totalMinor && totalMinor > 0n) {
        effectiveCommission = (commissionMinor * unrefundedMinor) / totalMinor;
        effectiveHostNet = unrefundedMinor - effectiveCommission;
      }

      // Read tax lines for VAT and Withholding
      const taxLines = await em.getRepository(TaxLine).find({ where: { bookingId: hold.bookingId } });
      const vatLine = taxLines.find((t) => t.type === TaxType.VAT);
      const withholdingLine = taxLines.find((t) => t.type === TaxType.WITHHOLDING);

      let vatMinor = 0n;
      if (vatLine) {
        vatMinor = BigInt(vatLine.amountMinor);
        if (unrefundedMinor < totalMinor && totalMinor > 0n) {
          vatMinor = (vatMinor * unrefundedMinor) / totalMinor;
        }
      }

      let withholdingMinor = 0n;
      if (withholdingLine) {
        withholdingMinor = BigInt(withholdingLine.amountMinor);
        if (unrefundedMinor < totalMinor && totalMinor > 0n) {
          withholdingMinor = (withholdingMinor * unrefundedMinor) / totalMinor;
        }
      }

      // Net commission to platform revenue (excluding VAT)
      const netCommissionMinor = effectiveCommission >= vatMinor ? effectiveCommission - vatMinor : effectiveCommission;
      // Host payable net of withholding
      const finalHostPayableMinor = effectiveHostNet >= withholdingMinor ? effectiveHostNet - withholdingMinor : effectiveHostNet;

      const entries: LedgerEntryInput[] = [
        {
          accountCode: '2010',
          accountName: 'ESCROW_LIABILITY',
          accountType: LedgerAccountType.LIABILITY,
          debitMinor: unrefundedMinor,
          creditMinor: 0n,
          currency: hold.currency,
          memo: `Release from escrow hold`,
        },
        {
          accountCode: `2020-HOST-${hostId.slice(0, 8)}`,
          accountName: `Host Payable (${hostId.slice(0, 8)})`,
          accountType: LedgerAccountType.LIABILITY,
          ownerId: hostId,
          ownerType: 'HOST',
          debitMinor: 0n,
          creditMinor: finalHostPayableMinor,
          currency: hold.currency,
          memo: `Stay payout allocation to host`,
        },
        {
          accountCode: '4010',
          accountName: 'PLATFORM_COMMISSION_REVENUE',
          accountType: LedgerAccountType.REVENUE,
          debitMinor: 0n,
          creditMinor: netCommissionMinor,
          currency: hold.currency,
          memo: `Platform commission on stay (net of VAT)`,
        },
      ];

      if (vatMinor > 0n) {
        entries.push({
          accountCode: '2100',
          accountName: 'VAT_PAYABLE',
          accountType: LedgerAccountType.LIABILITY,
          debitMinor: 0n,
          creditMinor: vatMinor,
          currency: hold.currency,
          memo: `VAT payable on platform commission`,
        });
      }

      if (withholdingMinor > 0n) {
        entries.push({
          accountCode: '2110',
          accountName: 'WITHHOLDING_PAYABLE',
          accountType: LedgerAccountType.LIABILITY,
          debitMinor: 0n,
          creditMinor: withholdingMinor,
          currency: hold.currency,
          memo: `Withholding tax payable from host earnings`,
        });
      }

      // Reconcile any rounding difference to ensure debit == sum(credits)
      const totalCredit = finalHostPayableMinor + netCommissionMinor + vatMinor + withholdingMinor;
      if (totalCredit !== unrefundedMinor) {
        const diff = unrefundedMinor - totalCredit;
        entries[1].creditMinor += diff;
      }

      // Post ESCROW_RELEASE transaction
      await this.ledgerService.recordTransaction(
        {
          type: LedgerTransactionType.ESCROW_RELEASE,
          reference: `REL-${hold.id.slice(0, 8)}`,
          idempotencyKey: `tx_release_hold_${hold.id}`,
          bookingId: hold.bookingId,
          description: `Escrow release for stay ${hold.booking?.reference || hold.bookingId}`,
          createdById: actor?.id ?? null,
          entries,
        },
        em,
      );

      // Auto-complete booking if stay checkout date has elapsed and booking is still CONFIRMED
      if (hold.booking && hold.booking.status === BookingStatus.CONFIRMED && hold.booking.checkOutDate) {
        const checkOut = new Date(`${hold.booking.checkOutDate}T12:00:00.000Z`);
        if (new Date() >= checkOut) {
          hold.booking.status = BookingStatus.COMPLETED;
          await bookRepo.save(hold.booking);
        }
      }

      hold.status = EscrowHoldStatus.RELEASED;
      hold.releasedAt = new Date();
      await holdRepo.save(hold);

      await this.auditService.record(
        {
          actor,
          action: 'finance.escrow_released',
          entityType: 'escrow_hold',
          entityId: hold.id,
          after: {
            status: hold.status,
            releasedAmountMinor: unrefundedMinor.toString(),
            hostNetMinor: entries[1].creditMinor.toString(),
            commissionMinor: netCommissionMinor.toString(),
            vatMinor: vatMinor.toString(),
            withholdingMinor: withholdingMinor.toString(),
          },
          metadata: { reason, bookingId: hold.bookingId, hostId },
        },
        em,
      );

      this.logger.log(`Released escrow hold ${hold.id} for booking ${hold.bookingId}: net host ${entries[1].creditMinor}, VAT ${vatMinor}, withholding ${withholdingMinor}`);
      return hold;
    };

    if (manager) {
      return execute(manager);
    }
    return this.dataSource.transaction(execute);
  }

  /**
   * Scans and releases all eligible holds whose delay window has elapsed and booking is eligible.
   */
  async processEligibleReleases(): Promise<{ processedCount: number; errors: string[] }> {
    const settings = await this.settingsService.getAllSettings();
    if (!settings.autoReleaseEnabled) {
      this.logger.log('Automated escrow release is disabled in finance settings');
      return { processedCount: 0, errors: [] };
    }

    const now = new Date();
    const eligibleQuery = this.escrowRepo
      .createQueryBuilder('hold')
      .innerJoinAndSelect('hold.booking', 'booking')
      .where('hold.status = :status', { status: EscrowHoldStatus.HELD })
      .andWhere('hold.release_eligible_at <= :now', { now });

    if (settings.escrowReleaseTrigger === 'COMPLETED_PLUS_24H') {
      eligibleQuery.andWhere('booking.status = :bookingStatus', { bookingStatus: BookingStatus.COMPLETED });
    } else {
      eligibleQuery.andWhere('booking.status IN (:...validStatuses)', {
        validStatuses: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
      });
    }

    const eligibleHolds = await eligibleQuery.getMany();

    // Check for stuck escrow holds (> 24 hours past eligibility)
    const stuckThreshold = new Date(now.getTime() - 24 * 3600 * 1000);
    const stuckCount = await this.escrowRepo
      .createQueryBuilder('hold')
      .where('hold.status = :status', { status: EscrowHoldStatus.HELD })
      .andWhere('hold.release_eligible_at <= :stuckThreshold', { stuckThreshold })
      .getCount();

    if (stuckCount > 0) {
      this.logger.warn(`Stuck escrow alert: ${stuckCount} hold(s) have been eligible for release for over 24 hours`);
    }

    let processedCount = 0;
    const errors: string[] = [];

    for (const hold of eligibleHolds) {
      try {
        await this.releaseHold(hold.id, null, 'Automated scheduled release');
        processedCount += 1;
      } catch (err: any) {
        errors.push(`Hold ${hold.id} failed: ${err.message}`);
        this.logger.error(`Failed to auto-release hold ${hold.id}: ${err.message}`);
      }
    }

    return { processedCount, errors };
  }
}
