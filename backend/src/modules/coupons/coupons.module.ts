import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import { AdminCouponsService } from './admin-coupons.service';
import { AdminCouponsController, PublicCouponsController } from './admin-coupons.controller';
import { FinanceModule } from '../finance/finance.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Coupon, CouponRedemption]),
    FinanceModule,
    AuditModule,
  ],
  controllers: [AdminCouponsController, PublicCouponsController],
  providers: [AdminCouponsService],
  exports: [AdminCouponsService],
})
export class CouponsModule {}
