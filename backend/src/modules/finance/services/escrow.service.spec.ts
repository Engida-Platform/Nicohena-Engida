import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { EscrowHold, EscrowHoldStatus } from '../entities/escrow-hold.entity';
import { BookingStatus } from '../../bookings/entities/booking.entity';
import { TaxType } from '../entities/tax-line.entity';
import { User, UserRole } from '../../../users/entities/user.entity';

describe('EscrowService (FIN-01 & FIN-03 Escrow Release, VAT & Withholding)', () => {
  let service: EscrowService;
  let mockEscrowRepo: any;
  let mockCommissionRepo: any;
  let mockTaxRepo: any;
  let mockBookingRepo: any;
  let mockCaseRepo: any;
  let mockLedgerService: any;
  let mockSettingsService: any;
  let mockAuditService: any;
  let mockDataSource: any;

  const mockAdmin: User = {
    id: 'admin-uuid-1',
    role: UserRole.ADMIN,
    name: 'Finance Admin',
  } as User;

  const mockBooking = {
    id: 'booking-uuid-1',
    reference: 'ENG-2026-001',
    status: BookingStatus.CONFIRMED,
    checkInDate: '2026-04-10',
    checkOutDate: '2026-04-15',
    property: {
      hostId: 'host-uuid-12345678',
    },
  };

  const mockCommission = {
    id: 'comm-uuid-1',
    bookingId: 'booking-uuid-1',
    rateBps: 1500, // 15%
    commissionMinor: '15000', // 150.00 ETB
    hostNetMinor: '85000', // 850.00 ETB
  };

  beforeEach(() => {
    mockEscrowRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((h) => Promise.resolve(h)),
      createQueryBuilder: jest.fn(),
    };
    mockCommissionRepo = {
      findOne: jest.fn().mockResolvedValue(mockCommission),
    };
    mockTaxRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    mockBookingRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
    };
    mockCaseRepo = {
      count: jest.fn().mockResolvedValue(0),
    };
    mockLedgerService = {
      recordTransaction: jest.fn().mockResolvedValue({ id: 'tx-1' }),
    };
    mockSettingsService = {
      getAllSettings: jest.fn().mockResolvedValue({
        autoReleaseEnabled: true,
        escrowReleaseTrigger: 'CHECKOUT_PLUS_24H',
        escrowReleaseDelayHours: 24,
      }),
    };
    mockAuditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => {
        const mockEm = {
          getRepository: (entity: any) => {
            if (entity.name === 'EscrowHold') return mockEscrowRepo;
            if (entity.name === 'CommissionSnapshot') return mockCommissionRepo;
            if (entity.name === 'TaxLine') return mockTaxRepo;
            if (entity.name === 'Booking') return mockBookingRepo;
            if (entity.name === 'Case') return mockCaseRepo;
            return {};
          },
        };
        return cb(mockEm);
      }),
    };

    service = new EscrowService(
      mockDataSource,
      mockEscrowRepo,
      mockCommissionRepo,
      mockTaxRepo,
      mockBookingRepo,
      mockCaseRepo,
      mockLedgerService,
      mockSettingsService,
      mockAuditService,
    );
  });

  describe('releaseHold', () => {
    it('successfully releases hold and splits ledger entries with VAT 2100 and net commission 4010', async () => {
      const hold: Partial<EscrowHold> = {
        id: 'hold-uuid-1',
        bookingId: 'booking-uuid-1',
        amountMinor: '100000', // 1,000.00 ETB
        refundedMinor: '0',
        currency: 'ETB',
        status: EscrowHoldStatus.HELD,
        booking: mockBooking as any,
      };
      mockEscrowRepo.findOne.mockResolvedValue(hold);

      // VAT of 15% on commission = 2250 minor (22.50 ETB)
      mockTaxRepo.find.mockResolvedValue([
        {
          id: 'tax-1',
          bookingId: 'booking-uuid-1',
          type: TaxType.VAT,
          rateBps: 1500,
          amountMinor: '2250',
        },
      ]);

      const result = await service.releaseHold('hold-uuid-1', mockAdmin);

      expect(result.status).toBe(EscrowHoldStatus.RELEASED);
      expect(mockLedgerService.recordTransaction).toHaveBeenCalledTimes(1);

      const txInput = mockLedgerService.recordTransaction.mock.calls[0][0];
      expect(txInput.entries).toHaveLength(4);

      // Debit ESCROW_LIABILITY 2010
      expect(txInput.entries[0]).toMatchObject({
        accountCode: '2010',
        debitMinor: 100000n,
        creditMinor: 0n,
      });

      // Credit Host Payable
      expect(txInput.entries[1]).toMatchObject({
        accountCode: '2020-HOST-host-uui',
        creditMinor: 85000n,
      });

      // Credit PLATFORM_COMMISSION_REVENUE 4010 (net of VAT = 15000 - 2250 = 12750)
      expect(txInput.entries[2]).toMatchObject({
        accountCode: '4010',
        creditMinor: 12750n,
      });

      // Credit VAT_PAYABLE 2100 (2250)
      expect(txInput.entries[3]).toMatchObject({
        accountCode: '2100',
        creditMinor: 2250n,
      });

      // Invariant: sum of credits == sum of debits
      const totalCredit =
        txInput.entries[1].creditMinor +
        txInput.entries[2].creditMinor +
        txInput.entries[3].creditMinor;
      expect(totalCredit).toBe(100000n);
    });

    it('credits WITHHOLDING_PAYABLE 2110 and reduces host payable when withholding tax exists', async () => {
      const hold: Partial<EscrowHold> = {
        id: 'hold-uuid-2',
        bookingId: 'booking-uuid-1',
        amountMinor: '100000',
        refundedMinor: '0',
        currency: 'ETB',
        status: EscrowHoldStatus.HELD,
        booking: mockBooking as any,
      };
      mockEscrowRepo.findOne.mockResolvedValue(hold);

      // VAT + 2% withholding on host earnings (85000 * 2% = 1700 minor)
      mockTaxRepo.find.mockResolvedValue([
        {
          id: 'tax-1',
          bookingId: 'booking-uuid-1',
          type: TaxType.VAT,
          rateBps: 1500,
          amountMinor: '2250',
        },
        {
          id: 'tax-2',
          bookingId: 'booking-uuid-1',
          type: TaxType.WITHHOLDING,
          rateBps: 200,
          amountMinor: '1700',
        },
      ]);

      await service.releaseHold('hold-uuid-2', mockAdmin);

      const txInput = mockLedgerService.recordTransaction.mock.calls[0][0];
      expect(txInput.entries).toHaveLength(5);

      // Host payable reduced by withholding (85000 - 1700 = 83300)
      expect(txInput.entries[1]).toMatchObject({
        accountCode: '2020-HOST-host-uui',
        creditMinor: 83300n,
      });

      // Withholding payable
      expect(txInput.entries[4]).toMatchObject({
        accountCode: '2110',
        creditMinor: 1700n,
      });

      // Verify debits == credits: 83300 + 12750 + 2250 + 1700 = 100000
      const totalCredit =
        txInput.entries[1].creditMinor +
        txInput.entries[2].creditMinor +
        txInput.entries[3].creditMinor +
        txInput.entries[4].creditMinor;
      expect(totalCredit).toBe(100000n);
    });

    it('handles partial refund scaling host, commission, and taxes proportionally', async () => {
      const hold: Partial<EscrowHold> = {
        id: 'hold-uuid-3',
        bookingId: 'booking-uuid-1',
        amountMinor: '100000',
        refundedMinor: '50000', // 50% already refunded
        currency: 'ETB',
        status: EscrowHoldStatus.HELD,
        booking: mockBooking as any,
      };
      mockEscrowRepo.findOne.mockResolvedValue(hold);

      mockTaxRepo.find.mockResolvedValue([
        {
          id: 'tax-1',
          bookingId: 'booking-uuid-1',
          type: TaxType.VAT,
          rateBps: 1500,
          amountMinor: '2250',
        },
      ]);

      await service.releaseHold('hold-uuid-3', mockAdmin);

      const txInput = mockLedgerService.recordTransaction.mock.calls[0][0];

      // Debit ESCROW_LIABILITY for remaining 50000
      expect(txInput.entries[0].debitMinor).toBe(50000n);

      // Sum of credits must equal 50000n exactly
      const totalCredit =
        txInput.entries[1].creditMinor +
        txInput.entries[2].creditMinor +
        txInput.entries[3].creditMinor;
      expect(totalCredit).toBe(50000n);
    });

    it('throws ForbiddenException if hold is frozen', async () => {
      const hold: Partial<EscrowHold> = {
        id: 'hold-uuid-frozen',
        bookingId: 'booking-uuid-1',
        amountMinor: '100000',
        refundedMinor: '0',
        status: EscrowHoldStatus.FROZEN,
        freezeReason: 'Open trust and safety case',
      };
      mockEscrowRepo.findOne.mockResolvedValue(hold);

      await expect(service.releaseHold('hold-uuid-frozen', mockAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('freezes hold and rejects release if active dispute cases exist', async () => {
      const hold: Partial<EscrowHold> = {
        id: 'hold-uuid-dispute',
        bookingId: 'booking-uuid-1',
        amountMinor: '100000',
        refundedMinor: '0',
        status: EscrowHoldStatus.HELD,
      };
      mockEscrowRepo.findOne.mockResolvedValue(hold);
      mockCaseRepo.count.mockResolvedValue(1);

      await expect(service.releaseHold('hold-uuid-dispute', mockAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('processEligibleReleases', () => {
    it('skips processing if autoReleaseEnabled is false', async () => {
      mockSettingsService.getAllSettings.mockResolvedValue({
        autoReleaseEnabled: false,
      });

      const res = await service.processEligibleReleases();
      expect(res.processedCount).toBe(0);
      expect(mockEscrowRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});

