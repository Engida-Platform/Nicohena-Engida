import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingStatusHistory } from './entities/booking-status-history.entity';
import { CancellationRequest } from './entities/cancellation-request.entity';
import { Property } from '../properties/entities/property.entity';
import { Room } from '../properties/entities/room.entity';
import { AvailabilityBlock } from '../properties/entities/availability-block.entity';
import { HostProfile } from '../../users/entities/host-profile.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { CouponRedemption } from '../coupons/entities/coupon-redemption.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsService } from './bookings.service';
import { PricingService } from './pricing.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingStatusHistory,
      CancellationRequest,
      Property,
      Room,
      AvailabilityBlock,
      HostProfile,
      Coupon,
      CouponRedemption,
    ]),
    NotificationsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, PricingService],
  exports: [BookingsService, PricingService],
})
export class BookingsModule {}
