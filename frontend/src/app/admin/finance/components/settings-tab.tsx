'use client';

import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ZapOff,
  ShieldAlert,
  Info,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import { formatMinor } from '../../../../lib/finance-format';
import type { FinanceSettingItem } from '../../../../types/admin-finance';
import AdminDialog from '../../../../components/admin/AdminDialog';
import { useAuth } from '@/context/AuthContext';
import { can, ADMIN_PERMISSIONS } from '@/types/admin';

function formatBps(value: string | undefined): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${(numeric / 100).toFixed(2)}%`;
}

export default function SettingsTab({ onRefreshSummary }: { onRefreshSummary: () => void }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FinanceSettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmToggleKey, setConfirmToggleKey] = useState<string | null>(null);

  const canConfigure = can(user?.permissions, ADMIN_PERMISSIONS.FINANCE_CONFIG);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<FinanceSettingItem[]>('/admin/finance/settings');
      setSettings(res || []);
      const valMap: Record<string, string> = {};
      (res || []).forEach((s) => {
        valMap[s.key] = s.value;
      });
      // Synchronize canonical and alias platform commission
      const comm = valMap['finance.commission_rate_bps'] || valMap['finance.platform_commission_bps'] || '';
      valMap['finance.commission_rate_bps'] = comm;
      valMap['finance.platform_commission_bps'] = comm;
      setValues(valMap);
    } catch (err: any) {
      setSettings([]);
      setError(err.message || 'Failed to load finance settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSetting = async (key: string, value: string, auditReason?: string) => {
    if (!canConfigure) return;

    // Validate basis point keys
    if (key.endsWith('_bps')) {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 10000) {
        alert('Basis points must be a valid integer between 0 and 10000 (0% to 100%).');
        return;
      }
    }

    setSavingKey(key);
    setError(null);
    setSuccessMsg(null);

    try {
      await apiFetch(`/admin/finance/settings/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({
          value,
          reason: auditReason || `Updated by admin ${user?.email || user?.id || 'console'}`,
        }),
      });

      setValues((prev) => {
        const next = { ...prev, [key]: value };
        if (key === 'finance.commission_rate_bps') next['finance.platform_commission_bps'] = value;
        if (key === 'finance.platform_commission_bps') next['finance.commission_rate_bps'] = value;
        return next;
      });

      setSuccessMsg(`Setting ${key} updated successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      onRefreshSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleFlag = (key: string) => {
    if (!canConfigure) return;
    const current = values[key] === 'true';
    if (!current) {
      // Enabling live money flag requires confirmation
      setConfirmToggleKey(key);
    } else {
      handleSaveSetting(key, 'false', 'Disabled live money flag via console');
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-[#fdf2f2] border border-[#f5c6cb] rounded-2xl flex items-center justify-between text-xs text-[#a83232]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchSettings}
            className="px-3 py-1 bg-white border border-[#f5c6cb] rounded-xl font-bold hover:bg-[#fbf0f0] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success Banner */}
      {successMsg && (
        <div className="p-4 bg-[#edf1e8] border border-[#d6dfcd] rounded-2xl flex items-center gap-2 text-xs text-[#536b4a] font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {!canConfigure && (
        <div className="p-3 bg-[#faf5ee] border border-[#d8d0c8] rounded-xl text-xs text-[#73776f] flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0 text-[#b3541e]" />
          <span>Read-only: You need <code>FINANCE_CONFIG</code> permissions to modify system finance parameters.</span>
        </div>
      )}

      {/* Live Feature Flags Section */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="border-b border-[#f2ece4] pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#3a302a]">
              Payment Provider Hard Gates & Feature Flags
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f8e9e5] text-[#9a3f33] border border-[#ebd0c9]">
              Gate P3-00
            </span>
          </div>
          <p className="text-xs text-[#73776f] mt-0.5">
            Real money movements default to FALSE for security. Enabling any flag activates real external API transfers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              key: 'finance.live_capture_enabled',
              title: 'Live Guest Payment Capture',
              desc: 'When enabled, real Chapa / Telebirr gateway charges are initiated. When disabled, uses sandbox mock capture.',
            },
            {
              key: 'finance.live_refunds_enabled',
              title: 'Live Refund Provider Calls',
              desc: 'When enabled, approved refunds call real provider reversal endpoints. When disabled, simulated.',
            },
            {
              key: 'finance.live_payouts_enabled',
              title: 'Live Host Payout Transfers',
              desc: 'When enabled, approved payout batches dispatch real bank / mobile money API transfer instructions.',
            },
            {
              key: 'finance.auto_release_enabled',
              title: 'Automated Escrow Release Job',
              desc: values['finance.escrow_release_delay_hours']
                ? `When enabled, the single-runner cron releases escrow holds using the "${values['finance.escrow_release_trigger'] || 'configured'}" trigger plus ${values['finance.escrow_release_delay_hours']} hours.`
                : 'When enabled, the single-runner cron releases escrow holds according to the configured trigger and delay.',
            },
          ].map((flag) => {
            const isEnabled = values[flag.key] === 'true';
            return (
              <div
                key={flag.key}
                className={`p-4 rounded-xl border transition-all ${
                  isEnabled
                    ? 'bg-[#edf1e8]/60 border-[#d6dfcd]'
                    : 'bg-[#faf5ee] border-[#d8d0c8]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-xs text-[#3a302a]">{flag.title}</h3>
                    <p className="text-[11px] text-[#73776f] mt-1 leading-relaxed">
                      {flag.desc}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleFlag(flag.key)}
                    disabled={!canConfigure || savingKey === flag.key}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isEnabled
                        ? 'bg-[#536b4a] text-white hover:bg-[#3c4f35]'
                        : 'bg-white border border-[#d8d0c8] text-[#3a302a] hover:bg-[#faf5ee]'
                    }`}
                  >
                    {savingKey === flag.key
                      ? 'Saving…'
                      : isEnabled
                      ? 'ENABLED'
                      : 'DISABLED'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational Rates and Dual Approval Thresholds */}
      <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="border-b border-[#f2ece4] pb-3">
          <h2 className="text-base font-bold text-[#3a302a]">
            Financial Basis Points & Dual-Approval Rules
          </h2>
          <p className="text-xs text-[#73776f] mt-0.5">
            Configure platform commission, tax rates, and thresholds for four-eyes authorization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-[#3a302a] mb-1">
              Platform Commission Rate (Basis Points)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                disabled={!canConfigure}
                value={values['finance.platform_commission_bps'] ?? ''}
                onChange={(e) =>
                  setValues({ ...values, 'finance.platform_commission_bps': e.target.value })
                }
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-2 text-[#3a302a] font-mono disabled:opacity-60"
              />
              <button
                disabled={!canConfigure || savingKey === 'finance.platform_commission_bps'}
                onClick={() =>
                  handleSaveSetting(
                    'finance.platform_commission_bps',
                    values['finance.platform_commission_bps'],
                  )
                }
                className="px-3 py-2 bg-[#b3541e] text-white rounded-xl font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
            <span className="text-[10px] text-[#73776f]">
              {values['finance.platform_commission_bps']
                ? `${values['finance.platform_commission_bps']} bps = ${formatBps(
                    values['finance.platform_commission_bps'],
                  )} commission on room booking total`
                : 'No commission rate is configured yet.'}
            </span>
          </div>

          <div>
            <label className="block font-bold text-[#3a302a] mb-1">
              VAT Rate (Basis Points)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                disabled={!canConfigure}
                value={values['finance.vat_rate_bps'] ?? ''}
                onChange={(e) =>
                  setValues({ ...values, 'finance.vat_rate_bps': e.target.value })
                }
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-2 text-[#3a302a] font-mono disabled:opacity-60"
              />
              <button
                disabled={!canConfigure || savingKey === 'finance.vat_rate_bps'}
                onClick={() =>
                  handleSaveSetting('finance.vat_rate_bps', values['finance.vat_rate_bps'])
                }
                className="px-3 py-2 bg-[#b3541e] text-white rounded-xl font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
            <span className="text-[10px] text-[#73776f]">
              {values['finance.vat_rate_bps']
                ? `${values['finance.vat_rate_bps']} bps = ${formatBps(
                    values['finance.vat_rate_bps'],
                  )} VAT applied to commission`
                : 'No VAT rate is configured yet.'}
            </span>
          </div>

          <div>
            <label className="block font-bold text-[#3a302a] mb-1">
              Refund Dual-Approval Threshold (Minor Units)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                disabled={!canConfigure}
                value={values['finance.refund_dual_approval_threshold_minor'] ?? ''}
                onChange={(e) =>
                  setValues({
                    ...values,
                    'finance.refund_dual_approval_threshold_minor': e.target.value,
                  })
                }
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-2 text-[#3a302a] font-mono disabled:opacity-60"
              />
              <button
                disabled={!canConfigure || savingKey === 'finance.refund_dual_approval_threshold_minor'}
                onClick={() =>
                  handleSaveSetting(
                    'finance.refund_dual_approval_threshold_minor',
                    values['finance.refund_dual_approval_threshold_minor'],
                  )
                }
                className="px-3 py-2 bg-[#b3541e] text-white rounded-xl font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
            <span className="text-[10px] text-[#73776f]">
              {values['finance.refund_dual_approval_threshold_minor']
                ? `${Number(
                    values['finance.refund_dual_approval_threshold_minor'],
                  ).toLocaleString('en-US')} minor = ${formatMinor(
                    values['finance.refund_dual_approval_threshold_minor'],
                    'ETB',
                  )}. Amounts >= this require dual approval.`
                : 'No refund dual-approval threshold is configured yet.'}
            </span>
          </div>

          <div>
            <label className="block font-bold text-[#3a302a] mb-1">
              Payout Dual-Approval Threshold (Minor Units)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                disabled={!canConfigure}
                value={values['finance.payout_dual_approval_threshold_minor'] ?? ''}
                onChange={(e) =>
                  setValues({
                    ...values,
                    'finance.payout_dual_approval_threshold_minor': e.target.value,
                  })
                }
                className="w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-xl px-3 py-2 text-[#3a302a] font-mono disabled:opacity-60"
              />
              <button
                disabled={!canConfigure || savingKey === 'finance.payout_dual_approval_threshold_minor'}
                onClick={() =>
                  handleSaveSetting(
                    'finance.payout_dual_approval_threshold_minor',
                    values['finance.payout_dual_approval_threshold_minor'],
                  )
                }
                className="px-3 py-2 bg-[#b3541e] text-white rounded-xl font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
            <span className="text-[10px] text-[#73776f]">
              {values['finance.payout_dual_approval_threshold_minor']
                ? `${Number(
                    values['finance.payout_dual_approval_threshold_minor'],
                  ).toLocaleString('en-US')} minor = ${formatMinor(
                    values['finance.payout_dual_approval_threshold_minor'],
                    'ETB',
                  )}. Payouts >= this require dual approval.`
                : 'No payout dual-approval threshold is configured yet.'}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Live Feature Flag */}
      {confirmToggleKey && (
        <AdminDialog
          open={!!confirmToggleKey}
          onClose={() => setConfirmToggleKey(null)}
          title="Enable Live Money Movement"
          description="Enabling this flag will connect real external payment gateway endpoints and initiate real bank transfers."
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-600" />
              <p className="leading-relaxed">
                Confirming will switch flag <strong>{confirmToggleKey}</strong> to TRUE. Real customer accounts or host bank destinations will be debited or credited.
              </p>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#d8d0c8]">
              <button
                type="button"
                onClick={() => setConfirmToggleKey(null)}
                className="px-4 py-2 border border-[#d8d0c8] text-[#3a302a] font-bold rounded-xl hover:bg-[#faf5ee] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const key = confirmToggleKey;
                  setConfirmToggleKey(null);
                  handleSaveSetting(key, 'true');
                }}
                className="px-4 py-2 bg-[#9a3f33] hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                I Confirm & Enable Live Mode
              </button>
            </div>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
