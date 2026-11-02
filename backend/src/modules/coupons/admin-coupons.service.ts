import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponDiscountType, CouponApprovalStatus } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from './dto/admin-coupons.dto';
import { FinanceSettingsService } from '../finance/services/finance-settings.service';
import { AuditRequestContext, AuditService } from '../audit/audit.service';
import { User } from '../../users/entities/user.entity';

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discountType: CouponDiscountType;
  discountAmountMinor: number;
  reason?: string;
  couponId?: string;
}

@Injectable()
export class AdminCouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly redemptionRepository: Repository<CouponRedemption>,
    private readonly financeSettingsService: FinanceSettingsService,
    private readonly auditService: AuditService,
  ) {}

  async listCoupons() {
    return this.couponRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['redemptions'],
    });
  }

  async getCoupon(id: string) {
    const coupon = await this.couponRepository.findOne({
      where: { id },
      relations: ['redemptions', 'redemptions.user'],
    });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }
    return coupon;
  }

  async createCoupon(
    dto: CreateCouponDto,
    createdBy: User,
    context?: AuditRequestContext,
  ) {
    const normalizedCode = dto.code.trim().toUpperCase();
    const existing = await this.couponRepository.findOne({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new ConflictException(`Coupon code "${normalizedCode}" already exists`);
    }

    if (dto.discountType === CouponDiscountType.PERCENTAGE) {
      if (dto.discountValue < 1 || dto.discountValue > 100) {
        throw new BadRequestException('Percentage discount must be between 1 and 100');
      }
    }

    const settings = await this.financeSettingsService.getAllSettings();
    const requiresApproval = this.checkCouponRequiresApproval(dto, settings);

    const coupon = this.couponRepository.create({
      ...dto,
      code: normalizedCode,
      startsAt: dto.startsAt || new Date(),
      createdById: createdBy.id,
      approvalStatus: requiresApproval
        ? CouponApprovalStatus.PENDING_APPROVAL
        : CouponApprovalStatus.APPROVED,
      approvedById: requiresApproval ? null : createdBy.id,
      approvedAt: requiresApproval ? null : new Date(),
    });

    const saved = await this.couponRepository.save(coupon);

    await this.auditService.record({
      actor: createdBy,
      action: 'coupon.created',
      entityType: 'coupon',
      entityId: saved.id,
      after: {
        code: saved.code,
        discountType: saved.discountType,
        discountValue: saved.discountValue,
        approvalStatus: saved.approvalStatus,
        maxRedemptions: saved.maxRedemptions,
      },
      metadata: {
        requiresApproval,
        reason: requiresApproval
          ? 'Coupon exceeds configured discount limits — pending approval'
          : 'Within limits — auto-approved',
      },
      ...context,
    });

    return saved;
  }

  private checkCouponRequiresApproval(
    dto: Record<string, any>,
    settings: any,
  ): boolean {
    if (dto.discountType === CouponDiscountType.PERCENTAGE) {
      if (dto.discountValue && dto.discountValue > settings.couponMaxPercentageDiscount) {
        return true;
      }
    }
    if (dto.discountType === CouponDiscountType.FIXED_AMOUNT) {
      if (dto.discountValue && dto.discountValue > Number(settings.couponMaxFixedDiscountMinor)) {
        return true;
      }
    }
    if (dto.maxRedemptions && dto.maxRedemptions > settings.couponMaxRedemptionsLimit) {
      return true;
    }
    return false;
  }

  async updateCoupon(
    id: string,
    dto: UpdateCouponDto,
    updatedBy: User,
    context?: AuditRequestContext,
  ) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }

    if (
      dto.discountType === CouponDiscountType.PERCENTAGE ||
      (!dto.discountType && coupon.discountType === CouponDiscountType.PERCENTAGE)
    ) {
      const val = dto.discountValue ?? coupon.discountValue;
      if (val < 1 || val > 100) {
        throw new BadRequestException('Percentage discount must be between 1 and 100');
      }
    }

    const before = {
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      approvalStatus: coupon.approvalStatus,
      maxRedemptions: coupon.maxRedemptions,
      isActive: coupon.isActive,
    };

    const settings = await this.financeSettingsService.getAllSettings();
    const mergedDto = { ...coupon, ...dto };
    const requiresApproval = this.checkCouponRequiresApproval(mergedDto, settings);

    if (coupon.approvalStatus === CouponApprovalStatus.APPROVED && requiresApproval) {
      Object.assign(coupon, dto);
      coupon.approvalStatus = CouponApprovalStatus.PENDING_APPROVAL;
      coupon.approvedById = null;
      coupon.approvedAt = null;
    } else {
      Object.assign(coupon, dto);
    }

    const saved = await this.couponRepository.save(coupon);

    await this.auditService.record({
      actor: updatedBy,
      action: 'coupon.updated',
      entityType: 'coupon',
      entityId: id,
      before,
      after: {
        discountType: saved.discountType,
        discountValue: saved.discountValue,
        approvalStatus: saved.approvalStatus,
        maxRedemptions: saved.maxRedemptions,
        isActive: saved.isActive,
      },
      metadata: requiresApproval ? { flaggedForApproval: true } : undefined,
      ...context,
    });

    return saved;
  }

  async toggleCouponActive(
    id: string,
    actor: User,
    context?: AuditRequestContext,
  ) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }

    const before = coupon.isActive;
    coupon.isActive = !coupon.isActive;
    const saved = await this.couponRepository.save(coupon);

    await this.auditService.record({
      actor,
      action: coupon.isActive ? 'coupon.activated' : 'coupon.deactivated',
      entityType: 'coupon',
      entityId: id,
      before: { isActive: before, code: coupon.code },
      after: { isActive: coupon.isActive, code: coupon.code },
      ...context,
    });

    return saved;
  }

  async deleteCoupon(
    id: string,
    actor: User,
    context?: AuditRequestContext,
  ) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }

    const snapshot = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      redemptionsCount: coupon.redemptionsCount,
    };

    await this.couponRepository.remove(coupon);

    await this.auditService.record({
      actor,
      action: 'coupon.deleted',
      entityType: 'coupon',
      entityId: id,
      before: snapshot,
      metadata: { reason: 'Admin deleted coupon' },
      ...context,
    });

    return { success: true, deletedId: id };
  }

  async approveCoupon(
    id: string,
    approvedBy: User,
    context?: AuditRequestContext,
  ) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }

    if (coupon.approvalStatus !== CouponApprovalStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Coupon ${id} is not pending approval`);
    }

    // Self-approval check: the approver should not be the creator
    if (coupon.createdById && coupon.createdById === approvedBy.id) {
      throw new BadRequestException(
        'A different administrator must approve coupons you created',
      );
    }

    coupon.approvalStatus = CouponApprovalStatus.APPROVED;
    coupon.approvedById = approvedBy.id;
    coupon.approvedAt = new Date();
    coupon.rejectionReason = null;

    const saved = await this.couponRepository.save(coupon);

    await this.auditService.record({
      actor: approvedBy,
      action: 'coupon.approved',
      entityType: 'coupon',
      entityId: id,
      before: { approvalStatus: CouponApprovalStatus.PENDING_APPROVAL },
      after: {
        approvalStatus: CouponApprovalStatus.APPROVED,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      ...context,
    });

    return saved;
  }

  async rejectCoupon(
    id: string,
    rejectedBy: User,
    reason: string,
    context?: AuditRequestContext,
  ) {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} not found`);
    }

    if (coupon.approvalStatus !== CouponApprovalStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Coupon ${id} is not pending approval`);
    }

    if (!reason || !reason.trim()) {
      throw new BadRequestException('A rejection reason is required');
    }

    coupon.approvalStatus = CouponApprovalStatus.REJECTED;
    coupon.approvedById = rejectedBy.id;
    coupon.approvedAt = new Date();
    coupon.rejectionReason = reason.trim();
    coupon.isActive = false;

    const saved = await this.couponRepository.save(coupon);

    await this.auditService.record({
      actor: rejectedBy,
      action: 'coupon.rejected',
      entityType: 'coupon',
      entityId: id,
      before: { approvalStatus: CouponApprovalStatus.PENDING_APPROVAL },
      after: {
        approvalStatus: CouponApprovalStatus.REJECTED,
        code: coupon.code,
        rejectionReason: reason.trim(),
      },
      metadata: { reason: reason.trim() },
      ...context,
    });

    return saved;
  }

  // ==================== COUPON VALIDATION ENGINE ====================

  async validateCoupon(
    dto: ValidateCouponDto,
    userId?: string,
  ): Promise<CouponValidationResult> {
    const normalizedCode = dto.code.trim().toUpperCase();
    const coupon = await this.couponRepository.findOne({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      return {
        valid: false,
        code: normalizedCode,
        discountType: CouponDiscountType.PERCENTAGE,
        discountAmountMinor: 0,
        reason: 'Invalid promotional code',
      };
    }

    if (!coupon.isActive) {
      return {
        valid: false,
        code: normalizedCode,
        discountType: coupon.discountType,
        discountAmountMinor: 0,
        reason: 'This promotion is currently inactive',
      };
    }

    // Block usage of unapproved or rejected coupons
    if (coupon.approvalStatus !== CouponApprovalStatus.APPROVED) {
      return {
        valid: false,
        code: normalizedCode,
        discountType: coupon.discountType,
        discountAmountMinor: 0,
        reason:
          coupon.approvalStatus === CouponApprovalStatus.REJECTED
            ? 'This promotional code has been rejected'
            : 'This promotional code is pending approval',
      };
    }

    const now = new Date();
    if (coupon.startsAt && now < new Date(coupon.startsAt)) {
      return {
        valid: false,
        code: normalizedCode,
        discountType: coupon.discountType,
        discountAmountMinor: 0,
        reason: 'This promotion has not started yet',
      };
    }

    if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
      return {
        valid: false,
        code: normalizedCode,
        discountType: coupon.discountType,
        discountAmountMinor: 0,
        reason: 'This promotional code has expired',
      };
    }

    if (
      coupon.maxRedemptions !== null &&
      coupon.redemptionsCount >= coupon.maxRedemptions
    ) {
      return {
        valid: false,
        code: normalizedCode,
        discountType: coupon.discountType,
        discountAmountMinor: 0,
        reason: 'This promotion has reached its maximum redemptions limit',
      };
    }

    if (dto.bookingAmountMinor < Number(coupon.minBookingAmountMinor)) {
      return {
        valid: false,
        code: normalizedCode,
        discountType: coupon.discountType,
        discountAmountMinor: 0,
        reason: `Booking total does not meet the minimum requirement of ${(Number(coupon.minBookingAmountMinor) / 100).toFixed(2)} ${coupon.currency}`,
      };
    }

    if (userId) {
      const userRedemptions = await this.redemptionRepository.count({
        where: { couponId: coupon.id, userId },
      });
      if (userRedemptions >= coupon.perUserLimit) {
        return {
          valid: false,
          code: normalizedCode,
          discountType: coupon.discountType,
          discountAmountMinor: 0,
          reason: 'You have already reached the redemption limit for this promotion',
        };
      }
    }

    // Calculate discount amount
    let discountAmountMinor = 0;
    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      discountAmountMinor = Math.round(
        (dto.bookingAmountMinor * Number(coupon.discountValue)) / 100,
      );
      if (
        coupon.maxDiscountAmountMinor !== null &&
        discountAmountMinor > Number(coupon.maxDiscountAmountMinor)
      ) {
        discountAmountMinor = Number(coupon.maxDiscountAmountMinor);
      }
    } else {
      discountAmountMinor = Math.min(
        Number(coupon.discountValue),
        dto.bookingAmountMinor,
      );
    }

    return {
      valid: true,
      code: normalizedCode,
      couponId: coupon.id,
      discountType: coupon.discountType,
      discountAmountMinor,
    };
  }

  async recordRedemption(
    couponId: string,
    userId: string,
    discountAmountMinor: number,
    bookingId?: string,
  ) {
    const coupon = await this.couponRepository.findOne({ where: { id: couponId } });
    if (!coupon) {
      throw new NotFoundException(`Coupon ${couponId} not found`);
    }

    const redemption = this.redemptionRepository.create({
      couponId,
      userId,
      bookingId: bookingId || null,
      discountAmountMinor,
    });

    coupon.redemptionsCount += 1;
    await Promise.all([
      this.redemptionRepository.save(redemption),
      this.couponRepository.save(coupon),
    ]);

    return redemption;
  }
}
