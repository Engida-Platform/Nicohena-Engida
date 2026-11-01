import { FinanceJobsService } from './finance-jobs.service';
import { JobRunStatus } from '../entities/job-run.entity';

describe('FinanceJobsService (FIN-02 & FIN-04 Scheduled Payouts & Invariant/Reconciliation)', () => {
  let service: FinanceJobsService;
  let mockDataSource: any;
  let mockQueryRunner: any;
  let mockJobRunRepo: any;
  let mockEscrowService: any;
  let mockPayoutsService: any;
  let mockLedgerService: any;
  let mockReconciliationService: any;
  let mockSettingsService: any;

  beforeEach(() => {
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockImplementation((queryStr: string) => {
        if (queryStr.includes('pg_try_advisory_lock')) {
          return Promise.resolve([{ acquired: true }]);
        }
        if (queryStr.includes('pg_advisory_unlock')) {
          return Promise.resolve([{ unlocked: true }]);
        }
        return Promise.resolve([]);
      }),
      release: jest.fn().mockResolvedValue(undefined),
    };

    mockJobRunRepo = {
      create: jest.fn().mockImplementation((r) => ({ id: 'run-1', ...r })),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      getRepository: jest.fn().mockImplementation(() => ({
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          having: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
          getRawMany: jest.fn().mockResolvedValue([]),
          getCount: jest.fn().mockResolvedValue(0),
        }),
        count: jest.fn().mockResolvedValue(0),
      })),
    };

    mockEscrowService = {
      processEligibleReleases: jest.fn().mockResolvedValue({ processedCount: 2, errors: [] }),
    };

    mockPayoutsService = {
      generateDailyPayoutBatch: jest.fn().mockResolvedValue({
        draftedCount: 1,
        totalAmountMinor: 50000n,
        payoutIds: ['payout-1'],
      }),
    };

    mockLedgerService = {
      checkInvariants: jest.fn().mockResolvedValue({ isHealthy: true, violations: [] }),
    };

    mockReconciliationService = {
      getHealthSummary: jest.fn().mockResolvedValue({ isClean: true, openCount: 0, investigatingCount: 0 }),
    };

    mockSettingsService = {
      getAllSettings: jest.fn().mockResolvedValue({
        autoReleaseEnabled: true,
        payoutSchedule: 'DAILY_0200_ADDIS',
      }),
    };

    service = new FinanceJobsService(
      mockDataSource,
      mockJobRunRepo,
      mockEscrowService,
      mockPayoutsService,
      mockLedgerService,
      mockReconciliationService,
      mockSettingsService,
    );
  });

  describe('runWithAdvisoryLock', () => {
    it('executes job and records success in job_run when lock is acquired', async () => {
      const result = await service.runWithAdvisoryLock(12345, 'test_job', async () => ({
        counts: { items: 5 },
        result: 'ok',
      }));

      expect(result.executed).toBe(true);
      expect(result.status).toBe('SUCCEEDED');
      expect(result.result).toBe('ok');
      expect(mockJobRunRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ jobName: 'test_job', status: JobRunStatus.RUNNING }),
      );
      expect(mockJobRunRepo.save).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [12345],
      );
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_unlock($1)',
        [12345],
      );
    });

    it('skips execution when lock cannot be acquired', async () => {
      mockQueryRunner.query.mockImplementation((queryStr: string) => {
        if (queryStr.includes('pg_try_advisory_lock')) {
          return Promise.resolve([{ acquired: false }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.runWithAdvisoryLock(12345, 'test_job', async () => ({
        counts: { items: 10 },
      }));

      expect(result.executed).toBe(false);
      expect(result.status).toBe('LOCKED');
      expect(mockJobRunRepo.create).not.toHaveBeenCalled();
    });

    it('records FAILED status when action throws', async () => {
      await expect(
        service.runWithAdvisoryLock(12345, 'failing_job', async () => {
          throw new Error('Database connection dropped');
        }),
      ).rejects.toThrow('Database connection dropped');

      expect(mockJobRunRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: JobRunStatus.FAILED,
          error: 'Database connection dropped',
        }),
      );
    });
  });

  describe('job runners', () => {
    it('runDailyPayoutJob invokes payoutsService.generateDailyPayoutBatch', async () => {
      const res = await service.runDailyPayoutJob();
      expect(res.executed).toBe(true);
      expect(mockPayoutsService.generateDailyPayoutBatch).toHaveBeenCalledTimes(1);
    });

    it('runInvariantCheckJob checks ledger invariants', async () => {
      const res = await service.runInvariantCheckJob();
      expect(res.executed).toBe(true);
      expect(mockLedgerService.checkInvariants).toHaveBeenCalledTimes(1);
    });

    it('runInternalReconciliationJob executes internal anomaly scans', async () => {
      const res = await service.runInternalReconciliationJob();
      expect(res.executed).toBe(true);
      expect(mockReconciliationService.getHealthSummary).toHaveBeenCalledTimes(1);
    });
  });
});

