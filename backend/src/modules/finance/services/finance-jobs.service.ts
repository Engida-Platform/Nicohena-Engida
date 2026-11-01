import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobRun, JobRunStatus } from '../entities/job-run.entity';
import { EscrowService } from './escrow.service';
import { PayoutsService } from './payouts.service';
import { LedgerService } from './ledger.service';
import { ReconciliationService } from './reconciliation.service';
import { FinanceSettingsService } from './finance-settings.service';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { EscrowHold, EscrowHoldStatus } from '../entities/escrow-hold.entity';
import { Payout, PayoutStatus } from '../entities/payout.entity';
import { Refund, RefundStatus } from '../entities/refund.entity';

// Stable 32-bit advisory lock keys for finance jobs
const LOCK_ESCROW_RELEASE = 98127301;
const LOCK_DAILY_PAYOUT = 98127302;
const LOCK_INVARIANT_CHECK = 98127303;
const LOCK_RECONCILIATION = 98127304;

@Injectable()
export class FinanceJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinanceJobsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(JobRun)
    private readonly jobRunRepo: Repository<JobRun>,
    private readonly escrowService: EscrowService,
    private readonly payoutsService: PayoutsService,
    private readonly ledgerService: LedgerService,
    private readonly reconciliationService: ReconciliationService,
    private readonly settingsService: FinanceSettingsService,
  ) {}

  onModuleInit() {
    // Schedule periodic job check every 60 seconds (or on-demand)
    // Runs behind advisory lock so multiple instances don't compete
    this.timer = setInterval(() => {
      this.runPeriodicTasks().catch((err) => {
        this.logger.error(`Periodic finance tasks error: ${err.message}`);
      });
    }, 60000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Helper that executes a job with a Postgres advisory lock and records job_run history.
   */
  async runWithAdvisoryLock<T>(
    lockKey: number,
    jobName: string,
    action: () => Promise<{ counts?: Record<string, any>; result?: T }>,
  ): Promise<{ executed: boolean; status: string; result?: T }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Try to acquire Postgres session-level advisory lock
      const lockRes = await queryRunner.query(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [lockKey],
      );
      const acquired = lockRes[0]?.acquired === true;

      if (!acquired) {
        this.logger.log(`Skipping job "${jobName}": lock ${lockKey} already held by another worker`);
        return { executed: false, status: 'LOCKED' };
      }

      // Record job start
      const run = this.jobRunRepo.create({
        jobName,
        status: JobRunStatus.RUNNING,
        startedAt: new Date(),
      });
      await this.jobRunRepo.save(run);

      try {
        const { counts, result } = await action();
        run.status = JobRunStatus.SUCCEEDED;
        run.finishedAt = new Date();
        run.counts = counts || null;
        await this.jobRunRepo.save(run);
        return { executed: true, status: 'SUCCEEDED', result };
      } catch (err: any) {
        run.status = JobRunStatus.FAILED;
        run.finishedAt = new Date();
        run.error = err.message || String(err);
        await this.jobRunRepo.save(run);
        this.logger.error(`Job "${jobName}" failed: ${err.message}`);
        throw err;
      } finally {
        await queryRunner.query('SELECT pg_advisory_unlock($1)', [lockKey]);
      }
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Escrow release job.
   */
  async runEscrowReleaseJob() {
    return this.runWithAdvisoryLock(LOCK_ESCROW_RELEASE, 'escrow_release', async () => {
      const { processedCount, errors } = await this.escrowService.processEligibleReleases();
      return { counts: { processedCount, errorCount: errors.length } };
    });
  }

  /**
   * Daily payout generation job.
   */
  async runDailyPayoutJob() {
    return this.runWithAdvisoryLock(LOCK_DAILY_PAYOUT, 'daily_payout', async () => {
      const { draftedCount, totalAmountMinor, payoutIds } =
        await this.payoutsService.generateDailyPayoutBatch();
      return {
        counts: {
          draftedCount,
          totalAmountMinor: totalAmountMinor.toString(),
          payoutCount: payoutIds.length,
        },
      };
    });
  }

  /**
   * Nightly ledger invariant verification job.
   */
  async runInvariantCheckJob() {
    return this.runWithAdvisoryLock(LOCK_INVARIANT_CHECK, 'invariant_check', async () => {
      const result = await this.ledgerService.checkInvariants();
      if (!result.isHealthy) {
        this.logger.error(`Ledger invariant check failed: ${result.violations.join(', ')}`);
      }
      return { counts: { healthy: result.isHealthy, violationCount: result.violations.length } };
    });
  }

  /**
   * Daily internal reconciliation and system anomaly detector.
   */
  async runInternalReconciliationJob() {
    return this.runWithAdvisoryLock(LOCK_RECONCILIATION, 'internal_reconciliation', async () => {
      const anomalies: string[] = [];

      // 1. Paid bookings without successful Payment record
      const bookingsRepo = this.dataSource.getRepository(Booking);
      const paidWithoutPayment = await bookingsRepo
        .createQueryBuilder('booking')
        .leftJoin(
          Payment,
          'payment',
          'payment.booking_id = booking.id AND payment.status = :paySuccess',
          { paySuccess: PaymentStatus.SUCCEEDED },
        )
        .where('booking.payment_status = :status', { status: 'PAID' })
        .andWhere('payment.id IS NULL')
        .select(['booking.id', 'booking.reference'])
        .getMany();

      if (paidWithoutPayment.length > 0) {
        anomalies.push(
          `Security Anomaly: ${paidWithoutPayment.length} booking(s) marked PAID without successful payment record: ${paidWithoutPayment.map((b) => b.reference || b.id).join(', ')}`,
        );
      }

      // 2. Duplicate successful captures for the same booking
      const paymentRepo = this.dataSource.getRepository(Payment);
      const duplicatePayments = await paymentRepo
        .createQueryBuilder('payment')
        .select('payment.booking_id', 'bookingId')
        .addSelect('COUNT(payment.id)', 'count')
        .where('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
        .groupBy('payment.booking_id')
        .having('COUNT(payment.id) > 1')
        .getRawMany();

      if (duplicatePayments.length > 0) {
        anomalies.push(
          `Duplicate capture anomaly: ${duplicatePayments.length} booking(s) have multiple succeeded payments`,
        );
      }

      // 3. Stuck escrow holds (eligible > 24 hours ago and still HELD)
      const escrowRepo = this.dataSource.getRepository(EscrowHold);
      const stuckThreshold = new Date(Date.now() - 24 * 3600 * 1000);
      const stuckHolds = await escrowRepo
        .createQueryBuilder('hold')
        .where('hold.status = :status', { status: EscrowHoldStatus.HELD })
        .andWhere('hold.release_eligible_at <= :stuckThreshold', { stuckThreshold })
        .getCount();

      if (stuckHolds > 0) {
        anomalies.push(`Stuck escrow anomaly: ${stuckHolds} hold(s) eligible for release > 24h still held`);
      }

      // 4. Failed payouts requiring attention
      const payoutRepo = this.dataSource.getRepository(Payout);
      const failedPayouts = await payoutRepo.count({
        where: { status: PayoutStatus.FAILED },
      });
      if (failedPayouts > 0) {
        anomalies.push(`Payout failure: ${failedPayouts} payout(s) in FAILED status`);
      }

      // 5. Failed refunds requiring attention
      const refundRepo = this.dataSource.getRepository(Refund);
      const failedRefunds = await refundRepo.count({
        where: { status: RefundStatus.FAILED },
      });
      if (failedRefunds > 0) {
        anomalies.push(`Refund failure: ${failedRefunds} refund(s) in FAILED status`);
      }

      // 6. Reconciliation issue summary
      const reconSummary = await this.reconciliationService.getHealthSummary();

      if (anomalies.length > 0) {
        this.logger.warn(`Finance reconciliation audit detected anomalies: ${anomalies.join(' | ')}`);
      }

      return {
        counts: {
          anomaliesCount: anomalies.length,
          paidWithoutPaymentCount: paidWithoutPayment.length,
          duplicatePaymentsCount: duplicatePayments.length,
          stuckEscrowHoldsCount: stuckHolds,
          failedPayoutsCount: failedPayouts,
          failedRefundsCount: failedRefunds,
          openReconciliationIssuesCount: reconSummary.openCount,
        },
      };
    });
  }

  /**
   * Periodically evaluated tasks (runs escrow release and checks payout trigger).
   */
  private async runPeriodicTasks() {
    const settings = await this.settingsService.getAllSettings();

    // 1. Escrow Release
    if (settings.autoReleaseEnabled) {
      await this.runEscrowReleaseJob().catch((err) => {
        this.logger.error(`Escrow release job error: ${err.message}`);
      });
    }

    // 2. Timezone-aware Daily Payout & Reconciliation Schedules (Africa/Addis_Ababa)
    try {
      const now = new Date();
      const addisParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);

      const getPart = (type: string) => addisParts.find((p) => p.type === type)?.value || '';
      const addisDate = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
      const addisHour = parseInt(getPart('hour'), 10);
      const todayAddisStart = new Date(`${addisDate}T00:00:00+03:00`);

      // Daily Payout Job (FIN-02): Scheduled at 02:00 Addis time
      if (settings.payoutSchedule === 'DAILY_0200_ADDIS' && addisHour >= 2) {
        const recentPayout = await this.jobRunRepo.findOne({
          where: {
            jobName: 'daily_payout',
            status: JobRunStatus.SUCCEEDED,
          },
          order: { startedAt: 'DESC' },
        });

        const alreadyRanPayoutToday = recentPayout && recentPayout.startedAt >= todayAddisStart;
        if (!alreadyRanPayoutToday) {
          this.logger.log(`Triggering daily payout batch for ${addisDate} (Addis time ${addisHour}:00)`);
          await this.runDailyPayoutJob().catch((err) => {
            this.logger.error(`Daily payout scheduler error: ${err.message}`);
          });
        }
      }

      // Nightly Ledger Invariant Check & Internal Reconciliation (FIN-04): Scheduled at 03:00 Addis time
      if (addisHour >= 3) {
        const recentInvariant = await this.jobRunRepo.findOne({
          where: {
            jobName: 'invariant_check',
            status: JobRunStatus.SUCCEEDED,
          },
          order: { startedAt: 'DESC' },
        });

        const alreadyRanInvariantToday = recentInvariant && recentInvariant.startedAt >= todayAddisStart;
        if (!alreadyRanInvariantToday) {
          this.logger.log(`Triggering nightly invariant check and reconciliation audit for ${addisDate}`);
          await this.runInvariantCheckJob().catch((err) => {
            this.logger.error(`Nightly invariant check scheduler error: ${err.message}`);
          });
          await this.runInternalReconciliationJob().catch((err) => {
            this.logger.error(`Internal reconciliation scheduler error: ${err.message}`);
          });
        }
      }
    } catch (schedErr: any) {
      this.logger.error(`Error checking scheduled finance jobs: ${schedErr.message}`);
    }
  }
}
