import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { PermissionsGuard } from '../admin/rbac/permissions.guard';
import { RequirePermissions } from '../admin/rbac/permissions.decorator';
import { Permission } from '../admin/rbac/permissions';
import { AdminCouponsService } from './admin-coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from './dto/admin-coupons.dto';

@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminCouponsController {
  constructor(private readonly couponsService: AdminCouponsService) {}

  @Get()
  @RequirePermissions(Permission.COUPONS_MANAGE)
  async listCoupons() {
    return this.couponsService.listCoupons();
  }

  @Get(':id')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  async getCoupon(@Param('id') id: string) {
    return this.couponsService.getCoupon(id);
  }

  @Post()
  @RequirePermissions(Permission.COUPONS_MANAGE)
  async createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  async updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.updateCoupon(id, dto);
  }

  @Post(':id/toggle-active')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  async toggleActive(@Param('id') id: string) {
    return this.couponsService.toggleCouponActive(id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  async deleteCoupon(@Param('id') id: string) {
    return this.couponsService.deleteCoupon(id);
  }

  @Post('validate')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  async validateCoupon(
    @Body() dto: ValidateCouponDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.couponsService.validateCoupon(dto, userId);
  }
}
