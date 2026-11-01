'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CreditCard,
  Globe2,
  Info,
  Lock,
  RefreshCw,
  Save,
  ShieldAlert,
  Sliders,
  Undo2,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { useAuth } from '../../../context/AuthContext';
import { can, ADMIN_PERMISSIONS } from '../../../types/admin';
import {
  FormattedSetting,
  SettingCategory,
  SettingsResponse,
} from '../../../types/admin-system';

interface TabConfig {
  id: SettingCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'GENERAL',
    label: 'General & Maintenance',
    icon: Sliders,
    description: 'Platform operational status, maintenance mode, and broadcast banners.',
  },
  {
    id: 'BOOKINGS',
    label: 'Booking Rules',
    icon: Calendar,
    description: 'Check-in/out hours, lead time policies, and advance calendar limits.',
  },
  {
    id: 'FINANCE',
    label: 'Financial & Escrow',
    icon: CreditCard,
    description: 'Marketplace take-rate commissions, VAT/tax parameters, and payout cutoffs.',
  },
  {
    id: 'LOCALIZATION',
    label: 'Regional & Currencies',
    icon: Globe2,
    description: 'Default Ethiopian Birr standards, multi-currency support, and Addis Ababa timezone.',
  },
  {
    id: 'NOTIFICATIONS',
    label: 'Communications',
    icon: Bell,
    description: 'Transactional SMS channels, email receipt relays, and support addresses.',
  },
  {
    id: 'SECURITY',
    label: 'Security & Access',
    icon: Lock,
    description: 'Administrative session timeouts, login backoff thresholds, and audit rules.',
  },
];

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const canView = can(user?.permissions, ADMIN_PERMISSIONS.SETTINGS_VIEW);
  const canManage = can(user?.permissions, ADMIN_PERMISSIONS.SETTINGS_MANAGE);

  const [activeTab, setActiveTab] = useState<SettingCategory>('GENERAL');
  const [settings, setSettings] = useState<FormattedSetting[]>([]);
  const [grouped, setGrouped] = useState<Record<SettingCategory, FormattedSetting[]> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<SettingsResponse>('/admin/settings');
      setSettings(res.settings || []);
      setGrouped(res.grouped || ({} as Record<SettingCategory, FormattedSetting[]>));

      const map: Record<string, any> = {};
      for (const s of res.settings || []) {
        map[s.key] = s.value;
      }
      setFormValues(map);
      setInitialValues(map);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch platform configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [fetchSettings, canView]);

  const handleFieldChange = (key: string, value: any) => {
    if (!canManage) return;
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSuccessMessage(null);
  };

  const hasDirtyChanges = Object.keys(formValues).some(
    (key) => formValues[key] !== initialValues[key],
  );

  const handleDiscard = () => {
    setFormValues(initialValues);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Compute dirty diff
    const updates: Record<string, any> = {};
    for (const key of Object.keys(formValues)) {
      if (formValues[key] !== initialValues[key]) {
        let val = formValues[key];
        // If number field was cleared, use 0
        if (val === '') {
          val = 0;
        }
        updates[key] = val;
      }
    }

    if (Object.keys(updates).length === 0) {
      setSaving(false);
      return;
    }

    try {
      const res = await apiFetch<{ success: boolean; updatedCount: number }>(
        '/admin/settings',
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        },
      );

      setSuccessMessage(
        `Successfully updated ${res.updatedCount} ${res.updatedCount === 1 ? 'parameter' : 'parameters'}.`,
      );
      setInitialValues({ ...formValues });
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save configuration settings');
    } finally {
      setSaving(false);
    }
  };

  const isMaintenanceActive = Boolean(formValues['maintenance.enabled']);

  if (!canView) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#d8d0c8] max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-[#f8e9e5] text-[#9a3f33] flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-lg font-bold text-[#3a302a]">
          Settings Access Required
        </h2>
        <p className="text-xs text-[#73776f] mt-1">
          Your administrator role does not have the <code className="font-mono">settings.view</code> permission.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <AdminPageHeader
        title="Platform Settings & Rules"
        description="Centralized platform configuration, global booking rules, financial commission take-rates, and system parameters."
        actions={
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#d8d0c8] bg-white text-[#605850] shadow-sm transition hover:bg-[#eae2da] hover:text-[#3a302a]"
            title="Reload settings"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#b3541e]' : ''}`} />
          </button>
        }
      />

      {/* Read-Only Notice for Non-Manage Roles */}
      {!canManage && (
        <div className="flex items-center gap-3 p-3.5 bg-[#f6f0e8] border border-[#d8d0c8] rounded-xl text-xs text-[#605850]">
          <Info className="w-4 h-4 text-[#b3541e] shrink-0" />
          <span>
            <strong>Viewing Mode:</strong> You have read-only access (<code className="font-mono">settings.view</code>). Modifying system parameters requires the <code className="font-mono">settings.manage</code> permission.
          </span>
        </div>
      )}

      {/* Maintenance Mode Emergency Alert Banner */}
      {isMaintenanceActive && (
        <div className="flex items-start gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-xs">
            <p className="font-bold">Marketplace Maintenance Flag is Active</p>
            <p className="mt-0.5 text-amber-800">
              Operational maintenance advisory is set. Platform services remain operational while infrastructure checks are performed.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#d47070] bg-[#fdf2f2] p-4 text-xs font-semibold text-[#8c3c3c]">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <Check className="h-4 w-4 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#d8d0c8] pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 ${
                active
                  ? 'bg-[#b3541e] text-white shadow-sm'
                  : 'text-[#605850] hover:bg-[#eae2da] hover:text-[#3a302a]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Category Section Description */}
      <div className="rounded-xl border border-[#d8d0c8] bg-white p-4">
        <p className="text-xs text-[#78706a]">
          {TABS.find((t) => t.id === activeTab)?.description}
        </p>
      </div>

      {/* Informational Callout for Finance */}
      {activeTab === 'FINANCE' && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Treasury & Settlement Source of Truth</p>
            <p className="mt-0.5 text-amber-800/90 leading-relaxed">
              Live marketplace take-rates (commission), withholding tax rules, and daily disbursement cutoff hours are enforced directly by the ledger engine in the{' '}
              <a href="/admin/finance" className="underline font-bold text-[#b3541e]">
                Treasury & Finance Operations Console
              </a>
              . Settings configured here serve as baseline platform fallbacks.
            </p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && settings.length === 0 && (
        <div className="divide-y divide-[#f2ece4] rounded-2xl border border-[#d8d0c8] bg-white">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-6 flex items-center justify-between animate-pulse">
              <div className="space-y-2 w-1/2">
                <div className="h-4 w-1/3 bg-[#f2ece4] rounded" />
                <div className="h-3 w-2/3 bg-[#f2ece4] rounded" />
              </div>
              <div className="h-8 w-40 bg-[#f2ece4] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Form Fields for Active Category */}
      {!loading && (
        <div className="divide-y divide-[#f2ece4] rounded-2xl border border-[#d8d0c8] bg-white shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
          {grouped && grouped[activeTab] && grouped[activeTab].length > 0 ? (
            grouped[activeTab].map((setting) => {
              const currentVal = formValues[setting.key];
              return (
                <div
                  key={setting.key}
                  className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-headline text-base font-semibold text-[#3a302a]">
                        {setting.key.split('.').slice(1).join(' ').replace(/_/g, ' ')}
                      </span>
                      {setting.isPublic && (
                        <span className="rounded-md bg-[#f6f0e8] px-1.5 py-0.5 text-[10px] font-bold text-[#b3541e]">
                          Public
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#78706a]">
                      {setting.description || 'Configurable operational threshold.'}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-[#9a9088]">{setting.key}</p>
                  </div>

                  <div className="w-full sm:w-80">
                    {/* Boolean Switch Toggle */}
                    {setting.type === 'boolean' ? (
                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => handleFieldChange(setting.key, !currentVal)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                          currentVal ? 'bg-[#b3541e]' : 'bg-[#d8d0c8]'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                            currentVal ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    ) : setting.type === 'number' ? (
                      <input
                        type="number"
                        disabled={!canManage}
                        value={currentVal !== undefined ? currentVal : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange(setting.key, val === '' ? '' : Number(val));
                        }}
                        className="w-full rounded-xl border border-[#d8d0c8] bg-[#faf5ee] px-3.5 py-2 text-xs font-semibold text-[#3a302a] focus:border-[#b3541e] focus:bg-white focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    ) : setting.key.includes('message') ? (
                      <textarea
                        rows={2}
                        disabled={!canManage}
                        value={currentVal || ''}
                        onChange={(e) => handleFieldChange(setting.key, e.target.value)}
                        className="w-full rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-xs text-[#3a302a] focus:border-[#b3541e] focus:bg-white focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    ) : (
                      <input
                        type="text"
                        disabled={!canManage}
                        value={
                          typeof currentVal === 'object'
                            ? JSON.stringify(currentVal)
                            : currentVal || ''
                        }
                        onChange={(e) => handleFieldChange(setting.key, e.target.value)}
                        className="w-full rounded-xl border border-[#d8d0c8] bg-[#faf5ee] px-3.5 py-2 text-xs font-semibold text-[#3a302a] focus:border-[#b3541e] focus:bg-white focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[#78706a]">
              No parameters registered in this category.
            </div>
          )}
        </div>
      )}

      {/* Sticky Bottom Unsaved Changes Floating Bar */}
      {canManage && hasDirtyChanges && (
        <div className="fixed bottom-6 left-1/2 z-50 flex w-[92vw] max-w-2xl -translate-x-1/2 items-center justify-between rounded-2xl border border-[#b3541e]/50 bg-[#3a302a] p-4 text-[#faf5ee] shadow-[0_20px_60px_-20px_rgba(58,48,42,0.8)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#b3541e] text-white">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold">Unsaved Configuration Changes</p>
              <p className="text-[11px] text-[#d8d0c8]">
                Changes will take effect platform-wide upon saving.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#78706a] px-3.5 py-2 text-xs font-semibold text-[#d8d0c8] transition hover:bg-white/10 hover:text-white"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#b3541e] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#c2652a] disabled:opacity-60 font-semibold"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
