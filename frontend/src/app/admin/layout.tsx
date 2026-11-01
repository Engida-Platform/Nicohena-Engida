'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import AdminNoAccess from '../../components/admin/AdminNoAccess';
import {
  canAccessNavItem,
  filterNavSections,
  findNavItemForPath,
  firstAccessibleHref,
} from '../../components/admin/admin-nav';
import { formatAdminRole } from '../../types/admin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore collapsed sidebar preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('engida_admin_nav_collapsed');
      if (saved === 'true') {
        setCollapsed(true);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('engida_admin_nav_collapsed', String(next));
      } catch {
        // Ignore write failures
      }
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/admin')}`);
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const { permissions: effectivePermissions } = useAdminPermissions();

  // Strict visibility: an admin only ever sees the pages their role grants.
  // There is deliberately no "show everything" fallback; the backend enforces
  // the same permissions on every endpoint.
  const visibleSections = useMemo(
    () => filterNavSections(effectivePermissions),
    [effectivePermissions],
  );

  const allVisibleItems = useMemo(
    () => visibleSections.flatMap((s) => s.items),
    [visibleSections],
  );

  const routeItem = findNavItemForPath(pathname || '/admin');
  const routeAllowed = !routeItem || canAccessNavItem(routeItem, effectivePermissions);
  const activeItem = routeItem && routeAllowed
    ? allVisibleItems.find((item) => item.href === routeItem.href)
    : undefined;
  const landingHref = firstAccessibleHref(effectivePermissions);

  if (loading) {
    return (
      <div className="admin-shell flex min-h-screen flex-col items-center justify-center bg-[#faf5ee]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d8d0c8] bg-white shadow-[0_10px_30px_-18px_rgba(58,48,42,0.45)]">
          <span className="font-headline text-2xl font-bold text-[#b3541e]">E</span>
        </div>
        <div className="mt-5 h-px w-16 overflow-hidden bg-[#d8d0c8]">
          <span className="block h-full w-1/2 animate-pulse bg-[#b3541e]" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#605850]">
          Loading operations
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-[#faf5ee] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#d8d0c8] bg-white p-8 text-center shadow-[0_20px_60px_-36px_rgba(58,48,42,0.4)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7e5dc] text-[#9a3f33]">
            <ShieldCheck className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <h1 className="font-headline text-2xl font-semibold tracking-[-0.015em] text-[#3a302a]">
            Administrator access required
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#605850]">
            This account does not have access to the ENGIDA operations console.
          </p>
          <Link href="/dashboard" className="admin-btn admin-btn-primary mt-6">
            Return to your dashboard
          </Link>
        </div>
      </div>
    );
  }

  const roleLabel = user.adminRole ? formatAdminRole(user.adminRole) : 'Administrator';
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  // Reusable sidebar navigation render
  const renderSidebarContent = (isCollapsedMode = false) => (
    <div className="flex h-full min-h-0 flex-col border-r border-[#d8d0c8] bg-[#f2ece4] select-none">
      {/* Brand Header */}
      <div className={`px-4 pt-5 pb-3 shrink-0 flex items-center ${isCollapsedMode ? 'justify-center' : 'justify-between'}`}>
        <Link
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="group inline-flex items-center gap-2.5 transition-opacity hover:opacity-90"
          title="Engida Operations Console"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c2652a] text-white shadow-[0_4px_12px_-2px_rgba(194,101,42,0.45)]">
            <span className="font-headline text-lg font-bold">E</span>
          </div>
          {!isCollapsedMode && (
            <div className="flex flex-col">
              <span className="font-headline text-xl font-bold leading-none tracking-[-0.02em] text-[#3a302a] group-hover:text-[#c2652a] transition-colors">
                Engida
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6c5d52]">
                Operations
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse / Expand Trigger */}
        {!isCollapsedMode && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d8d0c8] bg-white/70 text-[#605850] hover:bg-white hover:text-[#3a302a] transition-colors cursor-pointer shadow-2xs"
            title="Collapse sidebar (Ctrl+[)"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 space-y-4">
        {visibleSections.map((section, sIdx) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsedMode ? (
              <div className="px-2.5 pt-2 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#78706a]">
                  {section.title}
                </span>
                <span className="text-[10px] font-medium text-[#9d938b] tabular-nums">
                  {section.items.length}
                </span>
              </div>
            ) : sIdx > 0 ? (
              <div className="my-2 mx-auto w-6 h-px bg-[#d8d0c8]" />
            ) : null}

            <nav className="space-y-0.5" aria-label={section.title}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === '/admin'
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    title={isCollapsedMode ? item.label : undefined}
                    className={`group relative flex items-center rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                      isCollapsedMode
                        ? 'h-10 w-10 mx-auto justify-center'
                        : 'gap-3 px-3 py-2.5 w-full'
                    } ${
                      active
                        ? 'bg-[#b3541e] text-white shadow-[0_6px_16px_-6px_rgba(179,84,30,0.7)]'
                        : 'text-[#605850] hover:bg-[#eae2da] hover:text-[#3a302a]'
                    }`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                        active
                          ? 'text-white'
                          : 'text-[#6c5d52] group-hover:text-[#b3541e]'
                      }`}
                      strokeWidth={1.8}
                    />

                    {!isCollapsedMode && (
                      <>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white/90 shadow-xs" />
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* User Profile & Actions Footer */}
      <div className="mt-auto p-2.5 shrink-0 border-t border-[#d8d0c8]/70 bg-[#ece6dc]/60">
        {isCollapsedMode ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8d0c8] bg-white text-[#605850] hover:bg-[#faf5ee] hover:text-[#3a302a] transition-colors cursor-pointer shadow-2xs"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eae2da] text-xs font-bold text-[#3a302a] border border-[#d8d0c8]"
              title={`${user.name} (${roleLabel})`}
            >
              {initials || 'A'}
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#605850] hover:bg-[#f7e5dc] hover:text-[#9a3f33] transition-colors cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-[#d8d0c8] bg-white/80 p-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 px-1 py-0.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eae2da] text-xs font-bold text-[#3a302a] border border-[#d8d0c8]">
                {initials || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#3a302a]">{user.name}</p>
                <p className="truncate text-[11px] text-[#78706a]">{roleLabel}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-[#e6ddd2] pt-2 px-0.5">
              <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-[#605850] hover:text-[#b3541e] transition-colors"
              >
                <ArrowUpRight className="h-3 w-3" strokeWidth={1.8} />
                Marketplace
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-[#605850] hover:text-[#9a3f33] transition-colors cursor-pointer"
              >
                <LogOut className="h-3 w-3" strokeWidth={1.8} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="admin-shell min-h-screen bg-[#faf5ee] text-[#3a302a]">
      {/* Desktop / Tablet Sidebar (Visible md and up) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden md:block transition-[width] duration-200 ease-in-out ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {renderSidebarContent(collapsed)}
      </aside>

      {/* Mobile Drawer (Visible < md when opened) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-[#2f2722]/55 backdrop-blur-[2px] cursor-pointer"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72 max-w-[85vw] bg-[#f2ece4] shadow-[20px_0_60px_-30px_rgba(58,48,42,0.5)] animate-in slide-in-from-left duration-200">
            {renderSidebarContent(false)}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8d0c8] bg-[#faf5ee] text-[#3a302a] shadow-sm cursor-pointer z-10 hover:bg-white transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`transition-[padding] duration-200 ease-in-out ${
          collapsed ? 'md:pl-16' : 'md:pl-64'
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-[#d8d0c8] bg-[#faf5ee]/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 md:px-8 lg:px-10">
            {/* Mobile Menu Trigger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d8d0c8] bg-white/80 px-2.5 text-[#3a302a] transition-colors hover:bg-[#f2ece4] md:hidden cursor-pointer shadow-xs"
              aria-label="Open admin navigation menu"
            >
              <Menu className="h-4 w-4 text-[#b3541e]" />
              <span className="text-xs font-bold text-[#3a302a]">Menu</span>
            </button>

            {/* Desktop Expand Icon (Shown when sidebar is collapsed) */}
            {collapsed && (
              <button
                type="button"
                onClick={toggleCollapsed}
                className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8d0c8] bg-white/80 text-[#605850] hover:text-[#3a302a] hover:bg-[#f2ece4] transition-colors cursor-pointer shadow-2xs"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4 text-[#b3541e]" />
              </button>
            )}

            {/* Breadcrumb / Section indicator */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="hidden text-xs font-semibold text-[#6c5d52] sm:inline">Admin</span>
              <span className="hidden text-[#c9bdb1] sm:inline">/</span>
              <span className="truncate text-[13px] font-semibold text-[#3a302a]">
                {activeItem?.label || 'Console'}
              </span>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-2 rounded-full border border-[#d8d0c8] bg-white/65 px-3 py-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b3541e]" />
                <span className="text-xs font-semibold text-[#605850]">{roleLabel}</span>
              </div>
              <Link
                href="/"
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-[#d8d0c8] bg-white/65 text-[#605850] transition-colors hover:border-[#b3541e]/35 hover:text-[#b3541e] md:inline-flex"
                title="View marketplace"
              >
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
              </Link>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3a302a] text-xs font-bold text-[#faf5ee]"
                title={`${user.name} (${user.email})`}
              >
                {initials || 'A'}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-7 sm:px-6 md:px-8 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-[1440px]">
            {routeAllowed ? (
              children
            ) : (
              <AdminNoAccess
                area={routeItem?.label}
                required={routeItem?.permission ? [routeItem.permission] : routeItem?.anyOf}
                backHref={landingHref ?? '/'}
                backLabel={landingHref ? 'Go to a page you can open' : 'Back to marketplace'}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
