import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '../../../users/entities/user.entity';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import {
  AdminAnalyticsService,
  type AnalyticsPeriod,
} from './admin-analytics.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('overview')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async getOverview(@Query('period') period?: string) {
    return this.analyticsService.getOverview((period as AnalyticsPeriod) || '30d');
  }

  @Get('export')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  async exportCsv(
    @Query('period') period: string = '30d',
    @Res() res: Response,
  ) {
    const csvContent = await this.analyticsService.exportReportCsv(
      (period as AnalyticsPeriod) || '30d',
    );
    const filename = `engida-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  }
}
