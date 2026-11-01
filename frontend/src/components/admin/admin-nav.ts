import type React from 'react';
import {
  Activity,
  BarChart3,
  CalendarRange,
  ClipboardCheck,
  FileText,
  Flag,
  LayoutDashboard,
  Landmark,
  MapPin,
  MessagesSquare,
  ScrollText,
  Sliders,
  Star,
  Tag,
  Users,
} from 'lucide-react';
import { ADMIN_PERMISSIONS, type Permission } from '../../types/admin';

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** The admin needs this single permission to open the page. */
  permission?: Permission;
  /** The admin needs at least one of these permissions to open the page. */
  anyOf?: Permission[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Single source of truth for the admin console pages and the permission each
 * one requires. The sidebar, the route guard in `admin/layout.tsx` and the
 * overview quick-links all read from here, so a page can never be visible in
 * the navigation yet unreachable (or reachable by URL yet hidden).
 *
 * The backend is still the authority: every endpoint enforces the same
 * permissions through `PermissionsGuard`.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operations',
    items: [
      {
        href: '/admin',
        label: 'Overview',
        shortLabel: 'Overview',
        icon: LayoutDashboard,
        permission: ADMIN_PERMISSIONS.DASHBOARD_VIEW,
      },
      {
        href: '/admin/bookings',
        label: 'Bookings',
        shortLabel: 'Bookings',
        icon: CalendarRange,
        permission: ADMIN_PERMISSIONS.BOOKINGS_VIEW,
      },
      {
        href: '/admin/cases',
        label: 'Support cases',
        shortLabel: 'Cases',
        icon: MessagesSquare,
        permission: ADMIN_PERMISSIONS.CASES_VIEW,
      },
      {
        href: '/admin/moderation',
        label: 'Moderation',
        shortLabel: 'Moderation',
        icon: ClipboardCheck,
        anyOf: [
          ADMIN_PERMISSIONS.LISTINGS_REVIEW,
          ADMIN_PERMISSIONS.LISTINGS_HIDE,
          ADMIN_PERMISSIONS.HOSTS_VIEW,
          ADMIN_PERMISSIONS.HOSTS_VERIFY,
        ],
      },
      {
        href: '/admin/reports',
        label: 'Reports',
        shortLabel: 'Reports',
        icon: Flag,
        permission: ADMIN_PERMISSIONS.REPORTS_VIEW,
      },
    ],
  },
  {
    title: 'Management & Growth',
    items: [
      {
        href: '/admin/users',
        label: 'Users & admins',
        shortLabel: 'Users',
        icon: Users,
        permission: ADMIN_PERMISSIONS.USERS_VIEW,
      },
      {
        href: '/admin/reviews',
        label: 'Guest reviews',
        shortLabel: 'Reviews',
        icon: Star,
        permission: ADMIN_PERMISSIONS.REVIEWS_VIEW,
      },
      {
        href: '/admin/finance',
        label: 'Finance & Escrow',
        shortLabel: 'Finance',
        icon: Landmark,
        permission: ADMIN_PERMISSIONS.FINANCE_VIEW,
      },
      {
        href: '/admin/analytics',
        label: 'Analytics & BI',
        shortLabel: 'Analytics',
        icon: BarChart3,
        permission: ADMIN_PERMISSIONS.ANALYTICS_VIEW,
      },
      {
        href: '/admin/coupons',
        label: 'Coupons & Discounts',
        shortLabel: 'Coupons',
        icon: Tag,
        permission: ADMIN_PERMISSIONS.COUPONS_MANAGE,
      },
    ],
  },
  {
    title: 'System & Catalog',
    items: [
      {
        href: '/admin/categories',
        label: 'Categories & Locations',
        shortLabel: 'Catalog',
        icon: MapPin,
        permission: ADMIN_PERMISSIONS.CATALOG_MANAGE,
      },
      {
        href: '/admin/content',
        label: 'Content & CMS',
        shortLabel: 'Content',
        icon: FileText,
        permission: ADMIN_PERMISSIONS.CONTENT_MANAGE,
      },
      {
        href: '/admin/settings',
        label: 'Platform Settings',
        shortLabel: 'Settings',
        icon: Sliders,
        permission: ADMIN_PERMISSIONS.SETTINGS_VIEW,
      },
      {
        href: '/admin/system',
        label: 'System Health',
        shortLabel: 'System',
        icon: Activity,
        permission: ADMIN_PERMISSIONS.SYSTEM_VIEW,
      },
      {
        href: '/admin/audit',
        label: 'Audit log',
        shortLabel: 'Audit',
        icon: ScrollText,
        permission: ADMIN_PERMISSIONS.AUDIT_VIEW,
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export function canAccessNavItem(
  item: NavItem,
  permissions: readonly string[],
): boolean {
  if (item.permission) return permissions.includes(item.permission);
  if (item.anyOf && item.anyOf.length > 0) {
    return item.anyOf.some((permission) => permissions.includes(permission));
  }
  // Items that declare no permission are intentionally open to every admin.
  return true;
}

/** Sections reduced to the items the given permission set can open. */
export function filterNavSections(permissions: readonly string[]): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessNavItem(item, permissions)),
  })).filter((section) => section.items.length > 0);
}

function matchesPath(item: NavItem, pathname: string): boolean {
  if (item.href === '/admin') return pathname === '/admin' || pathname === '/admin/';
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The nav item that owns a pathname (longest href wins), if any. */
export function findNavItemForPath(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.filter((item) => matchesPath(item, pathname)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

/** First page the permission set can open, used as the landing fallback. */
export function firstAccessibleHref(permissions: readonly string[]): string | null {
  return (
    ALL_NAV_ITEMS.find((item) => canAccessNavItem(item, permissions))?.href ?? null
  );
}
