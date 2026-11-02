'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { useWishlist } from '@/lib/wishlist';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { savedCount } = useWishlist();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'ETB'>('ETB');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      apiFetch<{ count: number }>('/notifications/unread-count')
        .then((res) => setUnreadNotifications(res?.count || 0))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F8F5ED]/95 backdrop-blur-xl border-b border-[#E5E0D5]/50 shadow-[0_1px_8px_rgba(58,48,42,0.04)]">
      <div className="h-20 w-full px-4 sm:px-6 lg:px-12 flex items-center justify-between max-w-[1440px] mx-auto">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group transition-transform duration-200 hover:scale-[1.02] active:scale-95"
        >
          <span className="text-3xl font-bold tracking-tight text-[#234B36] font-headline transition-colors group-hover:text-[#2D5E43]">
            Engida
          </span>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center gap-3 sm:gap-4">
          {user?.hostProfile || (user as any)?.role === 'HOST' ? (
            <Link
              href="/host/dashboard"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-[#234B36] text-white font-semibold text-sm hover:bg-[#1a3828] transition-all duration-200 active:scale-95 shadow-xs font-body"
            >
              Host Dashboard
            </Link>
          ) : (
            <Link
              href="/become-a-host"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-[#EEF3EF] text-[#252923] font-semibold text-sm hover:bg-[#234B36] hover:text-white transition-all duration-200 active:scale-95 shadow-xs font-body"
            >
              Become a Host
            </Link>
          )}

          <button
            type="button"
            aria-label="Toggle currency"
            onClick={() => setCurrency((c) => (c === 'USD' ? 'ETB' : 'USD'))}
            title={`Currency: ${currency}. Click to toggle`}
            className="hidden md:flex items-center justify-center px-3 py-1.5 rounded-full hover:bg-[#EEF3EF] text-xs font-bold text-[#73776F] hover:text-[#234B36] transition font-body"
          >
            {currency}
          </button>

          {user && (
            <Link
              href="/notifications"
              className="relative p-2 rounded-full hover:bg-[#EEF3EF] text-[#73776F] hover:text-[#234B36] transition"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
          )}

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="User menu"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-2 p-1.5 pl-3 rounded-full bg-white border border-[#E5E0D5]/60 shadow-[0_2px_12px_rgba(58,48,42,0.06)] hover:shadow-[0_4px_16px_rgba(194,101,42,0.14)] hover:border-[#234B36]/40 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[#73776F] text-base">menu</span>
              <div className="w-8 h-8 rounded-full bg-[#EEF3EF] flex items-center justify-center p-1 overflow-hidden text-[#a84d16] font-bold text-xs">
                {user?.name ? (
                  user.name.charAt(0).toUpperCase()
                ) : (
                  <span className="material-symbols-outlined text-lg text-[#73776F]">person</span>
                )}
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E5E0D5]/60 py-2 z-50 animate-fade-in-up font-body">
                {user ? (
                  <>
                    <div className="px-4 py-2 border-b border-[#E5E0D5]/40">
                      <p className="text-xs text-[#73776F]">Signed in as</p>
                      <p className="text-sm font-bold text-[#252923] truncate">{user.name || user.email}</p>
                      {user.role === 'ADMIN' && (
                        <span className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900">
                          Administrator
                        </span>
                      )}
                    </div>
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-amber-900 bg-amber-50/70 hover:bg-amber-100 font-bold border-b border-[#E5E0D5]/40"
                      >
                        Admin Operations Console
                      </Link>
                    )}
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/wishlist"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#D87836]">favorite</span>
                        <span>Wishlist &amp; Saved</span>
                      </div>
                      {savedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#234B36]/10 text-[#234B36]">
                          {savedCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/messages"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      Messages
                    </Link>
                    <Link
                      href="/notifications"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      <span>Notifications</span>
                      {unreadNotifications > 0 && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {unreadNotifications}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/support"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      Help &amp; Support
                    </Link>
                    {user.hostProfile ? (
                      <Link
                        href="/host/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                      >
                        Host Dashboard
                      </Link>
                    ) : (
                      <Link
                        href="/become-a-host"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                      >
                        Become a Host
                      </Link>
                    )}
                    <div className="my-1 border-t border-[#E5E0D5]/40" />
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-semibold"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#73776F] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      Create Account
                    </Link>
                    <Link
                      href="/wishlist"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#D87836]">favorite</span>
                        <span>Wishlist &amp; Saved</span>
                      </div>
                      {savedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#234B36]/10 text-[#234B36]">
                          {savedCount}
                        </span>
                      )}
                    </Link>
                    <div className="my-1 border-t border-[#E5E0D5]/40" />
                    <Link
                      href="/become-a-host"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#73776F] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      Engida your home
                    </Link>
                    <Link
                      href="/support"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#73776F] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                    >
                      Help &amp; Support
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
