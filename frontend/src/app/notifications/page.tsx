'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import {
  Bell,
  CheckCheck,
  Check,
  CheckCircle2,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Sparkles,
  MessageSquare,
  ShieldAlert,
  Star,
  AlertCircle,
  Building2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
  RotateCcw,
} from 'lucide-react';
import type { HostNotification, NotificationType } from '@/types/notification';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notifications';

type CategoryFilter = 'ALL' | 'BOOKINGS' | 'MESSAGES' | 'DISPUTES' | 'LISTINGS';

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return 'Recently';
  }
}

function getNotificationVisuals(type: NotificationType) {
  switch (type) {
    case 'BOOKING_REQUESTED':
      return {
        icon: CalendarPlus,
        bgColor: 'bg-[#EEF3EF] text-[#234B36]',
        badgeBg: 'bg-[#EEF3EF] text-[#234B36]',
        category: 'BOOKINGS',
        label: 'Booking Request',
      };
    case 'BOOKING_CONFIRMED':
      return {
        icon: CalendarCheck,
        bgColor: 'bg-emerald-50 text-emerald-700',
        badgeBg: 'bg-emerald-100 text-emerald-800',
        category: 'BOOKINGS',
        label: 'Stay Confirmed',
      };
    case 'BOOKING_CANCELLED':
      return {
        icon: CalendarX,
        bgColor: 'bg-rose-50 text-rose-700',
        badgeBg: 'bg-rose-100 text-rose-800',
        category: 'BOOKINGS',
        label: 'Stay Cancelled',
      };
    case 'BOOKING_COMPLETED':
      return {
        icon: Sparkles,
        bgColor: 'bg-amber-50 text-amber-700',
        badgeBg: 'bg-amber-100 text-amber-800',
        category: 'BOOKINGS',
        label: 'Stay Completed',
      };
    case 'MESSAGE_RECEIVED':
      return {
        icon: MessageSquare,
        bgColor: 'bg-blue-50 text-blue-700',
        badgeBg: 'bg-blue-100 text-blue-800',
        category: 'MESSAGES',
        label: 'New Message',
      };
    case 'LISTING_APPROVED':
      return {
        icon: CheckCircle2,
        bgColor: 'bg-emerald-50 text-emerald-700',
        badgeBg: 'bg-emerald-100 text-emerald-800',
        category: 'LISTINGS',
        label: 'Listing Approved',
      };
    case 'LISTING_REJECTED':
      return {
        icon: AlertCircle,
        bgColor: 'bg-amber-50 text-amber-700',
        badgeBg: 'bg-amber-100 text-amber-800',
        category: 'LISTINGS',
        label: 'Listing Review',
      };
    case 'CASE_ASSIGNED':
    case 'CASE_REPLY':
    case 'CASE_ESCALATED':
      return {
        icon: ShieldAlert,
        bgColor: 'bg-purple-50 text-purple-700',
        badgeBg: 'bg-purple-100 text-purple-800',
        category: 'DISPUTES',
        label: 'Dispute & Trust',
      };
    case 'REVIEW_HIDDEN':
    case 'REVIEW_RESTORED':
      return {
        icon: Star,
        bgColor: 'bg-amber-50 text-amber-700',
        badgeBg: 'bg-amber-100 text-amber-800',
        category: 'LISTINGS',
        label: 'Verified Review',
      };
    default:
      return {
        icon: Building2,
        bgColor: 'bg-[#EEF3EF] text-[#73776F]',
        badgeBg: 'bg-[#EEF3EF] text-[#73776F]',
        category: 'ALL',
        label: 'Platform Alert',
      };
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<HostNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Authentication Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?next=/notifications');
    }
  }, [user, authLoading, router]);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [notifRes, unreadRes] = await Promise.all([
        fetchNotifications({ page, limit: 15, unreadOnly }),
        fetchUnreadCount(),
      ]);
      setNotifications(notifRes.data || []);
      setTotalPages(notifRes.totalPages || 1);
      setUnreadCount(unreadRes);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, page, unreadOnly]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Mark single notification as read
  const handleMarkAsRead = async (
    e: React.MouseEvent,
    notification: HostNotification,
  ) => {
    e.stopPropagation();
    if (notification.isRead) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationAsRead(notification.id);
    } catch {
      void loadNotifications();
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch {
      void loadNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Notification click routing
  const handleNotificationClick = async (notification: HostNotification) => {
    if (!notification.isRead) {
      void markNotificationAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  // Filter notifications by category client-side
  const filteredNotifications = notifications.filter((item) => {
    if (category === 'ALL') return true;
    const visuals = getNotificationVisuals(item.type);
    return visuals.category === category;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#234B36] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5ED] text-[#252923] font-body">
      <AppHeader />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E0D5]/80">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#234B36]" />
              <h1 className="text-2xl sm:text-3xl font-black text-[#252923] tracking-tight font-headline">
                Notifications & Activity Center
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#234B36] text-white text-xs font-black tracking-wide">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#73776F] mt-1.5 max-w-2xl">
              Real-time updates regarding your stays, instant reservations, host communications, financial payouts, and trust verifications.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5E0D5] text-[#234B36] hover:bg-[#EEF3EF] text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
              >
                <CheckCheck className="w-4 h-4 text-[#234B36]" />
                <span>{isMarkingAll ? 'Marking read...' : 'Mark all as read'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="p-2 rounded-xl bg-white border border-[#E5E0D5] text-[#73776F] hover:text-[#234B36] hover:bg-[#EEF3EF] transition shadow-2xs cursor-pointer"
              title="Refresh activity feed"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'ALL', label: 'All Updates' },
              { id: 'BOOKINGS', label: 'Stays & Bookings' },
              { id: 'MESSAGES', label: 'Messages' },
              { id: 'DISPUTES', label: 'Trust & Disputes' },
              { id: 'LISTINGS', label: 'Listings & Reviews' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id as CategoryFilter)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  category === tab.id
                    ? 'bg-[#234B36] text-white shadow-xs'
                    : 'bg-white border border-[#E5E0D5] text-[#73776F] hover:text-[#252923] hover:bg-[#EEF3EF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Unread Toggle */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                setUnreadOnly(!unreadOnly);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                unreadOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-[#E5E0D5] text-[#73776F] hover:text-[#252923]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${unreadOnly ? 'bg-emerald-600 animate-pulse' : 'bg-zinc-400'}`} />
              <span>Unread Only</span>
            </button>
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="mt-6">
          {loading && notifications.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-[#E5E0D5] rounded-2xl p-5 animate-pulse flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-200 rounded w-1/3" />
                    <div className="h-3 bg-zinc-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* Empty State */
            <div className="bg-white border border-[#E5E0D5] rounded-2xl p-12 text-center shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF3EF] text-[#234B36] flex items-center justify-center mx-auto shadow-2xs">
                <Inbox className="w-7 h-7 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#252923] font-headline">
                  You're all caught up
                </h3>
                <p className="text-xs sm:text-sm text-[#73776F] max-w-md mx-auto">
                  {unreadOnly
                    ? 'No unread notifications right now. Toggle unread filter to see past activity.'
                    : 'You do not have any notifications matching this filter yet. Stay inquiries and reservation updates will appear here.'}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/stays"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#2D5E43] transition shadow-xs"
                >
                  Explore Stays Across Ethiopia
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((item) => {
                const visuals = getNotificationVisuals(item.type);
                const IconComponent = visuals.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`group bg-white border rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer flex items-start justify-between gap-4 ${
                      item.isRead
                        ? 'border-[#E5E0D5] hover:border-[#234B36]/40 hover:shadow-sm'
                        : 'border-[#234B36]/30 bg-gradient-to-r from-[#EEF3EF]/30 to-white shadow-2xs hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
                      {/* Category Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[#E5E0D5]/60 shadow-2xs ${visuals.bgColor}`}>
                        <IconComponent className="w-5 h-5 stroke-[2.2]" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${visuals.badgeBg}`}>
                            {visuals.label}
                          </span>
                          {!item.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#234B36] animate-pulse" />
                          )}
                          <span className="text-[11px] text-[#73776F] font-medium">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>

                        <h3 className={`text-sm sm:text-base leading-snug truncate ${item.isRead ? 'font-bold text-[#252923]' : 'font-extrabold text-[#252923]'}`}>
                          {item.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-[#73776F] leading-relaxed line-clamp-2">
                          {item.message}
                        </p>

                        {item.link && (
                          <div className="pt-1.5 flex items-center gap-1 text-xs font-bold text-[#234B36] group-hover:text-[#2D5E43]">
                            <span>View details</span>
                            <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2">
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(e, item)}
                          title="Mark as read"
                          className="p-2 rounded-xl text-[#73776F] hover:text-[#234B36] hover:bg-[#EEF3EF] border border-transparent hover:border-[#E5E0D5] transition cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-[#E5E0D5]/70 pt-4 text-xs font-bold text-[#73776F]">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E0D5] bg-white hover:bg-[#EEF3EF] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E0D5] bg-white hover:bg-[#EEF3EF] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

