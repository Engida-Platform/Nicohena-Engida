'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Landmark,
  Receipt,
  Clock,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sliders,
  Wallet,
  FileCheck,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { useAuth } from '../../../context/AuthContext';
import { ADMIN_PERMISSIONS, can } from '../../../types/admin';
import { apiFetch, downloadAuthedFile } from '../../../lib/api';
import type { FinanceSummary } from '../../../types/admin-finance';

import OverviewTab from './components/overview-tab';
import PaymentsTab from './components/payments-tab';
import EscrowTab from './components/escrow-tab';
import RefundsTab from './components/refunds-tab';
import PayoutsTab from './components/payouts-tab';
import AccountsTab from './components/accounts-tab';
import LedgerTab from './components/ledger-tab';
import ReconciliationTab from './components/reconciliation-tab';
import SettingsTab from './components/settings-tab';

type FinanceTabKey =
  | 'overview'
  | 'payments'
  | 'escrow'
  | 'refunds'
  | 'payouts'
  | 'accounts'
  | 'ledger'
  | 'reconciliation'
  | 'settings';

export default function AdminFinancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FinanceTabKey>('overview');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [visitedTabs, setVisitedTabs] = useState<Record<FinanceTabKey, boolean>>({
    overview: true,
    payments: false,
    escrow: false,
    refunds: false,
    payouts: false,
    accounts: false,
    ledger: false,
    reconciliation: false,
    settings: false,
  });

  const handleSelectTab = (tab: FinanceTabKey) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
  };

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await apiFetch<FinanceSummary>('/admin/finance/summary');
      setSummary(data);
    } catch (err: unknown) {
      setSummaryError(
        err instanceof Error
          ? err.message
          : 'Unable to refresh treasury summary. Queues and indicators may be out of date.',
      );
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Periodic polling when visible to keep counters and queue badges accurate
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchSummary();
      }
    }, 90_000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadAuthedFile(
        '/admin/finance/exports/ledger.csv',
        `engida-finance-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  if (!can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_VIEW)) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#d8d0c8] max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-[#f8e9e5] text-[#9a3f33] flex items-center justify-center mx-auto mb-3">
          <Landmark className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-lg font-bold text-[#3a302a]">
          Finance Operations Access Required
        </h2>
        <p className="text-xs text-[#73776f] mt-1">
          Your administrator role does not have the <code className="font-mono">finance.view</code> permission.
        </p>
      </div>
    );
  }

  const TABS: Array<{ id: FinanceTabKey; label: string; icon: any; count?: number }> = [
    { id: 'overview', label: 'Treasury Overview', icon: Landmark },
    { id: 'payments', label: 'Captured Payments', icon: Receipt },
    {
      id: 'escrow',
      label: 'Escrow Holds',
      icon: Clock,
      count: summary?.pendingQueues?.frozenEscrowHolds,
    },
    {
      id: 'refunds',
      label: 'Refunds Review',
      icon: RotateCcw,
      count: summary?.pendingQueues?.pendingRefundApprovals,
    },
    {
      id: 'payouts',
      label: 'Host Payouts',
      icon: Wallet,
      count: summary?.pendingQueues?.pendingPayoutApprovals,
    },
    { id: 'accounts', label: 'Payout Accounts', icon: ShieldCheck },
    { id: 'ledger', label: 'General Ledger', icon: Scale },
    {
      id: 'reconciliation',
      label: 'Reconciliation',
      icon: FileCheck,
      count: summary?.pendingQueues?.reconciliationIssues,
    },
    { id: 'settings', label: 'Settings & Rates', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Escrow & Treasury Operations"
        description="Double-entry general ledger, provider escrow custody, and policy refund governance."
        actions={
          <div className="flex items-center gap-2">
            {can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_EXPORT) && (
              <button
                onClick={handleExportCsv}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#d8d0c8] text-xs font-bold text-[#3a302a] hover:bg-[#faf5ee] transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting ? 'Exporting…' : 'Export Ledger CSV'}</span>
              </button>
            )}
          </div>
        }
      />

      {/* Summary Error Alert */}
      {summaryError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#ecd0c9] bg-[#f8e9e5] px-4 py-3 text-xs text-[#8f4035] shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#a24b3e]" strokeWidth={1.8} />
            <p className="truncate font-medium">{summaryError}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void fetchSummary()}
              disabled={summaryLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-[#ecd0c9] bg-white px-2.5 py-1 text-xs font-bold text-[#8f4035] hover:bg-[#f3dcd6] cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${summaryLoading ? 'animate-spin' : ''}`} />
              Retry
            </button>
            <button
              type="button"
              onClick={() => setSummaryError(null)}
              className="rounded-lg p-1 text-[#8f4035] hover:bg-[#ecd0c9]/50 cursor-pointer"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Finance Tab Bar */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-1.5 shadow-xs overflow-x-auto">
        <nav className="flex space-x-1 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#b3541e] text-white shadow-xs'
                    : 'text-[#605850] hover:text-[#3a302a] hover:bg-[#faf5ee]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#73776f]'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#f7ebda] text-[#95631f] border border-[#ecd9c2]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Panel with lazy tab mounting and retention */}
      <div>
        <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
          <OverviewTab
            summary={summary}
            loading={summaryLoading}
            onRefresh={fetchSummary}
            onNavigateTab={handleSelectTab}
          />
        </div>
        {visitedTabs.payments && (
          <div className={activeTab === 'payments' ? 'block' : 'hidden'}>
            <PaymentsTab />
          </div>
        )}
        {visitedTabs.escrow && (
          <div className={activeTab === 'escrow' ? 'block' : 'hidden'}>
            <EscrowTab />
          </div>
        )}
        {visitedTabs.refunds && (
          <div className={activeTab === 'refunds' ? 'block' : 'hidden'}>
            <RefundsTab />
          </div>
        )}
        {visitedTabs.payouts && (
          <div className={activeTab === 'payouts' ? 'block' : 'hidden'}>
            <PayoutsTab />
          </div>
        )}
        {visitedTabs.accounts && (
          <div className={activeTab === 'accounts' ? 'block' : 'hidden'}>
            <AccountsTab />
          </div>
        )}
        {visitedTabs.ledger && (
          <div className={activeTab === 'ledger' ? 'block' : 'hidden'}>
            <LedgerTab />
          </div>
        )}
        {visitedTabs.reconciliation && (
          <div className={activeTab === 'reconciliation' ? 'block' : 'hidden'}>
            <ReconciliationTab />
          </div>
        )}
        {visitedTabs.settings && (
          <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
            <SettingsTab onRefreshSummary={fetchSummary} />
          </div>
        )}
      </div>
    </div>
  );
}
