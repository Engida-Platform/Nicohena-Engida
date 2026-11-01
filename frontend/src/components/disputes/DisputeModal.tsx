'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingTitle?: string;
  bookingDates?: string;
  bookingTotal?: number | string;
  userRole?: 'GUEST' | 'HOST';
  onDisputeStatusChanged?: () => void;
}

export type DisputeCategory =
  | 'ACCESS_ISSUE'
  | 'LISTING_MISREPRESENTATION'
  | 'SAFETY_CLEANLINESS'
  | 'DAMAGE_CLAIM'
  | 'PAYMENT_DISPUTE'
  | 'OTHER';

const CATEGORY_LABELS: Record<DisputeCategory, { title: string; hint: string }> = {
  ACCESS_ISSUE: {
    title: 'Check-in or Property Access',
    hint: 'Host unavailable, wrong lockbox code, or unable to enter listing',
  },
  LISTING_MISREPRESENTATION: {
    title: 'Listing Misrepresentation',
    hint: 'Missing promised amenities, wrong room, or photos mismatch reality',
  },
  SAFETY_CLEANLINESS: {
    title: 'Cleanliness or Safety Concern',
    hint: 'Unsanitary conditions, pest issues, or hazardous environment',
  },
  DAMAGE_CLAIM: {
    title: 'Property Damage or Loss',
    hint: 'Breakage, damaged furniture, or missing inventory during stay',
  },
  PAYMENT_DISPUTE: {
    title: 'Payment or Fee Discrepancy',
    hint: 'Incorrect charges, unauthorized deposit deduction, or currency rate issue',
  },
  OTHER: {
    title: 'Other Policy Concern',
    hint: 'House rules violations, unauthorized guests, or general dispute',
  },
};

