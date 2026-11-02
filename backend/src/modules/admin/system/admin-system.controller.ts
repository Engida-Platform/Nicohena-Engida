import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../../users/entities/user.entity';
import { AdminSystemService } from './admin-system.service';

@ApiTags('Admin - System & Audit')
@ApiBearerAuth('JWT-auth')
@Controller('admin/system')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminSystemController {
  constructor(private readonly systemService: AdminSystemService) {}

  @Get('health')
  @RequirePermissions(Permission.SYSTEM_VIEW)
  @ApiOperation({ summary: 'Get system infrastructure health overview' })
  @ApiResponse({ status: 200, description: 'System health metrics (database, memory, uptime)' })
  async getHealthOverview() {
    return this.systemService.getHealthOverview();
  }

  @Post('jobs/:jobName/run')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  @ApiOperation({ summary: 'Manually trigger scheduled background job' })
  @ApiParam({ name: 'jobName', description: 'Name of the job (e.g. daily-payout-batch, release-escrow)' })
  @ApiResponse({ status: 200, description: 'Job executed successfully' })
  async triggerJob(
    @Param('jobName') jobName: string,
    @GetUser() actor: User,
  ) {
    return this.systemService.triggerJob(jobName, actor);
  }
}
