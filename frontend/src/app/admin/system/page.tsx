'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Lock,
  Play,
  RefreshCw,
  Zap,
  Info,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { useAuth } from '../../../context/AuthContext';
import { can, ADMIN_PERMISSIONS } from '../../../types/admin';
import {
  GatewayStatus,
  ScheduledJobInfo,
  SystemHealthOverview,
} from '../../../types/admin-system';

export default function AdminSystemPage() {
  const { user } = useAuth();
  const canView = can(user?.permissions, ADMIN_PERMISSIONS.SYSTEM_VIEW);
  const canManage = can(user?.permissions, ADMIN_PERMISSIONS.SYSTEM_MANAGE);

  const [data, setData] = useState<SystemHealthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<SystemHealthOverview>('/admin/system/health');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch system diagnostic metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) {
      fetchHealth();
    } else {
      setLoading(false);
    }
  }, [fetchHealth, canView]);

  const handleTriggerJob = async (jobName: string) => {
    if (!canManage) return;
    setTriggeringJob(jobName);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await apiFetch<any>(`/admin/system/jobs/${jobName}/run`, {
        method: 'POST',
      });
      setActionSuccess(`Job "${jobName}" executed successfully (status: ${res.status}).`);
      await fetchHealth();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.message || `Failed to execute background job "${jobName}"`);
    } finally {
      setTriggeringJob(null);
    }
  };

  if (!canView) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#d8d0c8] max-w-md mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-[#f8e9e5] text-[#9a3f33] flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-lg font-bold text-[#3a302a]">
          System Access Required
        </h2>
        <p className="text-xs text-[#73776f] mt-1">
          Your administrator role does not have the <code className="font-mono">system.view</code> permission.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <AdminPageHeader
        title="Platform Monitoring & System Administration"
        description="Real-time operational health, PostgreSQL database connection latency, background cron job registry, and external gateway statuses."
        actions={
          <button
            type="button"
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#d8d0c8] bg-white text-[#605850] shadow-sm transition hover:bg-[#eae2da] hover:text-[#3a302a]"
            title="Refresh diagnostics"
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
            <strong>Viewing Mode:</strong> You have read-only diagnostic access (<code className="font-mono">system.view</code>). Triggering ad-hoc jobs requires <code className="font-mono">system.manage</code> permission.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[#d47070] bg-[#fdf2f2] p-4 text-xs font-semibold text-[#8c3c3c]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-6">
          <div className="h-24 bg-white border border-[#d8d0c8] rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-56 bg-white border border-[#d8d0c8] rounded-2xl animate-pulse" />
            <div className="h-56 bg-white border border-[#d8d0c8] rounded-2xl animate-pulse" />
          </div>
          <div className="h-64 bg-white border border-[#d8d0c8] rounded-2xl animate-pulse" />
        </div>
      )}

      {data && (
        <>
          {/* Global Status Banner */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="relative flex h-5 w-5">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    data.overallStatus === 'OPERATIONAL'
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex h-5 w-5 rounded-full ${
                    data.overallStatus === 'OPERATIONAL'
                      ? 'bg-emerald-600'
                      : 'bg-amber-600'
                  }`}
                />
              </span>
              <div>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-[#3a302a]">
                  {data.overallStatus === 'OPERATIONAL'
                    ? 'All Systems Fully Operational'
                    : 'System Diagnostics: Advisory Status'}
                </h2>
                <p className="text-xs text-[#78706a]">
                  Diagnostic snapshot at {new Date(data.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-lg bg-[#f6f0e8] px-3 py-1.5 text-[#b3541e]">
                DB Latency: {data.database.pingMs ?? 0} ms
              </span>
              <span className="rounded-lg bg-[#f6f0e8] px-3 py-1.5 text-[#605850]">
                Uptime: {data.runtime.uptimeFormatted ?? '—'}
              </span>
            </div>
          </div>

          {/* Database & Runtime Diagnostics Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* PostgreSQL Database Health */}
            <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6f0e8] text-[#b3541e]">
                    <Database className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-headline text-lg font-semibold text-[#3a302a]">
                      PostgreSQL Data Store
                    </h3>
                    <p className="text-xs text-[#78706a]">
                      Database: {data.database.databaseName || 'engida_db'}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    data.database.status === 'HEALTHY'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {data.database.status || 'CHECKING'}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                  <p className="text-[11px] font-bold text-[#78706a]">Total Users</p>
                  <p className="mt-1 font-headline text-2xl font-bold text-[#3a302a]">
                    {data.database.tableCounts.users ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                  <p className="text-[11px] font-bold text-[#78706a]">Properties</p>
                  <p className="mt-1 font-headline text-2xl font-bold text-[#3a302a]">
                    {data.database.tableCounts.properties ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                  <p className="text-[11px] font-bold text-[#78706a]">Bookings</p>
                  <p className="mt-1 font-headline text-2xl font-bold text-[#3a302a]">
                    {data.database.tableCounts.bookings ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                  <p className="text-[11px] font-bold text-[#78706a]">Ledger Entries</p>
                  <p className="mt-1 font-headline text-2xl font-bold text-[#b3541e]">
                    {data.database.tableCounts.ledgerEntries ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                  <p className="text-[11px] font-bold text-[#78706a]">Audit Logs</p>
                  <p className="mt-1 font-headline text-2xl font-bold text-[#3a302a]">
                    {data.database.tableCounts.auditLogs ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Node.js / NestJS Runtime Environment */}
            <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6f0e8] text-[#b3541e]">
                    <Cpu className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-headline text-lg font-semibold text-[#3a302a]">
                      Runtime Infrastructure
                    </h3>
                    <p className="text-xs text-[#78706a]">
                      Node.js: {data.runtime.nodeVersion} • Env: {data.runtime.environment}
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  {data.runtime.status}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                  <p className="text-[11px] font-bold text-[#78706a]">Memory RSS</p>
                  <p className="mt-1 font-headline text-xl font-bold text-[#3a302a]">
                    {data.runtime.memory.rssMb} MB
                  </p>
                </div>
                <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                  <p className="text-[11px] font-bold text-[#78706a]">Heap Used</p>
                  <p className="mt-1 font-headline text-xl font-bold text-[#b3541e]">
                    {data.runtime.memory.heapUsedMb} MB
                  </p>
                </div>
                <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                  <p className="text-[11px] font-bold text-[#78706a]">Heap Total</p>
                  <p className="mt-1 font-headline text-xl font-bold text-[#3a302a]">
                    {data.runtime.memory.heapTotalMb} MB
                  </p>
                </div>
                <div className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-center">
                  <p className="text-[11px] font-bold text-[#78706a]">OS Platform</p>
                  <p className="mt-1 font-headline text-xl font-bold text-[#3a302a] uppercase">
                    {data.runtime.platform}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduled Background Jobs Registry */}
          <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="font-headline text-xl font-semibold text-[#3a302a]">
                  Scheduled Background Jobs & Automation
                </h3>
                <p className="text-xs text-[#78706a]">
                  Automated financial clearing, double-entry invariant verification, and SLA ticket escalators
                </p>
              </div>
              <Clock className="h-5 w-5 text-[#b3541e]" />
            </div>

            <div className="divide-y divide-[#f2ece4]">
              {data.jobs.map((job) => (
                <div
                  key={job.name}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-headline text-base font-semibold text-[#3a302a]">
                        {job.name}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          job.lastStatus === 'SUCCEEDED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.lastStatus === 'RUNNING'
                              ? 'bg-amber-100 text-amber-800'
                              : job.lastStatus === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {job.lastStatus}
                      </span>
                      {job.lastDurationMs != null && (
                        <span className="text-[10px] text-[#73776f]">
                          ({job.lastDurationMs} ms)
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#78706a]">{job.description}</p>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-[#9a9088]">
                      <span>Cadence: {job.schedule}</span>
                      <span>•</span>
                      <span>
                        Last Run:{' '}
                        {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}
                      </span>
                    </div>

                    {/* Job Details if available */}
                    {job.details && Object.keys(job.details).length > 0 && (
                      <div className="mt-2 p-2 bg-[#faf5ee] border border-[#d8d0c8]/60 rounded-lg text-[11px] font-mono text-[#605850]">
                        {Object.entries(job.details).map(([k, v]) => (
                          <span key={k} className="mr-3 inline-block">
                            <strong className="text-[#3a302a]">{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTriggerJob(job.name)}
                    disabled={!canManage || triggeringJob === job.name || job.canTrigger === false}
                    className="inline-flex items-center gap-2 self-start rounded-xl border border-[#d8d0c8] bg-[#faf5ee] px-3.5 py-2 text-xs font-bold text-[#3a302a] shadow-sm transition hover:bg-[#eae2da] hover:text-[#b3541e] disabled:opacity-50 disabled:cursor-not-allowed sm:self-auto"
                    title={
                      !canManage
                        ? 'Requires system.manage permission'
                        : job.canTrigger === false
                          ? 'This job cannot be triggered ad-hoc'
                          : 'Trigger job execution now'
                    }
                  >
                    <Play
                      className={`h-3.5 w-3.5 text-[#b3541e] ${
                        triggeringJob === job.name ? 'animate-spin' : ''
                      }`}
                    />
                    {triggeringJob === job.name ? 'Running...' : 'Run Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Automated Job Executions Table */}
          {data.recentJobRuns && data.recentJobRuns.length > 0 && (
            <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
              <div className="flex items-center justify-between pb-4 border-b border-[#f2ece4]">
                <div>
                  <h3 className="font-headline text-lg font-semibold text-[#3a302a]">
                    Recent Automation Runs
                  </h3>
                  <p className="text-xs text-[#78706a]">
                    Audit log of recently executed cron iterations and administrative triggers
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#605850]">
                  Showing last {data.recentJobRuns.length} runs
                </span>
              </div>

              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#f2ece4] text-[#78706a] uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Job Name</th>
                      <th className="py-2.5 px-3">Started At</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Execution Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2ece4]">
                    {data.recentJobRuns.map((run) => {
                      const duration =
                        run.finishedAt && run.startedAt
                          ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
                          : null;

                      return (
                        <tr key={run.id} className="hover:bg-[#faf5ee]/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                run.status === 'SUCCEEDED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : run.status === 'RUNNING'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {run.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#3a302a]">
                            {run.jobName}
                          </td>
                          <td className="py-2.5 px-3 text-[#605850]">
                            {new Date(run.startedAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#605850]">
                            {duration != null ? `${duration} ms` : '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#605850]">
                            {run.counts ? (
                              <span className="truncate block max-w-xs">
                                {JSON.stringify(run.counts)}
                              </span>
                            ) : run.error ? (
                              <span className="text-rose-700">{run.error}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* External Gateway Statuses */}
          <div className="rounded-2xl border border-[#d8d0c8] bg-white p-6 shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="font-headline text-xl font-semibold text-[#3a302a]">
                  External Integration Gateways
                </h3>
                <p className="text-xs text-[#78706a]">
                  Connectivity and credentials verification for payment, CDN, and telecom providers
                </p>
              </div>
              <Zap className="h-5 w-5 text-[#b3541e]" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {data.gateways.map((gw) => (
                <div
                  key={gw.name}
                  className="rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-4 transition hover:border-[#b3541e]/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3a302a]">{gw.name}</span>
                    <span
                      className={`flex h-2.5 w-2.5 rounded-full ${
                        gw.status === 'OPERATIONAL' ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-[#78706a]">{gw.mode}</p>
                  <p className="mt-1 font-mono text-[10px] text-[#9a9088] truncate">{gw.endpoint}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
