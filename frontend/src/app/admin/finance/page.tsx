'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import AdminNoAccess from '../../../components/admin/AdminNoAccess';
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

  interface FinanceTabDef {
    id: FinanceTabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    permission?: (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];
  }

  const ALL_TABS: FinanceTabDef[] = useMemo(
    () => [
      {
        id: 'overview',
        label: 'Treasury Overview',
        icon: Landmark,
        permission: ADMIN_PERMISSIONS.FINANCE_VIEW,
      },
      {
        id: 'payments',
        label: 'Captured Payments',
        icon: Receipt,
        permission: ADMIN_PERMISSIONS.FINANCE_VIEW,
      },
      {
        id: 'escrow',
        label: 'Escrow Holds',
        icon: Clock,
        count: summary?.pendingQueues?.frozenEscrowHolds,
        permission: ADMIN_PERMISSIONS.FINANCE_VIEW,
      },
      {
        id: 'refunds',
        label: 'Refunds Review',
        icon: RotateCcw,
        count: summary?.pendingQueues?.pendingRefundApprovals,
        permission: ADMIN_PERMISSIONS.FINANCE_REFUNDS,
      },
      {
        id: 'payouts',
        label: 'Host Payouts',
        icon: Wallet,
        count: summary?.pendingQueues?.pendingPayoutApprovals,
        permission: ADMIN_PERMISSIONS.FINANCE_PAYOUTS,
      },
      {
        id: 'accounts',
        label: 'Payout Accounts',
        icon: ShieldCheck,
        permission: ADMIN_PERMISSIONS.FINANCE_PAYOUTS,
      },
      {
        id: 'ledger',
        label: 'General Ledger',
        icon: Scale,
        permission: ADMIN_PERMISSIONS.FINANCE_VIEW,
      },
      {
        id: 'reconciliation',
        label: 'Reconciliation',
        icon: FileCheck,
        count: summary?.pendingQueues?.reconciliationIssues,
        permission: ADMIN_PERMISSIONS.FINANCE_RECONCILE,
      },
      {
        id: 'settings',
        label: 'Settings & Rates',
        icon: Sliders,
        permission: ADMIN_PERMISSIONS.FINANCE_CONFIG,
      },
    ],
    [summary?.pendingQueues],
  );

  const TABS = useMemo(
    () => ALL_TABS.filter((tab) => !tab.permission || can(user?.permissions, tab.permission)),
    [ALL_TABS, user?.permissions],
  );

  // Auto-correct activeTab if current tab is not accessible
  useEffect(() => {
    if (TABS.length > 0 && !TABS.some((tab) => tab.id === activeTab)) {
      const fallbackTab = TABS[0].id;
      setActiveTab(fallbackTab);
      setVisitedTabs((prev) => ({ ...prev, [fallbackTab]: true }));
    }
  }, [TABS, activeTab]);

  const handleSelectTab = (tab: FinanceTabKey) => {
    if (!TABS.some((t) => t.id === tab)) return;
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
      <AdminNoAccess
        area="Finance & Escrow"
        required={[ADMIN_PERMISSIONS.FINANCE_VIEW]}
        backHref="/admin"
        backLabel="Back to overview"
      />
    );
  }

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
            onNavigateTab={(tab) => handleSelectTab(tab as FinanceTabKey)}
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
        {visitedTabs.refunds && can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_REFUNDS) && (
          <div className={activeTab === 'refunds' ? 'block' : 'hidden'}>
            <RefundsTab />
          </div>
        )}
        {visitedTabs.payouts && can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_PAYOUTS) && (
          <div className={activeTab === 'payouts' ? 'block' : 'hidden'}>
            <PayoutsTab />
          </div>
        )}
        {visitedTabs.accounts && can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_PAYOUTS) && (
          <div className={activeTab === 'accounts' ? 'block' : 'hidden'}>
            <AccountsTab />
          </div>
        )}
        {visitedTabs.ledger && (
          <div className={activeTab === 'ledger' ? 'block' : 'hidden'}>
            <LedgerTab />
          </div>
        )}
        {visitedTabs.reconciliation && can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_RECONCILE) && (
          <div className={activeTab === 'reconciliation' ? 'block' : 'hidden'}>
            <ReconciliationTab />
          </div>
        )}
        {visitedTabs.settings && can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_CONFIG) && (
          <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
            <SettingsTab onRefreshSummary={fetchSummary} />
          </div>
        )}
      </div>
    </div>
  );
}
