'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  MapPin,
  RotateCcw,
  X,
  Luggage,
  Building2,
  MessageSquare,
  Star,
  CheckCircle2,
  User as UserIcon,
  ChevronRight,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { Booking, BookingStatus } from '../../types';
import ChatModal from '../../components/messaging/ChatModal';

interface GuestBooking extends Booking {
  property: {
    id: string;
    title: string;
    city: string;
    coverImage: string | null;
  };
  room?: { id: string; title: string } | null;
}

interface ConversationListItem {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyImage: string | null;
  city: string;
  bookingId: string | null;
  guest?: { id: string; name: string; avatar?: string };
  host?: { id: string; name: string; avatar?: string };
  lastMessageText: string;
  lastMessageAt: string;
  unreadCount: number;
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-800 border-red-200',
  COMPLETED: 'bg-blue-50 text-blue-800 border-blue-200',
};

const RATING_LABELS: Record<number, string> = {
  5: 'Exceptional (5.0)',
  4: 'Very Good (4.0)',
  3: 'Average (3.0)',
  2: 'Below Average (2.0)',
  1: 'Disappointing (1.0)',
};

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(value: number | string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `ETB ${amount.toLocaleString()}` : 'Amount unavailable';
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'trips' | 'messages'>('trips');
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Review states
  const [reviewStatusByProperty, setReviewStatusByProperty] = useState<Record<string, boolean | null>>({});
  const [reviewForms, setReviewForms] = useState<Record<string, { rating: number; comment: string }>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});
  const [reviewSavingPropertyId, setReviewSavingPropertyId] = useState<string | null>(null);
  const [hoveredStars, setHoveredStars] = useState<Record<string, number>>({});

  // Messaging states
  const [chatBooking, setChatBooking] = useState<GuestBooking | null>(null);
  const [chatConversation, setChatConversation] = useState<ConversationListItem | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'messages') {
        setActiveTab('messages');
      }
      if (params.get('view') === 'guest') return;
      if (user.role === 'ADMIN') {
        router.replace('/admin');
      } else if (user.hostProfile) {
        router.replace('/host/dashboard');
      }
    }
  }, [user, router]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<GuestBooking[]>('/bookings/my-bookings');
      setBookings(data);
      const today = new Date().toISOString().slice(0, 10);
      const reviewablePropertyIds = [...new Set(data
        .filter((booking) => booking.status === 'COMPLETED' && booking.checkOutDate <= today)
        .map((booking) => booking.propertyId))];
      const reviewStatuses = await Promise.all(reviewablePropertyIds.map(async (propertyId) => {
        try {
          const response = await apiFetch<{ hasReviewed: boolean }>(`/properties/${propertyId}/reviews/mine`);
          return [propertyId, response.hasReviewed] as const;
        } catch {
          return [propertyId, null] as const;
        }
      }));
      setReviewStatusByProperty(Object.fromEntries(reviewStatuses));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your reservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await apiFetch<ConversationListItem[]>('/messages/conversations');
      setConversations(data || []);
      const totalUnread = (data || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setUnreadTotal(totalUnread);
    } catch {
      // Non-fatal
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
    void loadConversations();
  }, [loadBookings, loadConversations]);

  const cancelBooking = async (booking: GuestBooking) => {
    if (!window.confirm(`Cancel your reservation request for ${booking.property.title}?`)) return;

    setCancellingId(booking.id);
    setActionError(null);
    try {
      await apiFetch(`/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' satisfies BookingStatus }),
      });
      setBookings((current) => current.map((item) =>
        item.id === booking.id ? { ...item, status: 'CANCELLED' } : item,
      ));
    } catch (actionFailure) {
      setActionError(actionFailure instanceof Error ? actionFailure.message : 'Unable to cancel this reservation.');
    } finally {
      setCancellingId(null);
    }
  };

  const submitReview = async (propertyId: string) => {
    const form = reviewForms[propertyId] || { rating: 5, comment: '' };
    setReviewSavingPropertyId(propertyId);
    setReviewFeedback((current) => ({ ...current, [propertyId]: { type: 'success', message: '' } }));
    try {
      await apiFetch(`/properties/${propertyId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: form.rating, comment: form.comment.trim() || undefined }),
      });
      setReviewStatusByProperty((current) => ({ ...current, [propertyId]: true }));
      setReviewForms((current) => ({ ...current, [propertyId]: { rating: 5, comment: '' } }));
      setReviewFeedback((current) => ({
        ...current,
        [propertyId]: { type: 'success', message: 'Your verified stay review was submitted successfully!' },
      }));
    } catch (failure) {
      setReviewFeedback((current) => ({
        ...current,
        [propertyId]: { type: 'error', message: failure instanceof Error ? failure.message : 'Unable to submit this review.' },
      }));
    } finally {
      setReviewSavingPropertyId(null);
    }
  };

  const reviewOpportunityByProperty = new Map<string, string>();
  const today = new Date().toISOString().slice(0, 10);
  for (const booking of bookings) {
    if (booking.status === 'COMPLETED' && booking.checkOutDate <= today && !reviewOpportunityByProperty.has(booking.propertyId)) {
      reviewOpportunityByProperty.set(booking.propertyId, booking.id);
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto min-h-[75vh] w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* Top Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider">
                <Luggage className="w-3.5 h-3.5 text-slate-600" />
                Guest Traveler Account
              </span>
              {user?.hostProfile && (
                <Link
                  href="/host/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#234B36] text-xs font-black uppercase tracking-wider hover:bg-emerald-100 transition"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Switch to Host Portal →</span>
                </Link>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              My Trips & Messages{user?.name ? ` · ${user.name}` : ''}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Manage your property reservations, chat directly with verified hosts, and review completed stays.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadBookings();
              void loadConversations();
            }}
            disabled={loading || loadingConversations}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${loading || loadingConversations ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('trips')}
            className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'trips'
                ? 'border-[#234B36] text-[#234B36]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Luggage className="w-4 h-4" />
            <span>My Trips & Stays</span>
            {bookings.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === 'trips' ? 'bg-[#EEF3EF] text-[#234B36]' : 'bg-slate-100 text-slate-600'
              }`}>
                {bookings.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'border-[#234B36] text-[#234B36]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>In-Platform Messages</span>
            {unreadTotal > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-[#234B36] text-white animate-pulse">
                {unreadTotal} new
              </span>
            ) : conversations.length > 0 ? (
              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === 'messages' ? 'bg-[#EEF3EF] text-[#234B36]' : 'bg-slate-100 text-slate-600'
              }`}>
                {conversations.length}
              </span>
            ) : null}
          </button>
        </div>

        {error && (
          <section role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-900">Your reservations could not be loaded</h2>
            <p className="mt-1 text-sm text-red-800">{error}</p>
            <button type="button" onClick={() => void loadBookings()} className="mt-4 text-sm font-bold text-red-900 underline">
              Try again
            </button>
          </section>
        )}

        {actionError && (
          <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {actionError}
          </p>
        )}

        {/* TAB 1: TRIPS & RESERVATIONS */}
        {activeTab === 'trips' && (
          <>
            {loading && !error && (
              <div role="status" className="space-y-3">
                <p className="text-sm text-slate-500">Loading your reservations…</p>
                {[0, 1].map((item) => (
                  <div key={item} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            )}

            {!loading && !error && bookings.length === 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
                <Luggage className="mx-auto h-12 w-12 text-slate-400" />
                <h2 className="mt-4 text-xl font-bold text-slate-900">No trips booked yet</h2>
                <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                  When you browse accommodations across Ethiopia and request a stay, your booking details and host status will appear here.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/?tab=stays"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#234B36] hover:bg-[#1A3828] px-5 py-2.5 text-sm font-bold text-white transition shadow-xs"
                  >
                    Browse Stays & Rentals
                  </Link>
                </div>
              </section>
            )}

            {!loading && bookings.length > 0 && (
              <ul className="space-y-4">
                {bookings.map((booking) => (
                  <li key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 transition-all hover:border-slate-300">
                    <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900">{booking.property?.title || 'Listing unavailable'}</h2>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[booking.status]}`}>
                            {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                          {booking.property?.city || 'Location unavailable'}
                          {booking.room?.title ? ` · ${booking.room.title}` : ''}
                        </p>
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-700">
                          <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
                          {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)}
                          <span className="text-slate-500">· {booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}</span>
                        </p>

                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{formatAmount(booking.totalPrice)}</span>
                          {booking.paymentMethod && (
                            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#234B36] border border-emerald-100">
                              {booking.paymentMethod.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            booking.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {booking.paymentStatus || 'PENDING'}
                          </span>
                          {booking.paymentReference && (
                            <span className="text-[11px] text-slate-400 font-mono">Ref: {booking.paymentReference}</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setChatBooking(booking)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#234B36]/30 bg-[#EEF3EF] px-3.5 py-2 text-xs font-bold text-[#234B36] hover:bg-[#234B36] hover:text-white transition cursor-pointer shadow-2xs"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Message Host
                        </button>

                        {booking.property?.id && (
                          <Link
                            href={`/properties/${booking.property.id}`}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                          >
                            View listing
                          </Link>
                        )}

                        {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                          <button
                            type="button"
                            onClick={() => void cancelBooking(booking)}
                            disabled={cancellingId === booking.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 transition cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                            {cancellingId === booking.id ? 'Cancelling…' : 'Cancel request'}
                          </button>
                        )}
                      </div>

                      {/* Post-Stay Verified Review Module */}
                      {booking.status === 'COMPLETED' &&
                        booking.checkOutDate <= today &&
                        reviewOpportunityByProperty.get(booking.propertyId) === booking.id &&
                        reviewStatusByProperty[booking.propertyId] !== undefined && (
                          <div className="mt-5 w-full basis-full rounded-2xl bg-[#F8F5ED]/70 border border-[#E5E0D5] p-5">
                            {reviewStatusByProperty[booking.propertyId] === true ? (
                              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Thank you! Your verified stay review has been published.</span>
                              </div>
                            ) : reviewStatusByProperty[booking.propertyId] === null ? (
                              <p role="alert" className="text-sm text-red-700">Review status could not be checked. Refresh to try again.</p>
                            ) : (
                              <form
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void submitReview(booking.propertyId);
                                }}
                                className="space-y-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E0D5] pb-3">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold uppercase tracking-wider text-[#234B36]">Verified Stay Review</span>
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#234B36] bg-[#EEF3EF] px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" /> Completed Stay
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                      Rate your experience at {booking.property.title} to help future travelers.
                                    </p>
                                  </div>

                                  {/* Interactive Star Selector */}
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((starVal) => {
                                        const currentVal = reviewForms[booking.propertyId]?.rating ?? 5;
                                        const hovered = hoveredStars[booking.propertyId] ?? 0;
                                        const isActive = (hovered || currentVal) >= starVal;

                                        return (
                                          <button
                                            key={starVal}
                                            type="button"
                                            onMouseEnter={() => setHoveredStars((prev) => ({ ...prev, [booking.propertyId]: starVal }))}
                                            onMouseLeave={() => setHoveredStars((prev) => ({ ...prev, [booking.propertyId]: 0 }))}
                                            onClick={() =>
                                              setReviewForms((current) => ({
                                                ...current,
                                                [booking.propertyId]: {
                                                  rating: starVal,
                                                  comment: current[booking.propertyId]?.comment ?? '',
                                                },
                                              }))
                                            }
                                            className="p-1 transition-transform hover:scale-110 cursor-pointer"
                                            aria-label={`${starVal} stars`}
                                          >
                                            <Star
                                              className={`w-5 h-5 ${
                                                isActive
                                                  ? 'text-amber-400 fill-amber-400'
                                                  : 'text-slate-300'
                                              }`}
                                            />
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 min-w-[120px]">
                                      {RATING_LABELS[hoveredStars[booking.propertyId] || reviewForms[booking.propertyId]?.rating || 5]}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Your Feedback & Experience (optional)
                                  </label>
                                  <textarea
                                    maxLength={2000}
                                    rows={3}
                                    value={reviewForms[booking.propertyId]?.comment ?? ''}
                                    onChange={(event) =>
                                      setReviewForms((current) => ({
                                        ...current,
                                        [booking.propertyId]: {
                                          rating: current[booking.propertyId]?.rating ?? 5,
                                          comment: event.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="Tell the host and community what made this stay special: cleanliness, location, check-in ease, amenities..."
                                    className="w-full rounded-xl border border-[#d8d0c8] bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] resize-y"
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <p className="text-[11px] text-slate-500">
                                    Your review will be visible publicly on the listing page after verified submission.
                                  </p>
                                  <button
                                    type="submit"
                                    disabled={reviewSavingPropertyId === booking.propertyId}
                                    className="rounded-xl bg-[#234B36] hover:bg-[#1A3828] px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 shadow-sm cursor-pointer"
                                  >
                                    {reviewSavingPropertyId === booking.propertyId ? 'Publishing…' : 'Publish Review'}
                                  </button>
                                </div>
                              </form>
                            )}

                            {reviewFeedback[booking.propertyId]?.message && (
                              <p
                                role={reviewFeedback[booking.propertyId].type === 'error' ? 'alert' : 'status'}
                                className={`mt-3 text-xs font-bold ${
                                  reviewFeedback[booking.propertyId].type === 'error' ? 'text-red-700' : 'text-emerald-700'
                                }`}
                              >
                                {reviewFeedback[booking.propertyId].message}
                              </p>
                            )}
                          </div>
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* TAB 2: IN-PLATFORM MESSAGES */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            {loadingConversations ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#234B36]" />
                <p className="text-xs font-semibold">Loading conversation threads…</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-[#EEF3EF] flex items-center justify-center text-[#234B36] mx-auto mb-4">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">No message threads yet</h2>
                <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                  When you inquire about a property or message a host regarding a reservation, your conversation history will appear here.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/?tab=stays"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#234B36] hover:bg-[#1A3828] px-5 py-2.5 text-sm font-bold text-white transition shadow-xs"
                  >
                    <span>Browse Stays to Inquire</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {conversations.map((conv) => {
                  const counterpart = user?.id === conv.host?.id ? conv.guest : conv.host;
                  const counterpartName = counterpart?.name || (user?.id === conv.host?.id ? 'Guest' : 'Host');

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setChatConversation(conv)}
                      className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#234B36]/40 hover:bg-[#F8F5ED]/30 transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          {conv.propertyImage ? (
                            <Image
                              src={conv.propertyImage}
                              alt={conv.propertyName}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#EEF3EF] text-[#234B36]">
                              <Building2 className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 truncate text-sm sm:text-base">
                              {counterpartName}
                            </h3>
                            {conv.unreadCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#234B36] text-white">
                                {conv.unreadCount} new
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {conv.propertyName} {conv.city ? `· ${conv.city}` : ''}
                          </p>
                          <p className="text-xs text-slate-700 truncate mt-1 max-w-md font-medium">
                            {conv.lastMessageText || 'Conversation started'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatTimeAgo(conv.lastMessageAt)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#234B36] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Live Chat Modal */}
        {(chatBooking || chatConversation) && (
          <ChatModal
            isOpen={Boolean(chatBooking || chatConversation)}
            onClose={() => {
              setChatBooking(null);
              setChatConversation(null);
              void loadConversations();
            }}
            bookingId={chatBooking?.id || chatConversation?.bookingId || undefined}
            conversationId={chatConversation?.id || undefined}
            propertyId={chatBooking?.propertyId || chatConversation?.propertyId || undefined}
            recipientName={chatBooking?.property?.title ? 'Host' : chatConversation?.host?.name || 'User'}
            propertyTitle={chatBooking?.property?.title || chatConversation?.propertyName}
          />
        )}
      </main>
    </ProtectedRoute>
  );
}
