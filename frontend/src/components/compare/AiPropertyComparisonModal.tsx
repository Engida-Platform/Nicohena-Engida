'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import type { PropertyComparisonResponse } from '@/types/guest-ai';
import {
  Scale,
  Sparkles,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Building2,
  Star,
  MapPin,
  Bed,
  Users,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export default function AiPropertyComparisonModal({
  isOpen,
  onClose,
  propertyIds,
  checkInDate,
  checkOutDate,
  guestsCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  propertyIds: string[];
  checkInDate?: string;
  checkOutDate?: string;
  guestsCount?: number;
}) {
  const [data, setData] = useState<PropertyComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || propertyIds.length < 2) return;

    async function loadComparison() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<PropertyComparisonResponse>('/ai/guest/compare', {
          method: 'POST',
          body: JSON.stringify({
            propertyIds: propertyIds.slice(0, 4),
            checkInDate,
            checkOutDate,
            guestsCount,
          }),
        });
        setData(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Comparison failed';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    void loadComparison();
  }, [isOpen, propertyIds, checkInDate, checkOutDate, guestsCount]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-5xl h-[92vh] max-h-[860px] rounded-3xl border border-[#E5E0D5] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E0D5] bg-[#FAF8F2] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#234B36] text-white flex items-center justify-center shadow-xs">
              <Scale size={20} className="text-[#D87836]" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#252923]">
                AI Property Comparison
              </h2>
              <p className="text-xs text-[#73776F]">
                Side-by-side analysis of real rates, amenities, space, and verified guest ratings
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E5E0D5] hover:bg-[#FAF8F2] flex items-center justify-center text-[#73776F] hover:text-[#252923] transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-[#73776F] gap-2 py-20">
              <div className="w-8 h-8 border-2 border-[#234B36] border-t-transparent rounded-full animate-spin" />
              <span>Analyzing property differences and checking verified attributes...</span>
            </div>
          ) : error || !data ? (
            <div className="p-8 text-center flex flex-col items-center gap-2">
              <AlertCircle size={32} className="text-red-500" />
              <h3 className="font-bold text-sm text-[#252923]">Comparison Unavailable</h3>
              <p className="text-xs text-[#73776F] max-w-sm">{error || 'Please select at least 2 properties to compare.'}</p>
            </div>
          ) : (
            <>
              {/* AI Insights & Recommendation Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-[#234B36]/10 via-[#FAF8F2] to-amber-50/50 border border-[#234B36]/20 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#234B36] text-white flex items-center justify-center text-xs font-bold">
                    <Sparkles size={13} className="text-[#D87836]" />
                  </span>
                  <h3 className="font-serif text-base font-bold text-[#252923]">
                    AI Decision Summary
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[#252923] leading-relaxed">
                  {data.aiAnalysis.recommendationSummary}
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-2xl border border-[#E5E0D5] shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Best Overall Value
                    </span>
                    <h4 className="font-bold text-[#252923] mt-1 text-xs truncate">
                      {data.aiAnalysis.bestValue.title}
                    </h4>
                    <p className="text-[11px] text-[#73776F] mt-0.5">
                      {data.aiAnalysis.bestValue.rationale}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-[#E5E0D5] shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#234B36] bg-[#234B36]/10 px-2 py-0.5 rounded-full">
                      Top Guest Satisfaction
                    </span>
                    <h4 className="font-bold text-[#252923] mt-1 text-xs truncate">
                      {data.aiAnalysis.bestOverall.title}
                    </h4>
                    <p className="text-[11px] text-[#73776F] mt-0.5">
                      {data.aiAnalysis.bestOverall.rationale}
                    </p>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Property Headers */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#E5E0D5]">
                      <th className="p-3 w-1/4 text-xs font-bold uppercase tracking-wider text-[#73776F]">
                        Comparison Factor
                      </th>
                      {data.properties.map((prop) => (
                        <th key={prop.id} className="p-3 w-1/4 align-top">
                          <div className="flex flex-col gap-2">
                            <div className="relative aspect-16/10 w-full rounded-2xl bg-[#FAF8F2] overflow-hidden border border-[#E5E0D5]">
                              {prop.coverImage ? (
                                <Image
                                  src={prop.coverImage}
                                  alt={prop.title}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#73776F]">
                                  <Building2 size={24} />
                                </div>
                              )}
                            </div>
                            <h4 className="font-bold text-xs text-[#252923] line-clamp-1">
                              {prop.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/properties/${prop.id}`}
                                onClick={onClose}
                                className="w-full py-1.5 px-3 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-center text-xs font-semibold transition active:scale-95 shadow-xs"
                              >
                                View & Reserve
                              </Link>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* Matrix Rows */}
                  <tbody className="divide-y divide-[#E5E0D5]/60 text-xs text-[#252923]">
                    {data.matrix.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-[#FAF8F2]/30' : 'bg-white'}>
                        <td className="p-3 font-semibold text-[#73776F]">{row.attribute}</td>
                        {row.values.map((val, colIdx) => (
                          <td key={colIdx} className="p-3 font-medium">
                            {val === 'Included' || val === 'Free on-site' || val === 'Fully equipped' || val === 'Automatic Standby' ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                                <Check size={14} className="text-emerald-600" /> {val}
                              </span>
                            ) : val === 'Not provided' ? (
                              <span className="text-[#73776F] italic">{val}</span>
                            ) : (
                              val
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tradeoffs Analysis Section */}
              <div className="pt-4 border-t border-[#E5E0D5]">
                <h4 className="font-serif font-bold text-base text-[#252923] mb-3">
                  Trade-off & Advantage Breakdown
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.aiAnalysis.tradeoffs.map((tradeoff) => {
                    const prop = data.properties.find((p) => p.id === tradeoff.propertyId);
                    return (
                      <div
                        key={tradeoff.propertyId}
                        className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E5E0D5] space-y-2.5 text-xs"
                      >
                        <h5 className="font-bold text-[#252923] truncate">{prop?.title}</h5>

                        <div>
                          <p className="font-bold text-emerald-800 text-[10px] uppercase tracking-wider mb-1">
                            Key Advantages
                          </p>
                          <ul className="space-y-1">
                            {tradeoff.pros.map((pro, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[#252923]">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="font-bold text-amber-800 text-[10px] uppercase tracking-wider mb-1">
                            Considerations
                          </p>
                          <ul className="space-y-1">
                            {tradeoff.cons.map((con, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[#73776F]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

