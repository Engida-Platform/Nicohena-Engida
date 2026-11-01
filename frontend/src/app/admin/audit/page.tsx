'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  RefreshCw,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminDialog from '../../../components/admin/AdminDialog';
import {
  ADMIN_PERMISSIONS,
  can,
  type AuditLogEntry,
  type PaginatedAuditLogs,
} from '../../../types/admin';

const PAGE_SIZE = 25;

interface AuditFacets {
  entityTypes: string[];
  actions: string[];
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  user: 'User account',
  property: 'Listing',
  listing_review: 'Listing review',
  host_profile: 'Host profile',
  review: 'Guest review',
  report: 'Report',
};

function entityTypeLabel(value: string): string {
  if (ENTITY_TYPE_LABELS[value]) return ENTITY_TYPE_LABELS[value];
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface Filters {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = {
  actorId: '',
  action: '',
  entityType: '',
  entityId: '',
  from: '',
  to: '',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toIsoStart(value: string): string | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

function toIsoEnd(value: string): string | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

function metadataReason(entry: AuditLogEntry): string | null {
  const reason = entry.metadata?.reason;
  return typeof reason === 'string' ? reason : null;
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <p className="text-xs text-[#7a6b5f]">No data recorded.</p>;
  }
  return (
    <pre className="max-h-64 overflow-auto rounded-xl bg-[#2f2722] p-3 text-xs leading-relaxed text-[#ddd4c8]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AdminAuditPage() {
  const { user } = useAuth();
  const canViewAudit = can(user?.permissions, ADMIN_PERMISSIONS.AUDIT_VIEW);

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actionOptions, setActionOptions] = useState<string[]>([]);

  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    if (!canViewAudit) return;
    let cancelled = false;

    apiFetch<AuditFacets>('/admin/audit-logs/facets')
      .then((facets) => {
        if (cancelled) return;
        setEntityTypes(facets.entityTypes || []);
        setActionOptions(facets.actions || []);
      })
      .catch(() => {
        if (!cancelled) {
          setEntityTypes([]);
          setActionOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canViewAudit, refreshTick]);

  useEffect(() => {
    if (!canViewAudit) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (applied.actorId.trim()) params.set('actorId', applied.actorId.trim());
        if (applied.action.trim()) params.set('action', applied.action.trim());
        if (applied.entityType) params.set('entityType', applied.entityType);
        if (applied.entityId.trim()) params.set('entityId', applied.entityId.trim());
        const from = toIsoStart(applied.from);
        const to = toIsoEnd(applied.to);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const data = await apiFetch<PaginatedAuditLogs>(
          `/admin/audit-logs?${params.toString()}`,
        );
        if (cancelled) return;
        setEntries(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (page > data.totalPages) setPage(data.totalPages || 1);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load the audit log');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [canViewAudit, applied, page, refreshTick]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setApplied({ ...draft });
  };

  const setQuickRange = (range: 'today' | '7d' | '30d') => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    let fromStr = toStr;
    if (range === '7d') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      fromStr = d.toISOString().slice(0, 10);
    } else if (range === '30d') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      fromStr = d.toISOString().slice(0, 10);
    }
    const nextFilters = { ...draft, from: fromStr, to: toStr };
    setDraft(nextFilters);
    setApplied(nextFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const hasFilters = Boolean(
    applied.actorId ||
      applied.action ||
      applied.entityType ||
      applied.entityId ||
      applied.from ||
      applied.to,
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Audit log"
        description="Append-only history of privileged actions. Credentials and session tokens are redacted before storage."
        actions={
          <button
            type="button"
            onClick={() => setRefreshTick((tick) => tick + 1)}
            disabled={loading || !canViewAudit}
            className="admin-btn admin-btn-secondary"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.8} />
            Refresh
          </button>
        }
      />

      {!canViewAudit ? (
        <div className="rounded-2xl border border-[#ecd9c2] bg-[#f7ebda] p-6 text-sm text-[#7a531c]">
          Your role does not include permission to view the audit log.
        </div>
      ) : (
        <>
          <form
            onSubmit={applyFilters}
            className="rounded-2xl border border-[#d8d0c8] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(160px,1fr)_140px_minmax(140px,1fr)_minmax(140px,1fr)_minmax(220px,auto)_auto]">
              <div>
                <label htmlFor="audit-action" className="text-xs font-bold text-[#6c5d52]">
                  Action
                </label>
                <input
                  id="audit-action"
                  list="audit-action-options"
                  value={draft.action}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, action: event.target.value }))
                  }
                  placeholder="e.g. user.suspend"
                  className="mt-1 h-10 w-full rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 text-sm text-[#4a3e35] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                />
                <datalist id="audit-action-options">
                  {actionOptions.map((action) => (
                    <option key={action} value={action} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="audit-entity" className="text-xs font-bold text-[#6c5d52]">
                  Entity type
                </label>
                <select
                  id="audit-entity"
                  value={draft.entityType}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, entityType: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 text-sm font-medium text-[#4a3e35] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                >
                  <option value="">All entities</option>
                  {entityTypes.map((type) => (
                    <option key={type} value={type}>
                      {entityTypeLabel(type)}
                    </option>
                  ))}
                  {draft.entityType && !entityTypes.includes(draft.entityType) && (
                    <option value={draft.entityType}>
                      {entityTypeLabel(draft.entityType)}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="audit-entity-id" className="text-xs font-bold text-[#6c5d52]">
                  Entity ID
                </label>
                <input
                  id="audit-entity-id"
                  value={draft.entityId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, entityId: event.target.value }))
                  }
                  placeholder="UUID or reference"
                  className="mt-1 h-10 w-full rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 text-sm text-[#4a3e35] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                />
              </div>

              <div>
                <label htmlFor="audit-actor-id" className="text-xs font-bold text-[#6c5d52]">
                  Actor ID
                </label>
                <input
                  id="audit-actor-id"
                  value={draft.actorId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, actorId: event.target.value }))
                  }
                  placeholder="User UUID"
                  className="mt-1 h-10 w-full rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-3 text-sm text-[#4a3e35] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="audit-from" className="flex items-center gap-1.5 text-xs font-bold text-[#6c5d52]">
                    <CalendarRange className="h-3.5 w-3.5 text-[#b3541e]" />
                    Date range
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickRange('today')}
                      className="rounded-full border border-[#d8d0c8] bg-[#f6f0e8] px-2 py-0.5 text-[10px] font-semibold text-[#6c5d52] hover:border-[#b3541e] hover:text-[#b3541e] cursor-pointer transition"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickRange('7d')}
                      className="rounded-full border border-[#d8d0c8] bg-[#f6f0e8] px-2 py-0.5 text-[10px] font-semibold text-[#6c5d52] hover:border-[#b3541e] hover:text-[#b3541e] cursor-pointer transition"
                    >
                      7d
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickRange('30d')}
                      className="rounded-full border border-[#d8d0c8] bg-[#f6f0e8] px-2 py-0.5 text-[10px] font-semibold text-[#6c5d52] hover:border-[#b3541e] hover:text-[#b3541e] cursor-pointer transition"
                    >
                      30d
                    </button>
                  </div>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    id="audit-from"
                    type="date"
                    value={draft.from}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, from: event.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-2.5 text-xs text-[#4a3e35] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                  />
                  <input
                    id="audit-to"
                    type="date"
                    value={draft.to}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, to: event.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] px-2.5 text-xs text-[#4a3e35] outline-none focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/15"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2 md:col-span-2 lg:col-span-1">
                <button
                  type="submit"
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#b3541e] px-3 text-sm font-semibold text-white hover:bg-[#934313]"
                >
                  <Filter className="h-4 w-4" />
                  Apply
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={
                    !hasFilters &&
                    !draft.actorId &&
                    !draft.action &&
                    !draft.entityType &&
                    !draft.entityId &&
                    !draft.from &&
                    !draft.to
                  }
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d8d0c8] bg-white px-3 text-sm font-semibold text-[#6c5d52] hover:bg-[#f6f0e8] disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#ecd0c9] bg-[#f8e9e5] p-4 text-sm text-[#8f4035]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Could not load the audit log</p>
                <p className="mt-0.5 text-[#a24b3e]">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setRefreshTick((tick) => tick + 1)}
                className="rounded-lg border border-[#ecd0c9] bg-white px-3 py-1.5 text-xs font-bold text-[#8f4035] hover:bg-[#f3dcd6]"
              >
                Retry
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-[#d8d0c8] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#d8d0c8]">
                <thead className="bg-[#f6f0e8]">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f]">
                      When
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f]">
                      Actor
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f]">
                      Action
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f]">
                      Entity
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f]">
                      Context
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a6b5f]">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece4d9]">
                  {loading && entries.length === 0
                    ? Array.from({ length: 7 }).map((_, index) => (
                        <tr key={index}>
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 animate-pulse rounded-lg bg-[#efe7dc]" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-1/3 animate-pulse rounded bg-[#efe7dc]" />
                                <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#efe7dc]" />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    : entries.map((entry) => {
                        const reason = metadataReason(entry);
                        return (
                          <tr key={entry.id} className="hover:bg-[#f6f0e8]/70">
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-[#7a6b5f]">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5 text-[#7a6b5f]" />
                                {formatDateTime(entry.createdAt)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-xs font-semibold text-[#4a3e35]">
                                {entry.actorEmail || 'System'}
                              </p>
                              <p className="mt-0.5 text-xs text-[#7a6b5f]">
                                {entry.actorRole || 'automated'}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#b3541e]/5 px-2.5 py-1 font-mono text-xs font-semibold text-[#9f4a19]">
                                <ShieldCheck className="h-3 w-3" />
                                {entry.action}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-xs font-semibold text-[#5a4c42]">
                                {entry.entityType}
                              </p>
                              {entry.entityId && (
                                <p className="mt-0.5 max-w-[180px] truncate font-mono text-[11px] text-[#7a6b5f]">
                                  {entry.entityId}
                                </p>
                              )}
                            </td>
                            <td className="max-w-[260px] px-5 py-4">
                              {reason ? (
                                <p className="truncate text-xs text-[#6c5d52]" title={reason}>
                                  {reason}
                                </p>
                              ) : (
                                <span className="text-xs text-[#7a6b5f]">—</span>
                              )}
                              {entry.ipAddress && (
                                <p className="mt-0.5 font-mono text-[11px] text-[#7a6b5f]">
                                  {entry.ipAddress}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelected(entry)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-[#b3541e] hover:bg-[#b3541e]/5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            {!loading && entries.length === 0 && !error && (
              <div className="px-6 py-14 text-center">
                <ScrollText className="mx-auto h-10 w-10 text-[#c2b6aa]" />
                <h2 className="mt-3 font-headline text-xl font-semibold tracking-[-0.01em] text-[#3a302a]">No audit entries</h2>
                <p className="mt-1 text-sm text-[#7a6b5f]">
                  {hasFilters
                    ? 'No entries match these filters.'
                    : 'Privileged actions will be recorded here as your team works.'}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-xl border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#5a4c42] hover:bg-[#f6f0e8]"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-[#d8d0c8] bg-[#f6f0e8]/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-[#7a6b5f]">
                {total === 0 ? (
                  'No audit entries to display'
                ) : (
                  <>
                    Page {page} of {totalPages} · {total.toLocaleString()} entr
                    {total === 1 ? 'y' : 'ies'}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8d0c8] bg-white px-2.5 text-xs font-bold text-[#6c5d52] hover:bg-[#f6f0e8] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8d0c8] bg-white px-2.5 text-xs font-bold text-[#6c5d52] hover:bg-[#f6f0e8] disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <AdminDialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Audit entry"
        description={
          selected
            ? `${formatDateTime(selected.createdAt)} · ${selected.action}`
            : undefined
        }
        width="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#7a6b5f]">
                  Actor
                </p>
                <p className="mt-1 text-sm font-semibold text-[#4a3e35]">
                  {selected.actorEmail || 'System'}
                </p>
                <p className="text-xs text-[#7a6b5f]">{selected.actorRole || 'automated'}</p>
                {selected.actorId && (
                  <p className="mt-1 truncate font-mono text-[11px] text-[#7a6b5f]">
                    {selected.actorId}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#7a6b5f]">
                  Entity
                </p>
                <p className="mt-1 text-sm font-semibold text-[#4a3e35]">
                  {selected.entityType}
                </p>
                {selected.entityId && (
                  <p className="mt-1 truncate font-mono text-[11px] text-[#7a6b5f]">
                    {selected.entityId}
                  </p>
                )}
                {selected.ipAddress && (
                  <p className="mt-1 font-mono text-[11px] text-[#7a6b5f]">
                    IP {selected.ipAddress}
                  </p>
                )}
              </div>
            </div>

            {metadataReason(selected) && (
              <div>
                <p className="text-xs font-bold text-[#5a4c42]">Reason</p>
                <p className="mt-1.5 rounded-xl border border-[#d8d0c8] bg-white p-3 text-sm text-[#5a4c42]">
                  {metadataReason(selected)}
                </p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-bold text-[#5a4c42]">Before</p>
                <JsonBlock value={selected.beforeState} />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-bold text-[#5a4c42]">After</p>
                <JsonBlock value={selected.afterState} />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold text-[#5a4c42]">Metadata</p>
              <JsonBlock value={selected.metadata} />
            </div>

            {selected.userAgent && (
              <div>
                <p className="mb-1.5 text-xs font-bold text-[#5a4c42]">User agent</p>
                <p className="break-all rounded-xl border border-[#d8d0c8] bg-[#f6f0e8] p-3 font-mono text-[11px] text-[#7a6b5f]">
                  {selected.userAgent}
                </p>
              </div>
            )}
          </div>
        )}
      </AdminDialog>
    </div>
  );
}
