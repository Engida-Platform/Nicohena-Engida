import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminCouponsService } from './admin-coupons.service';
import { Coupon, CouponApprovalStatus, CouponDiscountType } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import { FinanceSettingsService } from '../finance/services/finance-settings.service';
import { AuditService } from '../audit/audit.service';
import { User } from '../../users/entities/user.entity';

const mockUser = { id: 'usr-admin-1' } as User;

const mockFinanceSettings = {
  couponMaxPercentageDiscount: 50,
  couponMaxFixedDiscountMinor: '10000',
  couponMaxRedemptionsLimit: 100,
};

describe('AdminCouponsService', () => {
  let service: AdminCouponsService;
  let couponRepo: any;
  let redemptionRepo: any;

  beforeEach(async () => {
    couponRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, redemptionsCount: 0 })),
      save: jest.fn((entity) => Promise.resolve({ id: 'cpn-1', ...entity })),
      remove: jest.fn((entity) => Promise.resolve(entity)),
    };

    redemptionRepo = {
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn((dto) => ({ id: 'rdm-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCouponsService,
        {
          provide: getRepositoryToken(Coupon),
          useValue: couponRepo,
        },
        {
          provide: getRepositoryToken(CouponRedemption),
          useValue: redemptionRepo,
        },
        {
          provide: FinanceSettingsService,
          useValue: {
            getAllSettings: jest.fn().mockResolvedValue(mockFinanceSettings),
          },
        },
        {
          provide: AuditService,
          useValue: {
            record: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AdminCouponsService>(AdminCouponsService);
  });

  describe('createCoupon', () => {
    it('creates a percentage coupon with uppercase code and auto-approves if within limits', async () => {
      couponRepo.findOne.mockResolvedValue(null);

      const result = await service.createCoupon(
        {
          code: 'welcome10',
          description: '10% welcome discount',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 10,
        },
        mockUser,
      );

      expect(couponRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'WELCOME10',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 10,
          approvalStatus: CouponApprovalStatus.APPROVED,
        }),
      );
      expect(result.code).toBe('WELCOME10');
    });

    it('sets coupon to PENDING_APPROVAL when percentage exceeds limit', async () => {
      couponRepo.findOne.mockResolvedValue(null);

      const result = await service.createCoupon(
        {
          code: 'BIG75',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 75, // exceeds 50% limit
        },
        mockUser,
      );

      expect(couponRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalStatus: CouponApprovalStatus.PENDING_APPROVAL,
        }),
      );
    });

    it('rejects duplicate coupon code with ConflictException', async () => {
      couponRepo.findOne.mockResolvedValue({ id: 'existing', code: 'PROMO10' });

      await expect(
        service.createCoupon(
          {
            code: 'promo10',
            discountType: CouponDiscountType.PERCENTAGE,
            discountValue: 10,
          },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects invalid percentage above 100', async () => {
      couponRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createCoupon(
          {
            code: 'OVER100',
            discountType: CouponDiscountType.PERCENTAGE,
            discountValue: 120,
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateCoupon', () => {
    it('calculates correct percentage discount with cap', async () => {
      const mockCoupon = {
        id: 'cpn-pct',
        code: 'SAVE20',
        isActive: true,
        approvalStatus: CouponApprovalStatus.APPROVED,
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 20,
        currency: 'ETB',
        minBookingAmountMinor: 100000,
        maxDiscountAmountMinor: 30000,
        maxRedemptions: 100,
        redemptionsCount: 5,
        perUserLimit: 1,
        startsAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 86400000),
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);
      redemptionRepo.count.mockResolvedValue(0);

      // 20% of 200,000 minor = 40,000 minor, capped at 30,000
      const result = await service.validateCoupon(
        { code: 'save20', bookingAmountMinor: 200000 },
        'usr-1',
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmountMinor).toBe(30000);
    });

    it('rejects coupon when minimum booking amount is not met', async () => {
      const mockCoupon = {
        id: 'cpn-min',
        code: 'MINREQ',
        isActive: true,
        approvalStatus: CouponApprovalStatus.APPROVED,
        discountType: CouponDiscountType.FIXED_AMOUNT,
        discountValue: 50000,
        currency: 'ETB',
        minBookingAmountMinor: 500000,
        startsAt: new Date(Date.now() - 86400000),
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);

      const result = await service.validateCoupon({
        code: 'MINREQ',
        bookingAmountMinor: 200000,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('minimum requirement');
    });

    it('rejects coupon when pending approval', async () => {
      const mockCoupon = {
        id: 'cpn-pend',
        code: 'PENDING',
        isActive: true,
        approvalStatus: CouponApprovalStatus.PENDING_APPROVAL,
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 75,
        currency: 'ETB',
        minBookingAmountMinor: 0,
        startsAt: new Date(Date.now() - 86400000),
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);

      const result = await service.validateCoupon({
        code: 'PENDING',
        bookingAmountMinor: 200000,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('pending approval');
    });

    it('rejects coupon when expired', async () => {
      const mockCoupon = {
        id: 'cpn-exp',
        code: 'OLDCODE',
        isActive: true,
        approvalStatus: CouponApprovalStatus.APPROVED,
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
        currency: 'ETB',
        minBookingAmountMinor: 0,
        startsAt: new Date(Date.now() - 172800000),
        expiresAt: new Date(Date.now() - 86400000),
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);

      const result = await service.validateCoupon({
        code: 'OLDCODE',
        bookingAmountMinor: 200000,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('rejects coupon when user exceeds redemption limit', async () => {
      const mockCoupon = {
        id: 'cpn-limit',
        code: 'ONCEONLY',
        isActive: true,
        approvalStatus: CouponApprovalStatus.APPROVED,
        discountType: CouponDiscountType.FIXED_AMOUNT,
        discountValue: 10000,
        currency: 'ETB',
        minBookingAmountMinor: 0,
        perUserLimit: 1,
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);
      redemptionRepo.count.mockResolvedValue(1);

      const result = await service.validateCoupon(
        { code: 'ONCEONLY', bookingAmountMinor: 200000 },
        'usr-returning',
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('already reached the redemption limit');
    });
  });

  describe('recordRedemption', () => {
    it('increments redemption count and records redemption row', async () => {
      const mockCoupon = {
        id: 'cpn-1',
        code: 'ENQUTATASH',
        redemptionsCount: 2,
      };
      couponRepo.findOne.mockResolvedValue(mockCoupon);

      const redemption = await service.recordRedemption('cpn-1', 'usr-1', 50000, 'bkg-1');

      expect(mockCoupon.redemptionsCount).toBe(3);
      expect(redemptionRepo.save).toHaveBeenCalled();
      expect(couponRepo.save).toHaveBeenCalledWith(mockCoupon);
      expect(redemption.discountAmountMinor).toBe(50000);
    });
  });
});
