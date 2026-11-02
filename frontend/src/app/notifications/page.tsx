'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import AppHeader from '@/components/layout/AppHeader';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
  metadata?: Record<string, any>;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        apiFetch<AppNotification[]>('/notifications?limit=50'),
        apiFetch<{ count: number }>('/notifications/unread-count'),
      ]);
      setNotifications(listRes || []);
      setUnreadCount(countRes?.count || 0);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadNotifications();
    }
  }, [user, loadNotifications]);

  const handleMarkAsRead = async (id: string, link?: string | null) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (link) {
        router.push(link);
      }
    } catch {
      if (link) router.push(link);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      alert(err.message || 'Failed to mark notifications as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_CREATED':
        return { icon: 'verified', color: 'text-emerald-700 bg-emerald-100' };
      case 'BOOKING_CANCELLED':
        return { icon: 'cancel', color: 'text-rose-700 bg-rose-100' };
      case 'PAYOUT_PROCESSED':
      case 'PAYOUT_FAILED':
        return { icon: 'payments', color: 'text-amber-700 bg-amber-100' };
      case 'IDENTITY_VERIFIED':
      case 'IDENTITY_REJECTED':
        return { icon: 'badge', color: 'text-blue-700 bg-blue-100' };
      case 'REVIEW_RECEIVED':
      case 'REVIEW_MODERATED':
        return { icon: 'star', color: 'text-amber-600 bg-amber-50' };
      default:
        return { icon: 'notifications', color: 'text-zinc-700 bg-zinc-100' };
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.isRead : true,
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans">
      <AppHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#73776F] hover:text-[#234B36] transition group cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-1">arrow_back</span>
            <span>Back to Explore Stays</span>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E5E0D5]">
          <div>
            <h1 className="text-2xl font-black text-[#252923] tracking-tight">
              Notifications
            </h1>
            <p className="text-xs sm:text-sm text-[#73776F] mt-1">
              Stay updated on your reservations, escrow releases, host inquiries, and case resolutions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => void handleMarkAllAsRead()}
                className="px-3.5 py-1.5 rounded-xl border border-[#234B36] text-[#234B36] text-xs font-bold hover:bg-[#EEF3EF] transition"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              filter === 'all'
                ? 'bg-[#234B36] text-white shadow-xs'
                : 'bg-white border border-[#E5E0D5] text-[#73776F] hover:text-[#252923]'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              filter === 'unread'
                ? 'bg-[#234B36] text-white shadow-xs'
                : 'bg-white border border-[#E5E0D5] text-[#73776F] hover:text-[#252923]'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification List */}
        {authLoading || loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E0D5]">
            <div className="w-8 h-8 border-2 border-[#234B36] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#73776F]">Loading notifications...</p>
          </div>
        ) : !user ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#E5E0D5]">
            <span className="material-symbols-outlined text-4xl text-[#73776F] mb-2">lock</span>
            <h3 className="text-base font-bold text-[#252923]">Sign in to view notifications</h3>
            <p className="text-xs text-[#73776F] mt-1 mb-4">Please log in to see updates and alerts.</p>
            <Link
              href="/login"
              className="inline-block px-5 py-2 rounded-xl bg-[#234B36] text-white text-xs font-bold"
            >
              Log In
            </Link>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E0D5]">
            <div className="w-12 h-12 rounded-full bg-[#EEF3EF] flex items-center justify-center mx-auto mb-3 text-[#234B36]">
              <span className="material-symbols-outlined text-2xl">notifications_none</span>
            </div>
            <h3 className="text-base font-bold text-[#252923]">No notifications right now</h3>
            <p className="text-xs text-[#73776F] mt-1 max-w-sm mx-auto">
              {filter === 'unread'
                ? 'You are all caught up! No unread notifications.'
                : 'Activity regarding your bookings, reviews, or payouts will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredNotifications.map((n) => {
              const iconStyle = getNotificationIcon(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => void handleMarkAsRead(n.id, n.link)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-3.5 ${
                    !n.isRead
                      ? 'bg-[#EEF3EF]/60 border-[#234B36]/30 shadow-xs'
                      : 'bg-white border-[#E5E0D5] hover:border-[#234B36]/40 opacity-85'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconStyle.color}`}>
                    <span className="material-symbols-outlined text-xl">{iconStyle.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-[#252923] truncate">{n.title}</h4>
                      <span className="text-[10px] text-[#73776F] shrink-0 font-medium">
                        {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-[#73776F] leading-relaxed line-clamp-2">{n.message}</p>
                  </div>

                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-[#234B36] shrink-0 mt-2" title="Unread" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

