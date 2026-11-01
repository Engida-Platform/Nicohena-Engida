'use client';

/**
 * ENGIDA — Ethiopian Payment Gateway Sandbox Simulator
 * Phase 3: Payment & Escrow Testing Environment
 * Route: /checkout/sandbox
 *
 * Simulates Chapa / Telebirr / CBE Birr checkout completions.
 */

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';

function SandboxPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const session = searchParams.get('session') || '';
  const ref = searchParams.get('ref') || '';
  const rawAmount = searchParams.get('amount') || '0';
  const bookingId = searchParams.get('bookingId') || '';
  const method = searchParams.get('method') || 'TELEBIRR';

  // Amount in minor units (cents) converted to ETB decimal
  const amountETB = (Number(rawAmount) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulateSuccess = async () => {
    setProcessing(true);
    setError(null);
    try {
      // Ingest verified test capture via backend webhook
      await apiFetch('/payments/webhook/SANDBOX', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          event: 'charge.completed',
          status: 'success',
          tx_ref: ref,
          provider_payment_id: ref,
          bypass_signature: true,
          data: {
            tx_ref: ref,
            status: 'success',
            amount: Number(rawAmount) / 100,
            currency: 'ETB',
          },
        }),
      });

      // Navigate to confirmed escrow receipt page
      router.push(`/checkout/${bookingId}/success?session=${encodeURIComponent(session)}&ref=${encodeURIComponent(ref)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to simulate payment webhook';
      setError(msg);
      setProcessing(false);
    }
  };

  const handleSimulateCancel = () => {
    if (bookingId) {
      router.push(`/checkout/${bookingId}?cancelled=true`);
    } else {
      router.push('/dashboard');
    }
  };

  const getMethodTitle = () => {
    switch (method.toUpperCase()) {
      case 'TELEBIRR':
        return 'Telebirr Mobile Payment (Simulated)';
      case 'CBE_BIRR':
        return 'CBE Birr Mobile Banking (Simulated)';
      case 'CHAPA':
      default:
        return 'Chapa Payment Gateway (Simulated)';
    }
  };

  return (
    <main className="flex-1 max-w-xl mx-auto w-full px-4 py-12">
      {/* Dev Environment Notice */}
      <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-600 text-base">developer_mode</span>
        <span>
          <strong>Sandbox Test Gateway:</strong> No real funds will be deducted. Simulates instant Ethiopian mobile payment capture.
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 shadow-xl">
        {/* Gateway Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#E5E0D5]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF3EF] border border-[#234B36]/20 flex items-center justify-center text-[#234B36]">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <div>
              <h1 className="text-base font-black text-[#252923]">{getMethodTitle()}</h1>
              <p className="text-xs text-[#73776F]">Merchant: ENGIDA Stays & Residences</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] text-[10px] font-bold uppercase tracking-wide">
            Test Mode
          </span>
        </div>

        {/* Transaction Details */}
        <div className="py-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-[#73776F]">Amount to Pay</span>
            <span className="text-3xl font-black text-[#252923]">ETB {amountETB}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F5ED] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#73776F]">Reference Code:</span>
              <span className="font-mono font-bold text-[#252923]">{ref || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#73776F]">Booking ID:</span>
              <span className="font-mono text-[#252923]">{bookingId ? `${bookingId.slice(0, 12)}...` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#73776F]">Escrow Protection:</span>
              <span className="font-bold text-[#234B36] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">shield</span>
                Active (Held until check-in + 24h)
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleSimulateSuccess}
            disabled={processing}
            className="w-full py-4 rounded-xl bg-[#234B36] hover:bg-[#1a3828] disabled:opacity-60 text-white font-black text-sm transition-all shadow-md shadow-[#234B36]/20 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Capturing Payment & Escrow...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Confirm & Pay ETB {amountETB}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSimulateCancel}
            disabled={processing}
            className="w-full py-3 rounded-xl bg-white border border-[#E5E0D5] text-xs font-semibold text-[#73776F] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer"
          >
            Cancel and Return
          </button>
        </div>

        <p className="text-[11px] text-center text-[#73776F] mt-5">
          Simulating secure payment protocol compliant with NBE (National Bank of Ethiopia) escrow guidelines.
        </p>
      </div>
    </main>
  );
}

export default function SandboxPaymentPage() {
  return (
    <div className="min-h-screen bg-[#F8F5ED] flex flex-col font-body">
      <AppHeader />
      <Suspense
        fallback={
          <main className="flex-1 max-w-xl mx-auto w-full px-4 py-16 text-center">
            <div className="w-8 h-8 border-2 border-[#234B36]/30 border-t-[#234B36] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs text-[#73776F]">Loading payment simulator...</p>
          </main>
        }
      >
        <SandboxPaymentContent />
      </Suspense>
      <AppFooter />
    </div>
  );
}

