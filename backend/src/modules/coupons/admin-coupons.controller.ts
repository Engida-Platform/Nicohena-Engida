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
  async listCoupons() {
    return this.couponsService.listCoupons();
  }

  @Get(':id')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Get coupon details' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  @ApiResponse({ status: 200, description: 'Coupon details' })
  async getCoupon(@Param('id') id: string) {
    return this.couponsService.getCoupon(id);
  }

  @Post()
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Create discount coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created' })
  async createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Update coupon properties' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  @ApiResponse({ status: 200, description: 'Coupon updated' })
  async updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.updateCoupon(id, dto);
  }

  @Post(':id/toggle-active')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Toggle coupon active state' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  @ApiResponse({ status: 200, description: 'Coupon active state toggled' })
  async toggleActive(@Param('id') id: string) {
    return this.couponsService.toggleCouponActive(id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Delete coupon' })
  @ApiParam({ name: 'id', description: 'Coupon UUID' })
  @ApiResponse({ status: 200, description: 'Coupon deleted' })
  async deleteCoupon(@Param('id') id: string) {
    return this.couponsService.deleteCoupon(id);
  }

  @Post('validate')
  @RequirePermissions(Permission.COUPONS_MANAGE)
  @ApiOperation({ summary: 'Validate coupon for checkout' })
  @ApiResponse({ status: 200, description: 'Coupon validation result' })
  async validateCoupon(
    @Body() dto: ValidateCouponDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.couponsService.validateCoupon(dto, userId);
  }
}
