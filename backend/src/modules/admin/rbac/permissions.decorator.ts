import { SetMetadata } from '@nestjs/common';
import { Permission } from './permissions';

export const PERMISSIONS_KEY = 'admin_permissions';
export const ANY_PERMISSIONS_KEY = 'admin_any_permissions';

/**
 * Requires every listed permission. Use more than one permission only when an
 * action genuinely needs all of them.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Requires at least one of the listed permissions.
 */
export const RequireAnyPermissions = (...permissions: Permission[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);
