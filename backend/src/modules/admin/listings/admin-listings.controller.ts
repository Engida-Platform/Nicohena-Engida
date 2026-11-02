import {
  Controller,
  Get,
  Headers,
  Ip,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
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
import { AdminListingsService } from './admin-listings.service';
import { QueryAdminListingsDto } from './dto/admin-listings.dto';

@ApiTags('Admin - Listings & Moderation')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminListingsController {
  constructor(private readonly adminListingsService: AdminListingsService) {}

  @Get('listings/export.csv')
  @RequirePermissions(Permission.LISTINGS_VIEW)
  @ApiOperation({
    summary: 'Export property listings CSV',
    description: 'Generates and downloads a CSV export of filtered platform listings with status and audit history.',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async export(
    @Query() query: QueryAdminListingsDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const csv = await this.adminListingsService.exportCsv(query, actor, {
      ipAddress,
      userAgent,
    });
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="engida-listings-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return csv;
  }
}
