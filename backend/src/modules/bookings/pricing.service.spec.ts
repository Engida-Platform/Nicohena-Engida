import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PricingService } from './pricing.service';
import { Property } from '../properties/entities/property.entity';
import { Room } from '../properties/entities/room.entity';
import { Coupon, CouponDiscountType } from '../coupons/entities/coupon.entity';
import { CouponRedemption } from '../coupons/entities/coupon-redemption.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PricingService', () => {
  let service: PricingService;
  let mockPropertyRepo: any;
  let mockRoomRepo: any;
  let mockCouponRepo: any;
  let mockRedemptionRepo: any;

  const mockProperty = {
    id: 'prop-123',
    pricePerNight: 2000,
    cleaningFee: 500,
    title: 'Luxury Villa',
  };

  beforeEach(async () => {
    mockPropertyRepo = {
      findOne: jest.fn().mockResolvedValue(mockProperty),
    };
    mockRoomRepo = {
      findOne: jest.fn(),
    };
    mockCouponRepo = {
      findOne: jest.fn(),
    };
    mockRedemptionRepo = {
      count: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: getRepositoryToken(Property), useValue: mockPropertyRepo },
        { provide: getRepositoryToken(Room), useValue: mockRoomRepo },
        { provide: getRepositoryToken(Coupon), useValue: mockCouponRepo },
        { provide: getRepositoryToken(CouponRedemption), useValue: mockRedemptionRepo },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('calculates price quote with nights, cleaning fee, and zero guest service fee', async () => {
    const quote = await service.quote({
      propertyId: 'prop-123',
      checkInDate: '2027-04-10',
      checkOutDate: '2027-04-14', // 4 nights
    });

    expect(quote.nights).toBe(4);
    expect(quote.pricePerNight).toBe(2000);
    expect(quote.basePrice).toBe(8000);
    expect(quote.cleaningFee).toBe(500);
    expect(quote.subtotal).toBe(8500);
    expect(quote.serviceFee).toBe(0);
    expect(quote.discount).toBe(0);
    expect(quote.totalPrice).toBe(8500);
    expect(quote.breakdown.quoteVersion).toBe('v2');
  });

  it('applies percentage coupon discount correctly', async () => {
    mockCouponRepo.findOne.mockResolvedValue({
      id: 'coupon-1',
      code: 'WELCOME10',
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 10, // 10%
      minBookingAmountMinor: 100000, // 1,000 ETB
      maxDiscountAmountMinor: 100000, // 1,000 ETB cap
      redemptionsCount: 0,
      isActive: true,
      perUserLimit: 1,
    });

    const quote = await service.quote({
      propertyId: 'prop-123',
      checkInDate: '2027-04-10',
      checkOutDate: '2027-04-14', // subtotal 8500
      couponCode: 'WELCOME10',
      userId: 'user-1',
    });

    // 10% of 8500 = 850 ETB
    expect(quote.discount).toBe(850);
    expect(quote.totalPrice).toBe(7650);
    expect(quote.coupon?.code).toBe('WELCOME10');
  });

  it('applies fixed amount coupon discount', async () => {
    mockCouponRepo.findOne.mockResolvedValue({
      id: 'coupon-2',
      code: 'FLAT500',
      discountType: CouponDiscountType.FIXED_AMOUNT,
      discountValue: 50000, // 500 ETB in minor units
      minBookingAmountMinor: 200000,
      redemptionsCount: 0,
      isActive: true,
    });

    const quote = await service.quote({
      propertyId: 'prop-123',
      checkInDate: '2027-04-10',
      checkOutDate: '2027-04-12', // 2 nights * 2000 + 500 = 4500
      couponCode: 'FLAT500',
    });

    expect(quote.discount).toBe(500);
    expect(quote.totalPrice).toBe(4000);
  });

  it('rejects quote when check-out date is not after check-in date', async () => {
    await expect(
      service.quote({
        propertyId: 'prop-123',
        checkInDate: '2027-04-10',
        checkOutDate: '2027-04-10',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when property does not exist', async () => {
    mockPropertyRepo.findOne.mockResolvedValue(null);

    await expect(
      service.quote({
        propertyId: 'non-existent',
        checkInDate: '2027-04-10',
        checkOutDate: '2027-04-12',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
