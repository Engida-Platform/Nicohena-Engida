import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../../users/entities/user.entity';
import { AdminSettingsService } from './admin-settings.service';
import { SettingCategory } from './entities/system-setting.entity';

@ApiTags('Admin - Settings')
@ApiBearerAuth('JWT-auth')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get()
  @RequirePermissions(Permission.SETTINGS_VIEW)
  @ApiOperation({ summary: 'List platform system settings' })
  @ApiQuery({ name: 'category', required: false, enum: SettingCategory })
  @ApiResponse({ status: 200, description: 'List of settings' })
  async getAllSettings(@Query('category') category?: SettingCategory) {
    return this.settingsService.getAllSettings(category);
  }

  @Patch()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update system settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(
    @Body() updates: Record<string, any>,
    @GetUser() actor: User,
  ) {
    return this.settingsService.updateSettings(updates, actor);
  }
}

@ApiTags('Admin - Settings')
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get('public')
  @ApiOperation({
    summary: 'Get public platform settings',
    description: 'Returns safe public runtime settings (default currency, platform contact info, featured flags).',
  })
  @ApiResponse({ status: 200, description: 'Public settings dictionary' })
  async getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }
}
