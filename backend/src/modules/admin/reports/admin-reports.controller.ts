import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
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
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../../users/entities/user.entity';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { AdminReportsService } from './admin-reports.service';
import {
  QueryAdminReportsDto,
  UpdateReportStatusDto,
} from './dto/admin-reports.dto';

@ApiTags('Admin - Cases & Disputes')
@ApiBearerAuth('JWT-auth')
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get()
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'List user violation reports' })
  @ApiResponse({ status: 200, description: 'Paginated user violation reports' })
  list(@Query() query: QueryAdminReportsDto) {
    return this.adminReportsService.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get violation report details' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'Report details' })
  getDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminReportsService.getDetail(id);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.REPORTS_RESOLVE)
  @ApiOperation({ summary: 'Update report resolution status' })
  @ApiParam({ name: 'id', description: 'Report UUID' })
  @ApiResponse({ status: 200, description: 'Report status updated' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportStatusDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminReportsService.updateStatus(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }
}
