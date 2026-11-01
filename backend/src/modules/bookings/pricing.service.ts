import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../properties/entities/property.entity';
import { Room } from '../properties/entities/room.entity';
import { Coupon, CouponDiscountType } from '../coupons/entities/coupon.entity';
import { CouponRedemption } from '../coupons/entities/coupon-redemption.entity';

export interface QuoteInput {
  propertyId: string;
  roomId?: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount?: number;
  couponCode?: string;
  userId?: string;
}

export interface PriceQuote {
  nights: number;
  pricePerNight: number;
  basePrice: number;
  cleaningFee: number;
  subtotal: number;
  serviceFee: number;
  discount: number;
  totalPrice: number;
  currency: string;
  coupon?: {
    id: string;
    code: string;
    description: string | null;
    discountType: CouponDiscountType;
    discountValue: number;
    discountAmount: number;
  };
  breakdown: {
    nights: number;
    nightlyRate: number;
    basePrice: number;
    cleaningFee: number;
    serviceFee: number;
    discount: number;
    total: number;
    currency: string;
    quoteVersion: string;
  };
}

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly redemptionRepository: Repository<CouponRedemption>,
  ) {}

  async quote(input: QuoteInput): Promise<PriceQuote> {
    const { propertyId, roomId, checkInDate, checkOutDate, couponCode, userId } = input;

    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });
    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid check-in or check-out date format');
    }
    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    const diffMs = checkOut.getTime() - checkIn.getTime();
    const nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    let pricePerNight = Number(property.pricePerNight) || 0;
    if (roomId) {
      const room = await this.roomRepository.findOne({
        where: { id: roomId, propertyId },
      });
      if (!room) {
        throw new NotFoundException(`Room with ID ${roomId} not found on this property`);
      }
      pricePerNight = Number(room.pricePerNight) || pricePerNight;
    }

    const basePrice = Math.round(nights * pricePerNight * 100) / 100;
    const cleaningFee = Number(property.cleaningFee) || 0;
    const subtotal = Math.round((basePrice + cleaningFee) * 100) / 100;
    const serviceFee = 0; // Guest service fee is 0 under unified commission model (D3)

    let discount = 0;
    let appliedCoupon: PriceQuote['coupon'] | undefined;

    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupon = await this.couponRepository.findOne({
        where: { code: cleanCode, isActive: true },
      });

      if (coupon) {
        const now = new Date();
        const isStarted = !coupon.startsAt || new Date(coupon.startsAt) <= now;
        const isNotExpired = !coupon.expiresAt || new Date(coupon.expiresAt) >= now;
        const hasCapacity =
          coupon.maxRedemptions === null ||
          coupon.maxRedemptions === undefined ||
          coupon.redemptionsCount < coupon.maxRedemptions;

        const subtotalMinor = BigInt(Math.round(subtotal * 100));
        const meetsMinimum =
          !coupon.minBookingAmountMinor || subtotalMinor >= BigInt(coupon.minBookingAmountMinor);

        let userLimitOk = true;
        if (userId && coupon.perUserLimit) {
          const userRedemptions = await this.redemptionRepository.count({
            where: { couponId: coupon.id, userId },
          });
          userLimitOk = userRedemptions < coupon.perUserLimit;
        }

        if (isStarted && isNotExpired && hasCapacity && meetsMinimum && userLimitOk) {
          let calculatedDiscountMinor = 0n;

          if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
            calculatedDiscountMinor =
              (subtotalMinor * BigInt(coupon.discountValue)) / 100n;
          } else {
            // FIXED_AMOUNT is in minor units
            calculatedDiscountMinor = BigInt(coupon.discountValue);
          }

          if (coupon.maxDiscountAmountMinor && calculatedDiscountMinor > BigInt(coupon.maxDiscountAmountMinor)) {
            calculatedDiscountMinor = BigInt(coupon.maxDiscountAmountMinor);
          }

          if (calculatedDiscountMinor > subtotalMinor) {
            calculatedDiscountMinor = subtotalMinor;
          }

          discount = Number(calculatedDiscountMinor) / 100;
          appliedCoupon = {
            id: coupon.id,
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            discountValue: Number(coupon.discountValue),
            discountAmount: discount,
          };
        }
      }
    }

    const totalPrice = Math.max(0, Math.round((subtotal + serviceFee - discount) * 100) / 100);
    const currency = 'ETB';

    return {
      nights,
      pricePerNight,
      basePrice,
      cleaningFee,
      subtotal,
      serviceFee,
      discount,
      totalPrice,
      currency,
      coupon: appliedCoupon,
      breakdown: {
        nights,
        nightlyRate: pricePerNight,
        basePrice,
        cleaningFee,
        serviceFee,
        discount,
        total: totalPrice,
        currency,
        quoteVersion: 'v2',
      },
    };
  }
}

