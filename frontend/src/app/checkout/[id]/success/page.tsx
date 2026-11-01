'use client';

/**
 * ENGIDA — Payment Success & Escrow Protection Receipt
 * Phase 3: Payment & Escrow Confirmation
 * Route: /checkout/[id]/success
 */

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';

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
  paidAt?: string | null;
  createdAt: string;
}

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

function PaymentSuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const bookingId = params?.id as string;
  const refCode = searchParams.get('ref') || '';

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=/checkout/${bookingId}/success`);
      return;
    }

    if (bookingId) {
      apiFetch<BookingDetail>(`/bookings/${bookingId}`)
        .then((data) => setBooking(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [bookingId, user, authLoading, router]);

  const nights = booking ? calcNights(booking.checkInDate, booking.checkOutDate) : 0;
  const totalETB = booking ? Number(booking.totalPrice).toLocaleString() : '0';

  if (loading) {
    return (
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-20 text-center">
        <div className="w-10 h-10 border-3 border-[#234B36]/30 border-t-[#234B36] rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-sm font-bold text-[#252923]">Securing your reservation & escrow...</h2>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-12">
      {/* Success Hero */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-[#EEF3EF] border-2 border-[#234B36]/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#234B36]/10">
          <span className="material-symbols-outlined text-4xl text-[#234B36]">verified</span>
        </div>
        <h1 className="text-3xl font-black text-[#252923] tracking-tight">Payment Confirmed!</h1>
        <p className="text-sm text-[#73776F] mt-2 max-w-md mx-auto">
          Your payment has been captured and your reservation is confirmed. Your funds are secured in platform escrow.
        </p>
        {(booking?.reference || refCode) && (
          <div className="mt-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#234B36] text-white text-xs font-mono font-bold tracking-wide shadow-xs">
              <span>REF:</span>
              <span>{booking?.reference || refCode}</span>
            </span>
          </div>
        )}
      </div>

      {/* Escrow Guarantee Card */}
      <div className="bg-gradient-to-r from-[#234B36] to-[#1c3c2b] text-white rounded-3xl p-6 sm:p-7 mb-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-2xl text-emerald-300">security</span>
            <h2 className="text-base font-bold text-white">ENGIDA Escrow Guarantee Active</h2>
          </div>
          <p className="text-xs text-white/90 leading-relaxed mb-4">
            To ensure complete peace of mind, your payment of <strong>ETB {totalETB}</strong> is held safely in our banking escrow account. The host receives payment strictly <strong>24 hours after your successful check-in</strong>.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20 text-center">
            <div>
              <p className="text-[10px] text-white/70 uppercase tracking-wider">Step 1</p>
              <p className="text-xs font-bold text-emerald-200 mt-0.5">Payment Held</p>
            </div>
            <div>
              <p className="text-[10px] text-white/70 uppercase tracking-wider">Step 2</p>
              <p className="text-xs font-bold text-white mt-0.5">Smooth Check-in</p>
            </div>
            <div>
              <p className="text-[10px] text-white/70 uppercase tracking-wider">Step 3</p>
              <p className="text-xs font-bold text-white mt-0.5">Host Disbursal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stay Summary Card */}
      {booking && (
        <div className="bg-white rounded-3xl border border-[#E5E0D5] p-6 shadow-sm mb-6 space-y-5">
          <div className="flex gap-4 items-start pb-5 border-b border-[#E5E0D5]">
            <img
              src={getPropertyImage(booking.property)}
              alt={booking.property?.title || 'Property'}
              className="w-24 h-20 rounded-2xl object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-[#252923] truncate">
                {booking.property?.title || 'ENGIDA Stay'}
              </h3>
              <p className="text-xs text-[#73776F] mt-0.5">
                {booking.property?.subCity ? `${booking.property.subCity}, ` : ''}
                {booking.property?.city || 'Ethiopia'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  Confirmed
                </span>
                <span className="text-[11px] text-[#73776F]">
                  {nights} {nights === 1 ? 'night' : 'nights'} &middot; {booking.guestCount} {booking.guestCount === 1 ? 'guest' : 'guests'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#73776F] block">Check-in</span>
              <span className="font-bold text-[#252923] text-sm mt-0.5 block">{formatDate(booking.checkInDate)}</span>
            </div>
            <div>
              <span className="text-[#73776F] block">Check-out</span>
              <span className="font-bold text-[#252923] text-sm mt-0.5 block">{formatDate(booking.checkOutDate)}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E0D5] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#73776F]">Total Paid</span>
            <span className="text-xl font-black text-[#252923]">ETB {totalETB}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard"
          className="flex-1 py-4 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-sm font-black text-center transition shadow-md shadow-[#234B36]/20 cursor-pointer"
        >
          View in My Bookings
        </Link>
        <Link
          href="/properties"
          className="flex-1 py-4 rounded-xl bg-white border border-[#E5E0D5] text-[#252923] text-sm font-semibold text-center hover:bg-[#EEF3EF] transition cursor-pointer"
        >
          Explore More Stays
        </Link>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#F8F5ED] flex flex-col font-body">
      <AppHeader />
      <Suspense
        fallback={
          <main className="flex-1 max-w-xl mx-auto w-full px-4 py-20 text-center">
            <div className="w-10 h-10 border-3 border-[#234B36]/30 border-t-[#234B36] rounded-full animate-spin mx-auto mb-4" />
          </main>
        }
      >
        <PaymentSuccessContent />
      </Suspense>
      <AppFooter />
    </div>
  );
}