interface DisputeMessage {
  id: string;
  direction: string;
  channel: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface DisputeDetail {
  id: string;
  number: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  requesterName: string;
  isRequester: boolean;
  bookingId: string;
  propertyId: string;
  propertyTitle?: string;
  compensationAmount: string | null;
  compensationStatus: string;
  escrowStatus: string | null;
  escrowAmountMinor: string | null;
  createdAt: string;
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
  messages: DisputeMessage[];
}

interface DisputeCheckResponse {
  hasDispute: boolean;
  dispute: DisputeDetail | null;
}

function formatAmount(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  return Number.isFinite(num) ? `ETB ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `ETB ${value}`;
}

export default function DisputeModal({
  isOpen,
  onClose,
  bookingId,
  bookingTitle,
  bookingDates,
  bookingTotal,
  userRole = 'GUEST',
  onDisputeStatusChanged,
}: DisputeModalProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filing form state
  const [category, setCategory] = useState<DisputeCategory>('ACCESS_ISSUE');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [requestedCompensationETB, setRequestedCompensationETB] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Correspondence state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [acceptingCompensation, setAcceptingCompensation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchDisputeStatus = useCallback(async () => {
    if (!bookingId || !isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ hasDispute?: boolean; dispute?: DisputeDetail | null; id?: string; status?: string }>(
        `/disputes/booking/${bookingId}`,
      );
      if (res && res.hasDispute && res.dispute) {
        setDispute(res.dispute);
      } else if (res && res.id && res.status) {
        setDispute(res as DisputeDetail);
      } else {
        setDispute(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to check dispute status.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchDisputeStatus();
    } else {
      setDispute(null);
      setSubject('');
      setDescription('');
      setRequestedCompensationETB('');
      setReplyText('');
      setError(null);
    }
  }, [isOpen, fetchDisputeStatus]);

  useEffect(() => {
    if (dispute?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dispute?.messages]);

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please provide both a subject and a detailed explanation of the issue.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const compensationNum = requestedCompensationETB ? parseFloat(requestedCompensationETB) : undefined;
      const created = await apiFetch<DisputeDetail>('/disputes', {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          category,
          subject: subject.trim(),
          description: description.trim(),
          requestedCompensationETB: compensationNum && !isNaN(compensationNum) ? compensationNum : undefined,
        }),
      });

      setDispute(created);
      onDisputeStatusChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to file dispute case.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispute || !replyText.trim() || sendingReply) return;

    setSendingReply(true);
    setError(null);

    try {
      const newMsg = await apiFetch<DisputeMessage>(`/disputes/${dispute.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText.trim() }),
      });

      setDispute((prev) => (prev ? { ...prev, messages: [...prev.messages, newMsg] } : null));
      setReplyText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleAcceptCompensation = async () => {
    if (!dispute) return;
    setAcceptingCompensation(true);
    setError(null);
    try {
      const updated = await apiFetch<DisputeDetail>(`/disputes/${dispute.id}/accept-compensation`, {
        method: 'POST',
      });
      setDispute(updated);
      onDisputeStatusChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept resolution compensation.');
    } finally {
      setAcceptingCompensation(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E5E0D5] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D5] bg-[#F8F5ED]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#234B36]/10 flex items-center justify-center text-[#234B36]">
              {dispute ? <ShieldAlert className="w-5 h-5 text-amber-700" /> : <Shield className="w-5 h-5 text-[#234B36]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-[#252923]">
                  {dispute ? `Resolution Case · ${dispute.number}` : 'Trust & Escrow Dispute Desk'}
                </h3>
                {dispute && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      dispute.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : dispute.status === 'CLOSED'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {dispute.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#73776F]">
                {bookingTitle ? `${bookingTitle} · ` : ''}{bookingDates || `Booking #${bookingId.slice(0, 8)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#73776F] hover:text-[#252923] hover:bg-black/5 rounded-xl transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#234B36] mb-3" />
              <p className="font-medium text-sm text-[#73776F]">Querying escrow mediation vault...</p>
            </div>
          ) : dispute ? (
            /* Mode 2: Existing Dispute Case Workspace */
            <div className="space-y-5">
              
              {/* Escrow Freeze Callout Banner */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold text-sm text-amber-950 flex items-center gap-1.5 mb-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 inline" />
                    Escrow Vault Protection Active
                  </p>
                  Host payout disbursement is <strong>frozen</strong> in the Engida escrow account until this case is settled.
                  Both parties are protected by verified dispute review.
                </div>
              </div>

              {/* Dispute Metadata Summary */}
              <div className="rounded-2xl border border-[#E5E0D5] bg-[#F8F5ED]/60 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-[#E5E0D5]/60 pb-3">
                  <div>
                    <span className="text-[#73776F]">Filed by: </span>
                    <strong className="text-[#252923]">{dispute.requesterName}</strong>
                    {dispute.isRequester && <span className="ml-1 text-[10px] bg-[#234B36]/10 text-[#234B36] px-1.5 py-0.5 rounded font-bold">You</span>}
                  </div>
                  <div>
                    <span className="text-[#73776F]">Date: </span>
                    <span className="text-[#252923]">{new Date(dispute.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[#252923] text-sm">{dispute.subject}</h4>
                  <p className="text-xs text-[#73776F] mt-1 whitespace-pre-wrap">{dispute.description}</p>
                </div>

                {dispute.compensationAmount && (
                  <div className="mt-3 pt-3 border-t border-[#E5E0D5]/60 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs text-[#73776F]">Claim / Compensation: </span>
                      <strong className="text-sm font-bold text-[#234B36]">
                        {formatAmount(dispute.compensationAmount)}
                      </strong>
                      <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        dispute.compensationStatus === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {dispute.compensationStatus}
                      </span>
                    </div>

                    {dispute.isRequester && dispute.compensationStatus === 'PROPOSED' && dispute.status !== 'RESOLVED' && (
                      <button
                        onClick={handleAcceptCompensation}
                        disabled={acceptingCompensation}
                        className="px-3 py-1.5 text-xs font-bold bg-[#234B36] text-white rounded-xl hover:bg-[#1a3828] transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {acceptingCompensation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Accept Resolution Offer
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Discussion / Evidence Thread */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#73776F] mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Resolution Timeline & Statements ({dispute.messages?.length || 0})
                </h4>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {dispute.messages && dispute.messages.length > 0 ? (
                    dispute.messages.map((m) => {
                      const isMe = user?.name ? m.authorName.toLowerCase() === user.name.toLowerCase() : false;
                      return (
                        <div
                          key={m.id}
                          className={`p-3.5 rounded-2xl text-xs max-w-[88%] ${
                            isMe
                              ? 'ml-auto bg-[#234B36] text-white rounded-br-none'
                              : 'mr-auto bg-[#F8F5ED] border border-[#E5E0D5] text-[#252923] rounded-bl-none'
                          }`}
                        >
                          <div className={`flex items-center justify-between gap-3 text-[10px] mb-1 font-bold ${isMe ? 'text-white/80' : 'text-[#73776F]'}`}>
                            <span>{m.authorName}</span>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-[#E5E0D5] text-center text-xs text-[#73776F]">
                      No statements submitted yet. Add evidence or information below.
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Add statement / response form */}
              {dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
                <form onSubmit={handleSendMessage} className="pt-2 border-t border-[#E5E0D5] flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Submit a statement or evidence update..."
                    className="flex-1 px-4 py-2.5 text-xs bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#234B36]"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sendingReply}
                    className="px-4 py-2.5 bg-[#234B36] text-white rounded-xl text-xs font-bold hover:bg-[#1a3828] transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {sendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Reply
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Mode 1: File New Dispute */
            <form onSubmit={handleFileDispute} className="space-y-4">
              
              {/* Notice */}
              <div className="p-4 rounded-2xl bg-[#EEF3EF] border border-[#234B36]/20 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#234B36] shrink-0 mt-0.5" />
                <div className="text-xs text-[#252923] leading-relaxed">
                  <p className="font-bold text-[#234B36] mb-0.5">Escrow Protection Guarantee</p>
                  Submitting a dispute immediately freezes host payout disbursement in our banking escrow vault. 
                  Engida Trust & Safety mediates cases according to our Ethiopian hospitality fair-play standard.
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                  Dispute Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(CATEGORY_LABELS) as DisputeCategory[]).map((cat) => {
                    const isSelected = category === cat;
                    const info = CATEGORY_LABELS[cat];
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`text-left p-3 rounded-2xl border text-xs transition ${
                          isSelected
                            ? 'border-[#234B36] bg-[#234B36]/5 ring-1 ring-[#234B36]'
                            : 'border-[#E5E0D5] hover:border-[#234B36]/50 bg-white'
                        }`}
                      >
                        <p className={`font-bold ${isSelected ? 'text-[#234B36]' : 'text-[#252923]'}`}>{info.title}</p>
                        <p className="text-[11px] text-[#73776F] mt-0.5 line-clamp-1">{info.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="dispute-subject" className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                  Subject / Summary
                </label>
                <input
                  id="dispute-subject"
                  type="text"
                  required
                  placeholder="e.g. Host did not provide access key at scheduled check-in"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#234B36]"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="dispute-desc" className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                  Detailed Explanation & Evidence Summary
                </label>
                <textarea
                  id="dispute-desc"
                  required
                  rows={4}
                  placeholder="Describe exactly what happened, timestamps, communication attempts, and any damages or broken rules..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#234B36] resize-none"
                />
              </div>

              {/* Compensation ETB */}
              <div>
                <label htmlFor="dispute-claim" className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                  Requested Compensation or Refund (ETB, Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#73776F]">
                    ETB
                  </span>
                  <input
                    id="dispute-claim"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0.00"
                    value={requestedCompensationETB}
                    onChange={(e) => setRequestedCompensationETB(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 text-xs bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#234B36]"
                  />
                </div>
                {bookingTotal && (
                  <p className="text-[11px] text-[#73776F] mt-1">
                    Booking total: <strong className="text-[#252923]">{formatAmount(bookingTotal)}</strong>
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#E5E0D5] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-[#73776F] hover:text-[#252923] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-bold bg-[#234B36] text-white rounded-xl hover:bg-[#1a3828] transition flex items-center gap-2 disabled:opacity-50 shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Filing Dispute & Freezing Escrow...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Open Case & Lock Escrow
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-[#E5E0D5] bg-[#F8F5ED] flex items-center justify-between text-[11px] text-[#73776F]">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#234B36]" />
            Guaranteed 4-hour Trust & Safety response time
          </span>
          <span className="font-semibold">Engida Escrow SafeStay™</span>
        </div>
      </div>
    </div>
  );
}
