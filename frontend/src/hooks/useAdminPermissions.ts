'use client';

import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getEffectivePermissions,
  type AdminRole,
  type Permission,
} from '../types/admin';

export interface AdminPermissions {
  /** Effective permission set of the signed-in admin (empty for non-admins). */
  permissions: Permission[];
  adminRole: AdminRole | null;
  isAdmin: boolean;
  /** True for Super Admins and legacy admin accounts without a granular role. */
  isSuperAdmin: boolean;
  /** Whether the admin holds this permission. */
  can: (permission: Permission) => boolean;
  /** Whether the admin holds at least one of the permissions. */
  canAny: (...permissions: Permission[]) => boolean;
  /** Whether the admin holds every one of the permissions. */
  canAll: (...permissions: Permission[]) => boolean;
}

/**
 * Permission helpers for admin pages. Use it to gate the page itself
 * (`can(X_VIEW)`) and every state-changing control (`can(X_MANAGE)`).
 * UI gating is a convenience only; the API enforces the same permissions.
 */
export function useAdminPermissions(): AdminPermissions {
  const { user } = useAuth();

  return useMemo(() => {
    const permissions = getEffectivePermissions(user);
    const granted = new Set<string>(permissions);
    const isAdmin = user?.role === 'ADMIN';
    const adminRole = user?.adminRole ?? null;

    return {
      permissions,
      adminRole,
      isAdmin,
      isSuperAdmin: isAdmin && (!adminRole || adminRole === 'SUPER_ADMIN'),
      can: (permission) => granted.has(permission),
      canAny: (...list) => list.some((permission) => granted.has(permission)),
      canAll: (...list) => list.every((permission) => granted.has(permission)),
    };
  }, [user]);
}
