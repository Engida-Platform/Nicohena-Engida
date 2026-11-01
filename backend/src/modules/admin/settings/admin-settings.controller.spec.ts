import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { User, UserRole, AdminRole } from '../../../users/entities/user.entity';
import { Permission } from '../rbac/permissions';
import { PERMISSIONS_KEY } from '../rbac/permissions.decorator';
import { ROLES_KEY } from '../../../auth/decorators/roles.decorator';

describe('AdminSettingsController - RBAC Permissions', () => {
  let controller: AdminSettingsController;
  let settingsService: jest.Mocked<Partial<AdminSettingsService>>;
  let reflector: Reflector;
  let rolesGuard: RolesGuard;
  let permissionsGuard: PermissionsGuard;

  const mockSupportAgent: Partial<User> = {
    id: 'support-agent-uuid-1',
    name: 'Amina Support',
    email: 'amina@engida.com',
    role: UserRole.ADMIN,
    adminRole: AdminRole.SUPPORT_AGENT,
  };

  const mockSuperAdmin: Partial<User> = {
    id: 'super-admin-uuid-1',
    name: 'Super Admin',
    email: 'super@engida.com',
    role: UserRole.ADMIN,
    adminRole: AdminRole.SUPER_ADMIN,
  };

  beforeEach(() => {
    settingsService = {
      getAllSettings: jest.fn().mockResolvedValue({
        settings: [],
        grouped: {},
      }),
      updateSettings: jest.fn().mockResolvedValue({
        success: true,
        updatedCount: 1,
      }),
    };

    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    permissionsGuard = new PermissionsGuard(reflector);
    controller = new AdminSettingsController(settingsService as AdminSettingsService);
  });

  function createMockContext(user: any, handler: Function, classRef: any): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => classRef,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows SUPPORT_AGENT with settings.view to execute GET /admin/settings', async () => {
    const context = createMockContext(
      mockSupportAgent,
      controller.getAllSettings,
      AdminSettingsController,
    );

    // 1. RolesGuard checks controller @Roles(ADMIN)
    const canRoles = rolesGuard.canActivate(context);
    expect(canRoles).toBe(true);

    // 2. PermissionsGuard checks @RequirePermissions(Permission.SETTINGS_VIEW)
    const canPermissions = permissionsGuard.canActivate(context);
    expect(canPermissions).toBe(true);

    // 3. Controller execution succeeds (200 OK)
    const result = await controller.getAllSettings();
    expect(result).toBeDefined();
    expect(settingsService.getAllSettings).toHaveBeenCalled();
  });

  it('rejects SUPPORT_AGENT on PATCH /admin/settings with 403 Forbidden because settings.manage is missing', async () => {
    const context = createMockContext(
      mockSupportAgent,
      controller.updateSettings,
      AdminSettingsController,
    );

    // 1. RolesGuard checks controller @Roles(ADMIN)
    const canRoles = rolesGuard.canActivate(context);
    expect(canRoles).toBe(true);

    // 2. PermissionsGuard checks @RequirePermissions(Permission.SETTINGS_MANAGE) -> throws 403 Forbidden
    expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    expect(settingsService.updateSettings).not.toHaveBeenCalled();
  });

  it('allows SUPER_ADMIN to execute both GET and PATCH /admin/settings', async () => {
    const getContext = createMockContext(
      mockSuperAdmin,
      controller.getAllSettings,
      AdminSettingsController,
    );
    expect(rolesGuard.canActivate(getContext)).toBe(true);
    expect(permissionsGuard.canActivate(getContext)).toBe(true);

    const patchContext = createMockContext(
      mockSuperAdmin,
      controller.updateSettings,
      AdminSettingsController,
    );
    expect(rolesGuard.canActivate(patchContext)).toBe(true);
    expect(permissionsGuard.canActivate(patchContext)).toBe(true);

    await controller.updateSettings({ 'bookings.min_lead_hours': 3 }, mockSuperAdmin as User);
    expect(settingsService.updateSettings).toHaveBeenCalled();
  });
});
