import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../../users/entities/user.entity';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('Admin - Dashboard & Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('summary/fast')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Fast dashboard summary metrics',
    description: 'Returns sub-100ms cached executive metrics including active listings, pending reviews, open disputes, and daily revenue.',
  })
  @ApiResponse({ status: 200, description: 'High-level dashboard KPIs' })
  getSummaryFast() {
    return this.dashboardService.getSummaryFast();
  }

  @Get('summary')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({
    summary: 'Role-scoped admin dashboard summary',
    description: 'Returns complete dashboard widgets and metrics scoped to the administrator permissions.',
  })
  @ApiResponse({ status: 200, description: 'Detailed admin dashboard metrics' })
  getSummary(@GetUser() actor: User) {
    return this.dashboardService.getSummary(actor);
  }
}
