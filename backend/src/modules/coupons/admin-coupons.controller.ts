import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import { PermissionsGuard } from '../admin/rbac/permissions.guard';
import { RequirePermissions } from '../admin/rbac/permissions.decorator';
import { Permission } from '../admin/rbac/permissions';
import { AdminCouponsService } from './admin-coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from './dto/admin-coupons.dto';

@ApiTags('Catalog')
@ApiBearerAuth('JWT-auth')
@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminCouponsController {
  constructor(private readonly couponsService: AdminCouponsService) {}

  @Get()
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'List platform discount coupons' })
  @ApiResponse({ status: 200, description: 'List of coupons' })
  listCoupons() {
    return this.couponsService.listCoupons();
  }

  @Get(':id')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Get coupon details' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  @ApiResponse({ status: 200, description: 'Coupon details' })
  getCoupon(@Param('id') id: string) {
    return this.couponsService.getCoupon(id);
  }

  @Post()
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Create discount coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created' })
  createCoupon(
    @Body() dto: CreateCouponDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.couponsService.createCoupon(dto, actor, { ipAddress, userAgent });
  }

  @Patch(':id')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Update coupon properties' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  @ApiResponse({ status: 200, description: 'Coupon updated' })
  updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.couponsService.updateCoupon(id, dto, actor, { ipAddress, userAgent });
  }

  @Post(':id/toggle-active')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Toggle coupon active state' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  @ApiResponse({ status: 200, description: 'Coupon active state toggled' })
  toggleActive(
    @Param('id') id: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.couponsService.toggleCouponActive(id, actor, { ipAddress, userAgent });
  }

  @Delete(':id')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Delete coupon' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  @ApiResponse({ status: 200, description: 'Coupon deleted' })
  deleteCoupon(
    @Param('id') id: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.couponsService.deleteCoupon(id, actor, { ipAddress, userAgent });
  }

  @Post('validate')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Validate coupon for checkout' })
  @ApiResponse({ status: 200, description: 'Coupon validation result' })
  validateCoupon(
    @Body() dto: ValidateCouponDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.couponsService.validateCoupon(dto, userId);
  }

  @Post(':id/approve')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Approve a pending coupon' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  @ApiResponse({ status: 200, description: 'Coupon approved' })
  approveCoupon(
    @Param('id') id: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.couponsService.approveCoupon(id, actor, { ipAddress, userAgent });
  }

  @Post(':id/reject')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Reject a pending coupon' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  @ApiResponse({ status: 200, description: 'Coupon rejected' })
  rejectCoupon(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.couponsService.rejectCoupon(id, actor, body.reason, { ipAddress, userAgent });
  }
}
