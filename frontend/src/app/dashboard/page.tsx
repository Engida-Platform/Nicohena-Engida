'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, RotateCcw, X, Luggage, Building2, MessageSquare, Receipt, Printer, FileText, ShieldAlert } from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { Booking, BookingStatus } from '../../types';

interface GuestBooking extends Booking {
  cancellationPolicy?: string | null;
  property: {
    id: string;
    title: string;
    city: string;
    coverImage: string | null;
    address?: string | null;
    host?: {
      name?: string | null;
      email?: string | null;
    } | null;
  };
  room?: { id: string; title: string } | null;
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-800 border-red-200',
  COMPLETED: 'bg-blue-50 text-blue-800 border-blue-200',
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

function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 1;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<GuestBooking[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'guest') return;
      if (user.role === 'ADMIN') {
        router.replace('/admin');
      } else if (user.hostProfile) {
        router.replace('/host/dashboard');
      }
    }
  }, [user, router]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<GuestBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState<GuestBooking | null>(null);
  const [reviewStatusByProperty, setReviewStatusByProperty] = useState<Record<string, boolean | null>>({});
  const [reviewForms, setReviewForms] = useState<Record<string, { rating: number; comment: string }>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});
  const [reviewSavingPropertyId, setReviewSavingPropertyId] = useState<string | null>(null);

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
  }, [user?.id]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const handleOpenCancel = (booking: GuestBooking) => {
    setCancellingBooking(booking);
    setCancelReason('');
    setActionError(null);
    setSuccessBanner(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setCancelSubmitting(true);
    setActionError(null);
    try {
      const res = await apiFetch<{ message: string; status?: string }>(
        `/bookings/${cancellingBooking.id}/cancellation-requests`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
        },
      );
      setSuccessBanner(res?.message || 'Cancellation request processed successfully.');
      setBookings((current) =>
        current.map((item) =>
          item.id === cancellingBooking.id ? { ...item, status: 'CANCELLED' } : item,
        ),
      );
      setCancellingBooking(null);
    } catch (err) {
      // Fallback if cancellation-requests endpoint had an issue or status can be updated directly
      try {
        await apiFetch(`/bookings/${cancellingBooking.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'CANCELLED' satisfies BookingStatus }),
        });
        setSuccessBanner('Your reservation was cancelled.');
        setBookings((current) =>
          current.map((item) =>
            item.id === cancellingBooking.id ? { ...item, status: 'CANCELLED' } : item,
          ),
        );
        setCancellingBooking(null);
      } catch (fallbackErr) {
        setActionError(err instanceof Error ? err.message : 'Unable to cancel this reservation.');
      }
    } finally {
      setCancelSubmitting(false);
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
      setReviewFeedback((current) => ({ ...current, [propertyId]: { type: 'success', message: 'Your review was submitted.' } }));
    } catch (failure) {
      setReviewFeedback((current) => ({ ...current, [propertyId]: { type: 'error', message: failure instanceof Error ? failure.message : 'Unable to submit this review.' } }));
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
      <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider">
                <Luggage className="w-3.5 h-3.5 text-slate-600" />
                Guest Traveler Account
              </span>
              {user?.hostProfile && (
                <Link
                  href="/host/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#1e40af] text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Switch to Host Portal →</span>
                </Link>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              My Trips & Stays{user?.name ? ` · ${user.name}` : ''}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
              Stays and property reservations you&apos;ve requested as a guest. Track host confirmation status and stay details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBookings()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {error && (
          <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-900">Your reservations could not be loaded</h2>
            <p className="mt-1 text-sm text-red-800">{error}</p>
            <button type="button" onClick={() => void loadBookings()} className="mt-4 text-sm font-bold text-red-900 underline">
              Try again
            </button>
          </section>
        )}

        {actionError && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{actionError}</p>}
        {successBanner && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{successBanner}</p>}

        {loading && !error && (
          <div role="status" className="space-y-3">
            <p className="text-sm text-slate-500">Loading your reservations…</p>
            {[0, 1].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
            <Luggage className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">No trips booked yet</h2>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              When you browse accommodations across Ethiopia and request a stay, your booking details and host status will appear here.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/?tab=stays" className="inline-flex items-center gap-2 rounded-xl bg-[#1e40af] hover:bg-[#1e3a8a] px-5 py-2.5 text-sm font-bold text-white transition shadow-xs">
                Browse Stays & Rentals
              </Link>
              {user?.hostProfile && (
                <Link href="/host/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 transition">
                  <Building2 className="w-4 h-4 text-[#1e40af]" />
                  <span>Go to Host Portal</span>
                </Link>
              )}
            </div>
          </section>
        )}

        {!loading && bookings.length > 0 && (
          <ul className="space-y-4">
            {bookings.map((booking) => (
              <li key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{booking.property?.title || 'Listing unavailable'}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[booking.status]}`}>
                        {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 shrink-0" />{booking.property?.city || 'Location unavailable'}
                      {booking.room?.title ? ` · ${booking.room.title}` : ''}
                    </p>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-700">
                      <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
                      {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)}
                      <span className="text-slate-500">· {booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}</span>
                    </p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{formatAmount(booking.totalPrice)}</span>
                      {booking.paymentMethod && (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
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
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {booking.property?.id && (
                      <Link href={`/properties/${booking.property.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
                        View listing
                      </Link>
                    )}
                    <Link
                      href={`/messages?bookingId=${booking.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#234B36]/30 bg-[#234B36]/5 px-3 py-2 text-xs font-bold text-[#234B36] hover:bg-[#234B36]/10 transition"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Message host
                    </Link>
                    {(booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' || booking.paymentStatus === 'PAID') && (
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptBooking(booking)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Receipt className="h-3.5 w-3.5 text-slate-600" />
                        Receipt
                      </button>
                    )}
                    {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                      <button
                        type="button"
                        onClick={() => handleOpenCancel(booking)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel stay
                      </button>
                    )}
                  </div>
                  {booking.status === 'COMPLETED' &&
                    booking.checkOutDate <= today &&
                    reviewOpportunityByProperty.get(booking.propertyId) === booking.id &&
                    reviewStatusByProperty[booking.propertyId] !== undefined && (
                      <div className="mt-5 w-full basis-full border-t border-slate-100 pt-4">
                        {reviewStatusByProperty[booking.propertyId] === true ? (
                          <p role="status" className="text-sm font-semibold text-emerald-700">You have reviewed this listing.</p>
                        ) : reviewStatusByProperty[booking.propertyId] === null ? (
                          <p role="alert" className="text-sm text-red-700">Review status could not be checked. Refresh your reservations to try again.</p>
                        ) : (
                          <form onSubmit={(event) => { event.preventDefault(); void submitReview(booking.propertyId); }} className="grid gap-3 sm:grid-cols-[150px_1fr_auto] sm:items-end">
                            <label className="text-xs font-semibold text-slate-600">Your rating
                              <select value={reviewForms[booking.propertyId]?.rating ?? 5} onChange={(event) => setReviewForms((current) => ({ ...current, [booking.propertyId]: { rating: Number(event.target.value), comment: current[booking.propertyId]?.comment ?? '' } }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} {rating === 1 ? 'star' : 'stars'}</option>)}
                              </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-600">Comment (optional)
                              <textarea maxLength={2000} rows={2} value={reviewForms[booking.propertyId]?.comment ?? ''} onChange={(event) => setReviewForms((current) => ({ ...current, [booking.propertyId]: { rating: current[booking.propertyId]?.rating ?? 5, comment: event.target.value } }))} className="mt-1 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            </label>
                            <button type="submit" disabled={reviewSavingPropertyId === booking.propertyId} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                              {reviewSavingPropertyId === booking.propertyId ? 'Submitting…' : 'Submit review'}
                            </button>
                          </form>
                        )}
                        {reviewFeedback[booking.propertyId]?.message && <p role={reviewFeedback[booking.propertyId].type === 'error' ? 'alert' : 'status'} className={`mt-2 text-sm ${reviewFeedback[booking.propertyId].type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{reviewFeedback[booking.propertyId].message}</p>}
                      </div>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Cancellation Modal */}
        {cancellingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="rounded-full bg-red-50 p-2.5 text-red-600">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cancel Reservation</h3>
                  <p className="text-xs text-slate-500">{cancellingBooking.property?.title}</p>
                </div>
              </div>

              <div className="mt-4 space-y-4 text-xs text-slate-600">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-amber-900">
                  <p className="font-bold">Cancellation Policy: {cancellingBooking.cancellationPolicy || 'Standard'}</p>
                  <p className="mt-1">
                    {cancellingBooking.paymentStatus === 'PAID'
                      ? 'Because this booking has been paid, submitting a cancellation will automatically evaluate the refund amount according to the host policy and refund eligible funds to your original payment method.'
                      : 'This reservation is currently unpaid. Confirming cancellation will immediately release the reserved dates.'}
                  </p>
                </div>

                <div>
                  <label htmlFor="cancel-reason" className="block font-semibold text-slate-700 mb-1">
                    Reason for cancellation (optional)
                  </label>
                  <textarea
                    id="cancel-reason"
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="E.g., Travel plans changed, personal emergency, booked alternative dates..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={cancelSubmitting}
                  onClick={() => setCancellingBooking(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  disabled={cancelSubmitting}
                  onClick={() => void handleConfirmCancel()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {cancelSubmitting ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  {cancelSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printable Receipt Modal */}
        {selectedReceiptBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="print-receipt-modal relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
              {/* Receipt Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-[#1e40af]">ENGIDA</span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 border border-blue-200">
                      Official Receipt
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Booking Reference #{selectedReceiptBooking.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-2 no-print">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReceiptBooking(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="mt-6 space-y-6 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Guest Information</p>
                    <p className="mt-1 font-bold text-slate-900">{user?.name || 'Guest Traveler'}</p>
                    <p className="text-xs text-slate-600">{user?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Property & Host</p>
                    <p className="mt-1 font-bold text-slate-900">{selectedReceiptBooking.property?.title}</p>
                    <p className="text-xs text-slate-600">
                      {selectedReceiptBooking.property?.city}
                      {selectedReceiptBooking.property?.address ? `, ${selectedReceiptBooking.property.address}` : ''}
                    </p>
                    <p className="text-xs text-slate-600">
                      Host: {selectedReceiptBooking.property?.host?.name || 'Verified Engida Host'}
                    </p>
                  </div>
                </div>

                {/* Stay Breakdown */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Reservation Details</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-200 p-2.5">
                      <span className="text-slate-500 block">Check-in</span>
                      <span className="font-bold text-slate-900">{formatDate(selectedReceiptBooking.checkInDate)}</span>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-2.5">
                      <span className="text-slate-500 block">Check-out</span>
                      <span className="font-bold text-slate-900">{formatDate(selectedReceiptBooking.checkOutDate)}</span>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-2.5">
                      <span className="text-slate-500 block">Duration</span>
                      <span className="font-bold text-slate-900">
                        {calculateNights(selectedReceiptBooking.checkInDate, selectedReceiptBooking.checkOutDate)} nights
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-2.5">
                      <span className="text-slate-500 block">Guests</span>
                      <span className="font-bold text-slate-900">
                        {selectedReceiptBooking.guestCount} {selectedReceiptBooking.guestCount === 1 ? 'guest' : 'guests'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Charges */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Payment Summary</h4>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 font-bold">Description</th>
                        <th className="py-2 text-right font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-2.5">
                          Accommodation ({calculateNights(selectedReceiptBooking.checkInDate, selectedReceiptBooking.checkOutDate)} nights)
                          {selectedReceiptBooking.room?.title ? ` - ${selectedReceiptBooking.room.title}` : ''}
                        </td>
                        <td className="py-2.5 text-right font-semibold">
                          {formatAmount(selectedReceiptBooking.totalPrice)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-500">Platform Service & Escrow Protection Fee</td>
                        <td className="py-2.5 text-right text-slate-500">Included</td>
                      </tr>
                      <tr className="border-t-2 border-slate-900 text-slate-900 font-bold text-sm">
                        <td className="py-3">Total Amount Paid</td>
                        <td className="py-3 text-right text-emerald-700">
                          {formatAmount(selectedReceiptBooking.totalPrice)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Escrow & Payment Guarantee */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-start gap-3">
                  <FileText className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900">
                    <p className="font-bold">Engida Escrow Guarantee</p>
                    <p className="mt-0.5 text-emerald-800">
                      Payment Method: {selectedReceiptBooking.paymentMethod?.replace(/_/g, ' ') || 'Digital Payment'}
                      {selectedReceiptBooking.paymentReference ? ` · Ref: ${selectedReceiptBooking.paymentReference}` : ''}
                    </p>
                    <p className="mt-0.5 text-[11px] text-emerald-700">
                      Payment is held securely in escrow and released to the property host 24 hours after check-in verification.
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 no-print">
                <button
                  type="button"
                  onClick={() => setSelectedReceiptBooking(null)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
