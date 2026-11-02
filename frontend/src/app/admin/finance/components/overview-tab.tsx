'use client';

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Scale,
  RotateCcw,
  Clock,
  ArrowRight,
  Landmark,
  Wallet,
  Receipt,
  FileCheck,
  ZapOff,
} from 'lucide-react';
import type { FinanceSummary } from '../../../../types/admin-finance';
import { formatMinor } from '../../../../lib/finance-format';
import AdminStatusBadge from '../../../../components/admin/AdminStatusBadge';
import { useAuth } from '../../../../context/AuthContext';
import { ADMIN_PERMISSIONS, can } from '../../../../types/admin';

interface OverviewTabProps {
  summary: FinanceSummary | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: string) => void;
}

export default function OverviewTab({
  summary,
  loading,
  onRefresh,
  onNavigateTab,
}: OverviewTabProps) {
  if (loading && !summary) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-28 bg-[#f2ece4] animate-pulse rounded-2xl border border-[#d8d0c8]" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#f2ece4] animate-pulse rounded-2xl border border-[#d8d0c8]" />
          ))}
        </div>
      </div>
    );
  }

  const liveFlags = summary?.liveFlags || {
    liveCaptureEnabled: false,
    liveRefundsEnabled: false,
    livePayoutsEnabled: false,
    autoReleaseEnabled: false,
  };
  const isSandbox = !liveFlags.liveCaptureEnabled;
  const invariant = summary?.ledgerInvariant;
  const metrics = summary?.metrics;
  const queues = summary?.pendingQueues;

  const { user } = useAuth();
  const canRefunds = can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_REFUNDS);
  const canPayouts = can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_PAYOUTS);
  const canEscrow = can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_VIEW);
  const canReconcile = can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_RECONCILE);

  const queueCards = [
    canRefunds && {
      id: 'refunds',
      title: 'Refunds Pending Approval',
      hint: 'requires second approver',
      count: queues?.pendingRefundApprovals ?? 0,
      countColor: 'text-[#3a302a]',
    },
    canPayouts && {
      id: 'payouts',
      title: 'Payout Batches in Review',
      hint: 'batches queued',
      count: queues?.pendingPayoutApprovals ?? 0,
      countColor: 'text-[#3a302a]',
    },
    canEscrow && {
      id: 'escrow',
      title: 'Dispute Frozen Escrows',
      hint: 'active case freezes',
      count: queues?.frozenEscrowHolds ?? 0,
      countColor: 'text-[#95631f]',
    },
    canReconcile && {
      id: 'reconciliation',
      title: 'Reconciliation Issues',
      hint: 'unresolved mismatches',
      count: queues?.reconciliationIssues ?? 0,
      countColor: 'text-[#9a3f33]',
    },
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    hint: string;
    count: number;
    countColor: string;
  }>;

  return (
    <div className="space-y-6">
      {/* ── 1. HARD GATE / SANDBOX ALERT BANNER ── */}
      <div
        className={`rounded-2xl p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isSandbox
            ? 'bg-[#f7ebda] border-[#ecd9c2] text-[#95631f]'
            : 'bg-[#edf1e8] border-[#d6dfcd] text-[#536b4a]'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl border ${
              isSandbox
                ? 'bg-[#faefe2] border-[#ecd9c2] text-[#b3541e]'
                : 'bg-[#e5ecde] border-[#d6dfcd] text-[#234b36]'
            }`}
          >
            {isSandbox ? <ZapOff className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-[#3a302a]">
                {isSandbox ? 'SANDBOX PIPELINE ACTIVE (GATE P3-00)' : 'LIVE TREASURY MOVEMENTS ACTIVE'}
              </h2>
              <AdminStatusBadge
                label={isSandbox ? 'Simulated' : 'Production'}
                tone={isSandbox ? 'warning' : 'success'}
                dot
              />
            </div>
            <p className="text-xs text-[#605850] mt-0.5 max-w-2xl leading-relaxed">
              {isSandbox
                ? 'All guest captures, refund reversals, and host payouts are routed through simulated deterministic sandboxes. Real money movements require activating feature flags under Settings.'
                : 'Production payment provider credentials active. Payouts and refunds initiate real banking instructions with dual authorization.'}
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#d8d0c8] text-xs font-bold text-[#3a302a] hover:bg-[#faf5ee] transition shadow-xs cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh ledger</span>
        </button>
      </div>

      {/* ── 2. INVARIANT HEALTH BAR ── */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              invariant?.balanced
                ? 'bg-[#edf1e8] border-[#d6dfcd] text-[#536b4a]'
                : 'bg-[#f8e9e5] border-[#ebd0c9] text-[#9a3f33]'
            }`}
          >
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#605850]">
                Double-Entry Invariant Status
              </span>
              <AdminStatusBadge
                label={invariant?.balanced ? 'Zero Discrepancy' : 'Invariant Violation'}
                tone={invariant?.balanced ? 'success' : 'danger'}
                dot
              />
            </div>
            <p className="text-xs text-[#605850] mt-0.5 font-mono">
              Σ Debits ({formatMinor(invariant?.totalDebitsMinor)}) === Σ Credits ({formatMinor(invariant?.totalCreditsMinor)})
            </p>
          </div>
        </div>

        <div className="text-right flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-[#73776f] font-semibold block">
              Difference
            </span>
            <span
              className={`font-mono text-sm font-bold ${
                invariant?.balanced ? 'text-[#536b4a]' : 'text-[#9a3f33]'
              }`}
            >
              {formatMinor(invariant?.differenceMinor || '0')}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('ledger')}
            className="px-3 py-1.5 rounded-lg border border-[#d8d0c8] text-xs font-bold text-[#3a302a] hover:bg-[#faf5ee] transition cursor-pointer"
          >
            Inspect Journal
          </button>
        </div>
      </div>

      {/* ── 3. TREASURY KEY METRICS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#73776f] uppercase tracking-wider">
              Gross Guest Captures
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#edf1e8] text-[#536b4a] flex items-center justify-center border border-[#d6dfcd]">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-serif text-2xl font-bold text-[#3a302a] tracking-tight">
              {formatMinor(metrics?.grossCapturedMinor)}
            </div>
            <p className="text-[11px] text-[#73776f] mt-1 font-medium">
              Realized online checkout payments
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#73776f] uppercase tracking-wider">
              Held in Escrow (Account 2010)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#f7ebda] text-[#95631f] flex items-center justify-center border border-[#ecd9c2]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-serif text-2xl font-bold text-[#95631f] tracking-tight">
              {formatMinor(metrics?.heldInEscrowMinor)}
            </div>
            <p className="text-[11px] text-[#73776f] mt-1 font-medium">
              Custody funds awaiting escrow release
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#73776f] uppercase tracking-wider">
              Host Payable (Account 2020)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#edf1e8] text-[#234b36] flex items-center justify-center border border-[#d6dfcd]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-serif text-2xl font-bold text-[#234b36] tracking-tight">
              {formatMinor(metrics?.hostPayableMinor)}
            </div>
            <p className="text-[11px] text-[#73776f] mt-1 font-medium">
              Cleared for daily 02:00 Addis batch
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#73776f] uppercase tracking-wider">
              Platform Net Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#f8e9dd] text-[#934313] flex items-center justify-center border border-[#e7c9b4]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-serif text-2xl font-bold text-[#b3541e] tracking-tight">
              {formatMinor(metrics?.platformRevenueMinor)}
            </div>
            <p className="text-[11px] text-[#73776f] mt-1 font-medium">
              Accumulated commission after tax
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. ACTION & APPROVAL QUEUES ── */}
      {queueCards.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#605850] mb-3">
            Operations & Dual-Approval Queues
          </h3>
          <div
            className={`grid gap-4 ${
              queueCards.length === 1
                ? 'grid-cols-1'
                : queueCards.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : queueCards.length === 3
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {queueCards.map((card) => (
              <div
                key={card.id}
                onClick={() => onNavigateTab(card.id)}
                className="bg-white border border-[#d8d0c8] hover:border-[#b3541e] rounded-2xl p-4 transition-all shadow-xs cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3a302a]">{card.title}</span>
                  <ArrowRight className="w-4 h-4 text-[#73776f] group-hover:text-[#b3541e] transition" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${card.countColor}`}>
                    {card.count}
                  </span>
                  <span className="text-xs text-[#73776f]">{card.hint}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
