import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../../users/entities/user.entity';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { AdminBookingsService } from './admin-bookings.service';
import {
  AdminBookingStatusDto,
  CreateAdminAvailabilityBlockDto,
  DecideCancellationDto,
  QueryAdminBookingsDto,
  QueryAvailabilityDto,
  RecordCancellationDto,
} from './dto/admin-bookings.dto';

@ApiTags('Admin - Bookings')
@ApiBearerAuth('JWT-auth')
@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminBookingsController {
  constructor(private readonly adminBookingsService: AdminBookingsService) {}

  @Get()
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  @ApiOperation({ summary: 'List platform bookings with filters' })
  @ApiResponse({ status: 200, description: 'Paginated platform bookings' })
  list(@Query() query: QueryAdminBookingsDto) {
    return this.adminBookingsService.list(query);
  }

  @Get('export.csv')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  @ApiOperation({ summary: 'Export bookings CSV' })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query() query: QueryAdminBookingsDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const csv = await this.adminBookingsService.exportCsv(query, actor, {
      ipAddress,
      userAgent,
    });
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="engida-bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return csv;
  }

  @Get('availability')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  @ApiOperation({ summary: 'Inspect calendar availability and blocks' })
  @ApiResponse({ status: 200, description: 'Availability matrix' })
  availability(@Query() query: QueryAvailabilityDto) {
    return this.adminBookingsService.availability(query);
  }

  @Delete('availability-blocks/:blockId')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Remove administrative calendar block' })
  @ApiParam({ name: 'blockId', description: 'Block UUID' })
  @ApiResponse({ status: 200, description: 'Block removed' })
  removeBlock(
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.removeBlock(blockId, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  @ApiOperation({ summary: 'Get booking administrative detail' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Detailed booking object with ledger and audit' })
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() actor: User,
  ) {
    return this.adminBookingsService.detail(id, actor);
  }

  @Get(':id/cancellation-preview')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  @ApiOperation({ summary: 'Preview cancellation refunds and penalty fees' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Cancellation preview metrics' })
  cancellationPreview(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminBookingsService.previewCancellation(id);
  }

  @Post(':id/status')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Update booking status' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking status updated' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminBookingStatusDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.updateStatus(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/cancellation-requests')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Record administrative cancellation request' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Cancellation request recorded' })
  recordCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordCancellationDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.recordCancellation(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/cancellation-requests/:requestId/approve')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Approve cancellation request' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiParam({ name: 'requestId', description: 'Cancellation Request UUID' })
  @ApiResponse({ status: 200, description: 'Cancellation approved' })
  approveCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: DecideCancellationDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.decideCancellation(
      id,
      requestId,
      'approve',
      dto,
      actor,
      { ipAddress, userAgent },
    );
  }

  @Post(':id/cancellation-requests/:requestId/reject')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Reject cancellation request' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiParam({ name: 'requestId', description: 'Cancellation Request UUID' })
  @ApiResponse({ status: 200, description: 'Cancellation rejected' })
  rejectCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: DecideCancellationDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.decideCancellation(
      id,
      requestId,
      'reject',
      dto,
      actor,
      { ipAddress, userAgent },
    );
  }

  @Post(':id/availability-blocks')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  @ApiOperation({ summary: 'Create administrative availability block' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 201, description: 'Availability block created' })
  createBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAdminAvailabilityBlockDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.createBlock(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }
}
