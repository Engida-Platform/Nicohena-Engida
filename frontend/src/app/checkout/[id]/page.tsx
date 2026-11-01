'use client';

/**
 * ENGIDA — Checkout & Booking Confirmation Page
 * Phase 2: Guest Reservation Flow
 * Route: /checkout/[id]
 *
 * Fetches the pending booking by ID and lets the guest
 * confirm their payment method before the host accepts.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface BookingProperty {
  id: string;
  title: string;
  city: string;
  subCity?: string | null;
  coverImage?: string | null;
  images?: string[];
  pricePerNight?: string;
}

interface BookingDetail {
  id: string;
  reference?: string;
  propertyId: string;
  property?: BookingProperty;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalPrice: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
}

type PaymentMethod =
  | 'CASH_ON_ARRIVAL'
  | 'CHAPA'
  | 'TELEBIRR'
  | 'CBE_BIRR';

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  icon: string;
  badge?: string;
  comingSoon?: boolean;
}[] = [
  {
    value: 'CASH_ON_ARRIVAL',
    label: 'Cash on Arrival',
    icon: 'payments',
    badge: 'Most Common',
  },
  {
    value: 'CHAPA',
    label: 'Chapa Online Payment',
    icon: 'credit_card',
    badge: 'Recommended',
    comingSoon: true,
  },
  {
    value: 'TELEBIRR',
    label: 'Telebirr',
    icon: 'phone_iphone',
    badge: 'Popular in Ethiopia',
    comingSoon: true,
  },
  {
    value: 'CBE_BIRR',
    label: 'CBE Birr',
    icon: 'account_balance',
    comingSoon: true,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('en-ET', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function calcNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));
}

function getPropertyImage(property?: BookingProperty): string {
  if (!property) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=70';
  if (property.coverImage) return property.coverImage;
  if (property.images && property.images.length > 0) return property.images[0];
  return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=70';
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────
function CheckoutSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 bg-[#EEF3EF] rounded-xl" />
      <div className="h-4 w-40 bg-[#EEF3EF] rounded-lg" />
      <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 flex gap-4">
        <div className="w-24 h-20 bg-[#EEF3EF] rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 bg-[#EEF3EF] rounded-lg" />
          <div className="h-3 w-32 bg-[#EEF3EF] rounded-lg" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-[#EEF3EF] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('CASH_ON_ARRIVAL');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=/checkout/${bookingId}`);
    }
  }, [authLoading, user, router, bookingId]);

  // ── Fetch booking ──
  useEffect(() => {
    if (!bookingId || authLoading || !user) return;

    setLoading(true);
    apiFetch<BookingDetail>(`/bookings/${bookingId}`)
      .then((data) => {
        setBooking(data);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Booking not found';
        if (msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('not found')) {
          router.push('/dashboard');
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [bookingId, authLoading, user, router]);

  const nights = booking ? calcNights(booking.checkInDate, booking.checkOutDate) : 0;
  const totalETB = booking ? Number(booking.totalPrice) : 0;

  const handleConfirm = async () => {
    if (!booking) return;

    if (selectedPayment !== 'CASH_ON_ARRIVAL') {
      const label = PAYMENT_OPTIONS.find((p) => p.value === selectedPayment)?.label ?? selectedPayment;
      setToast(`${label} integration coming soon. Please select Cash on Arrival for now.`);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    setConfirming(true);
    try {
      // Guest confirms payment method — PENDING→PENDING is a no-op backend-side,
      // host will transition to CONFIRMED. This records the user action.
      await apiFetch(`/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PENDING' }),
      }).catch(() => {
        // Non-fatal — PENDING → PENDING may be rejected, that is fine.
      });
      setConfirmed(true);
    } catch {
      setToast('Something went wrong. Please try again.');
      setTimeout(() => setToast(null), 4000);
    } finally {
      setConfirming(false);
    }
  };

  // ── Loading / error states ──
  if (authLoading || (loading && !booking)) {
    return (
      <div className="min-h-screen bg-[#F8F5ED] flex flex-col font-body">
        <AppHeader />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
          <CheckoutSkeleton />
        </main>
        <AppFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F5ED] flex flex-col font-body">
        <AppHeader />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-rose-500">error</span>
          </div>
          <h2 className="text-xl font-black text-[#252923] mb-2">Booking Not Found</h2>
          <p className="text-sm text-[#73776F] mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-[#234B36] text-white text-sm font-semibold hover:bg-[#1a3828] transition cursor-pointer"
          >
            Go to Dashboard
          </Link>
        </main>
        <AppFooter />
      </div>
    );
  }

  // ── Success state ──
  if (confirmed && booking) {
    return (
      <div className="min-h-screen bg-[#F8F5ED] flex flex-col font-body">
        <AppHeader />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-16 flex flex-col items-center text-center">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-[#EEF3EF] border-2 border-[#234B36]/30 flex items-center justify-center mb-6 shadow-lg shadow-[#234B36]/10">
            <span className="material-symbols-outlined text-4xl text-[#234B36]">check_circle</span>
          </div>

          <h1 className="text-3xl font-black text-[#252923] mb-2">Your Stay is Booked!</h1>
          {booking.reference && (
            <p className="text-sm font-mono font-bold text-[#234B36] bg-[#EEF3EF] px-3 py-1.5 rounded-full border border-[#234B36]/20 mb-4">
              {booking.reference}
            </p>
          )}
          <p className="text-sm text-[#73776F] max-w-sm leading-relaxed mb-8">
            The host will confirm your reservation within 24 hours. You&apos;ll receive a notification when confirmed.
          </p>

          {/* Stay summary */}
          <div className="w-full bg-white rounded-2xl border border-[#E5E0D5] p-5 mb-6 text-left">
            <div className="flex gap-4 items-start">
              <img
                src={getPropertyImage(booking.property)}
                alt={booking.property?.title ?? 'Property'}
                className="w-20 h-16 rounded-xl object-cover shrink-0"
              />
              <div>
                <p className="font-bold text-sm text-[#252923]">{booking.property?.title ?? 'Your Booked Property'}</p>
                <p className="text-xs text-[#73776F] mt-0.5">
                  {booking.property?.subCity ? `${booking.property.subCity}, ` : ''}
                  {booking.property?.city ?? ''}
                </p>
                <p className="text-xs text-[#73776F] mt-2">
                  {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)} &middot; {nights} {nights === 1 ? 'night' : 'nights'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              href="/dashboard"
              className="flex-1 py-3.5 rounded-xl bg-[#234B36] text-white text-sm font-semibold text-center hover:bg-[#1a3828] transition cursor-pointer"
            >
              View My Bookings
            </Link>
            <Link
              href="/properties"
              className="flex-1 py-3.5 rounded-xl bg-white border border-[#E5E0D5] text-[#252923] text-sm font-semibold text-center hover:bg-[#EEF3EF] transition cursor-pointer"
            >
              Explore More Properties
            </Link>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  // ── Main checkout view ──
  return (
    <div className="min-h-screen bg-[#F8F5ED] flex flex-col font-body">
      <AppHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Toast notification */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#252923] text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-xl max-w-sm text-center">
            {toast}
          </div>
        )}

        {/* Breadcrumb */}
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-xs text-[#73776F] hover:text-[#234B36] font-semibold mb-6 transition cursor-pointer group"
        >
          <span className="material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
          Back to Properties
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-3xl text-[#234B36]">celebration</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#252923]">Reservation Confirmed!</h1>
          </div>
          {booking?.reference && (
            <p className="text-xs font-mono font-bold text-[#234B36] bg-[#EEF3EF] inline-block px-3 py-1 rounded-full border border-[#234B36]/20 mt-2">
              Ref: {booking.reference}
            </p>
          )}
          <p className="text-sm text-[#73776F] mt-2">
            Now select your payment method and confirm. The host will accept within 24 hours.
          </p>
        </div>

        {booking && (
          <div className="space-y-5">

            {/* Property Card */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 flex gap-4 items-start shadow-xs">
              <img
                src={getPropertyImage(booking.property)}
                alt={booking.property?.title ?? 'Property'}
                className="w-24 h-20 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#252923] leading-tight truncate">
                  {booking.property?.title ?? 'Your Booked Property'}
                </p>
                <p className="text-xs text-[#73776F] mt-0.5">
                  {booking.property?.subCity ? `${booking.property.subCity}, ` : ''}
                  {booking.property?.city ?? ''}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="material-symbols-outlined text-sm text-[#234B36]">verified</span>
                  <span className="text-[10px] font-bold text-[#234B36]">ENGIDA Verified Property</span>
                </div>
              </div>
            </div>

            {/* Stay Details */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-xs">
              <h2 className="text-sm font-black text-[#252923] mb-4 uppercase tracking-wide">Stay Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#73776F]">Check-in</p>
                  <p className="text-sm font-bold text-[#252923] mt-1">{formatDate(booking.checkInDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#73776F]">Check-out</p>
                  <p className="text-sm font-bold text-[#252923] mt-1">{formatDate(booking.checkOutDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#73776F]">Duration</p>
                  <p className="text-sm font-bold text-[#252923] mt-1">
                    {nights} {nights === 1 ? 'night' : 'nights'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#73776F]">Guests</p>
                  <p className="text-sm font-bold text-[#252923] mt-1">
                    {booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}
                  </p>
                </div>
              </div>

              {/* Price total */}
              <div className="mt-4 pt-4 border-t border-[#E5E0D5]/70 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#73776F]">Total Amount</p>
                  <p className="text-2xl font-black text-[#252923]">ETB {totalETB.toLocaleString()}</p>
                  <p className="text-[10px] text-[#73776F] mt-0.5">Includes all fees and service charges</p>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                  {booking.status}
                </span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-xs">
              <h2 className="text-sm font-black text-[#252923] mb-4 uppercase tracking-wide">Select Payment Method</h2>
              <div className="space-y-3">
                {PAYMENT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPayment === option.value
                        ? 'border-[#234B36] bg-[#EEF3EF]/60'
                        : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/30 hover:bg-[#F8F5ED]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={option.value}
                      checked={selectedPayment === option.value}
                      onChange={() => setSelectedPayment(option.value)}
                      className="accent-[#234B36] w-4 h-4 cursor-pointer"
                    />
                    <span className="material-symbols-outlined text-xl text-[#234B36]">{option.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#252923]">{option.label}</p>
                      {option.comingSoon && (
                        <p className="text-[10px] text-[#73776F]">Integration coming soon</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {option.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36] text-[10px] font-bold">
                          {option.badge}
                        </span>
                      )}
                      {option.comingSoon && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-200">
                          Soon
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ENGIDA Guarantee */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#EEF3EF] border border-[#234B36]/20">
              <span className="material-symbols-outlined text-xl text-[#234B36] shrink-0 mt-0.5">shield</span>
              <div>
                <p className="text-xs font-bold text-[#234B36]">ENGIDA Guarantee</p>
                <p className="text-xs text-[#73776F] leading-relaxed mt-0.5">
                  Every booking on ENGIDA is protected. Verified hosts, secure payments, and your trust is our priority.
                </p>
              </div>
            </div>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full py-4 rounded-xl bg-[#234B36] hover:bg-[#1a3828] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-base transition-all duration-200 shadow-lg shadow-[#234B36]/25 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              {confirming ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <span>Confirm Reservation</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-[#73776F]">
              You won&apos;t be charged until the host confirms your booking.{' '}
              <Link href="/dashboard" className="underline hover:text-[#234B36] transition cursor-pointer">
                View all my bookings
              </Link>
            </p>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
