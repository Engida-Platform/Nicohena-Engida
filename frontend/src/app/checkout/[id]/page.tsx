'use client';

/**
 * ENGIDA — Checkout & Payment Flow
 * Phase 3: Ethiopian Payments & Escrow Engine
 * Route: /checkout/[id]
 */

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  | 'TELEBIRR'
  | 'CBE_BIRR'
  | 'CHAPA'
  | 'CASH_ON_ARRIVAL';

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: string;
  badge?: string;
}[] = [
  {
    value: 'TELEBIRR',
    label: 'Telebirr Mobile Money',
    description: 'Instant transfer via Telebirr app · Locked in platform escrow',
    icon: 'phone_iphone',
    badge: 'Popular in Ethiopia',
  },
  {
    value: 'CBE_BIRR',
    label: 'CBE Birr Mobile Banking',
    description: 'Commercial Bank of Ethiopia direct mobile checkout',
    icon: 'account_balance',
    badge: 'Direct Bank Transfer',
  },
  {
    value: 'CHAPA',
    label: 'Chapa (Debit Cards & International)',
    description: 'Visa, Mastercard, and Ethiopian domestic debit cards',
    icon: 'credit_card',
    badge: 'Cards & Online',
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-[#EEF3EF] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Checkout Content (inside Suspense) ─────────────────────────────────────────
function CheckoutContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('TELEBIRR');
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Check if user came back from cancelled sandbox payment
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      setToast('Payment was cancelled in the gateway simulator. Please try again.');
    }
  }, [searchParams]);

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
        // If already paid, redirect straight to receipt
        if (data.paymentStatus === 'PAID') {
          router.push(`/checkout/${bookingId}/success`);
          return;
        }
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

  const handleProceedToPayment = async () => {
    if (!booking) return;

    setConfirming(true);
    try {
      // 1. Create authoritative server session bound to server-side quote
      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/checkout/${booking.id}/success`
        : `/checkout/${booking.id}/success`;

      const session = await apiFetch<{
        paymentId: string;
        sessionId: string;
        checkoutUrl?: string;
        mode?: string;
        status: string;
      }>('/payments/sessions', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: booking.id,
          paymentMethod: selectedPayment,
          currency: 'ETB',
          customerPhone: user?.hostProfile?.phone || '0911000000',
          returnUrl,
        }),
      });

      if (session.checkoutUrl) {
        if (session.checkoutUrl.startsWith('http://') || session.checkoutUrl.startsWith('https://')) {
          window.location.href = session.checkoutUrl;
        } else {
          router.push(session.checkoutUrl);
        }
      } else {
        router.push(`/checkout/${booking.id}/success`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize payment gateway';
      setToast(msg);
      setTimeout(() => setToast(null), 5000);
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

  // ── Main checkout view ──
  return (
    <div className="min-h-screen bg-[#F8F5ED] flex flex-col font-body">
      <AppHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Toast notification */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#252923] text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-xl max-w-md text-center border border-white/20 animate-fade-in-up">
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
            <span className="material-symbols-outlined text-3xl text-[#234B36]">lock</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#252923]">Secure Escrow Checkout</h1>
          </div>
          {booking?.reference && (
            <p className="text-xs font-mono font-bold text-[#234B36] bg-[#EEF3EF] inline-block px-3 py-1 rounded-full border border-[#234B36]/20 mt-2">
              Ref: {booking.reference}
            </p>
          )}
          <p className="text-sm text-[#73776F] mt-2">
            Your payment is held safely in platform escrow and released to the host only 24 hours after checkout.
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
              <h2 className="text-sm font-black text-[#252923] mb-4 uppercase tracking-wide">Stay Summary</h2>
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
                  <p className="text-xs text-[#73776F]">Total to Pay (ETB)</p>
                  <p className="text-2xl font-black text-[#252923]">ETB {totalETB.toLocaleString()}</p>
                  <p className="text-[10px] text-[#73776F] mt-0.5">Includes taxes and platform service fee</p>
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
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPayment === option.value
                        ? 'border-[#234B36] bg-[#EEF3EF]/60 shadow-xs'
                        : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/30 hover:bg-[#F8F5ED]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={option.value}
                      checked={selectedPayment === option.value}
                      onChange={() => setSelectedPayment(option.value)}
                      className="accent-[#234B36] w-4 h-4 cursor-pointer mt-1"
                    />
                    <span className="material-symbols-outlined text-2xl text-[#234B36] shrink-0">{option.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#252923]">{option.label}</p>
                        {option.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36] text-[9px] font-bold">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#73776F] mt-0.5">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ENGIDA Escrow Guarantee Banner */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#EEF3EF] border border-[#234B36]/20">
              <span className="material-symbols-outlined text-2xl text-[#234B36] shrink-0 mt-0.5">verified_user</span>
              <div>
                <p className="text-xs font-bold text-[#234B36]">Protected by ENGIDA Escrow</p>
                <p className="text-xs text-[#73776F] leading-relaxed mt-0.5">
                  Your payment is locked in platform escrow until 24 hours after checkout. If the listing does not match or access is not provided, you receive a 100% refund.
                </p>
              </div>
            </div>

            {/* Pay Button */}
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={confirming}
              className="w-full py-4 rounded-xl bg-[#234B36] hover:bg-[#1a3828] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-base transition-all duration-200 shadow-lg shadow-[#234B36]/25 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              {confirming ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting to Secure Gateway...
                </>
              ) : (
                <>
                  <span>Pay ETB {totalETB.toLocaleString()} via {selectedPayment === 'TELEBIRR' ? 'Telebirr' : selectedPayment === 'CBE_BIRR' ? 'CBE Birr' : 'Chapa'}</span>
                  <span className="material-symbols-outlined text-lg">lock</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-[#73776F]">
              Encrypted 256-bit SSL transaction &middot; Approved by National Bank of Ethiopia fintech guidelines
            </p>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

// ─── Exported Page Wrapped in Suspense ────────────────────────────────────────
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F5ED] flex flex-col font-body">
          <AppHeader />
          <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
            <CheckoutSkeleton />
          </main>
          <AppFooter />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
