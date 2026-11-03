'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import AppHeader from '@/components/layout/AppHeader';

interface SupportCaseMessage {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  authorName: string;
  body: string;
  createdAt: string;
}

interface SupportCase {
  id: string;
  number: string;
  type: string;
  category: string;
  priority: string;
  severity: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_REQUESTER' | 'WAITING_ON_INTERNAL' | 'RESOLVED' | 'CLOSED';
  subject: string;
  description: string;
  compensationStatus?: 'NONE' | 'PROPOSED' | 'APPROVED' | 'REJECTED';
  compensationAmount?: string | null;
  compensationCurrency?: string;
  compensationNote?: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messages?: SupportCaseMessage[];
  booking?: {
    id: string;
    reference: string;
  } | null;
}

const CATEGORIES = [
  { value: 'BOOKING', label: 'Reservation & Dates', icon: 'calendar_month', desc: 'Questions about check-in, dates, or booking changes' },
  { value: 'PAYMENT', label: 'Billing & Escrow', icon: 'payments', desc: 'Refunds, payment verification, and receipts' },
  { value: 'LISTING', label: 'Listing Accuracy', icon: 'home', desc: 'Property condition, amenities, or host details' },
  { value: 'SAFETY', label: 'Trust & Safety', icon: 'shield', desc: 'Security, urgent property issues, or emergency concerns' },
  { value: 'OTHER', label: 'General Inquiry', icon: 'help', desc: 'Account settings, feedback, or other questions' },
];

const FAQS = [
  {
    q: 'How does the ENGIDA Escrow Guarantee work?',
    a: 'Your payment is held safely in our banking escrow account. The host receives payment 24 hours after your successful checkout. If the listing does not match or access is not provided, you receive a full refund.',
  },
  {
    q: 'How do I cancel my reservation and get a refund?',
    a: 'Visit your Trips dashboard and select "Request Cancellation". You will see an exact policy refund preview before confirming. Once approved, refunds are credited back to your original payment method.',
  },
  {
    q: 'What should I do if a host does not respond?',
    a: 'Hosts typically respond within 2 hours. If your check-in date is approaching and the host is unresponsive, open a Priority Safety & Booking ticket here and our team will assist you immediately.',
  },
  {
    q: 'How are disputes resolved?',
    a: 'When you submit a dispute with photos or details, our operations team reviews both guest and host records. If compensation or a refund is warranted, an offer will be sent directly to your ticket for your review.',
  },
];

export default function SupportCenterPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'tickets' | 'new' | 'faqs'>('tickets');
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // New Ticket Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('BOOKING');
  const [description, setDescription] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadMyCases = useCallback(async () => {
    if (!user) return;
    setLoadingCases(true);
    try {
      const res = await apiFetch<{ items: SupportCase[] }>('/cases/mine');
      setCases(res.items || []);
    } catch {
      // Not logged in or network error
    } finally {
      setLoadingCases(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadMyCases();
    }
  }, [user, loadMyCases]);

  const loadCaseDetail = async (id: string) => {
    try {
      const detail = await apiFetch<SupportCase>(`/cases/${id}`);
      setSelectedCase(detail);
    } catch (err: any) {
      alert(err.message || 'Failed to load ticket details');
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setFormError('Please fill in both a subject and details of your request.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const created = await apiFetch<SupportCase>('/cases', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          description: description.trim(),
          bookingId: bookingId.trim() || undefined,
        }),
      });

      setFormSuccess(`Ticket ${created.number} submitted successfully. Our team will review it shortly.`);
      setSubject('');
      setDescription('');
      setBookingId('');
      await loadMyCases();
      setActiveTab('tickets');
      void loadCaseDetail(created.id);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedCase || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await apiFetch(`/cases/${selectedCase.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: replyText.trim() }),
      });
      setReplyText('');
      await loadCaseDetail(selectedCase.id);
      await loadMyCases();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDecideCompensation = async (action: 'ACCEPT' | 'REJECT') => {
    if (!selectedCase) return;
    const confirmMsg =
      action === 'ACCEPT'
        ? `Accept the proposed compensation of ETB ${Number(selectedCase.compensationAmount || 0).toLocaleString()}?`
        : 'Decline this compensation offer?';
    if (!confirm(confirmMsg)) return;

    try {
      await apiFetch(`/cases/${selectedCase.id}/compensation/decide`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      await loadCaseDetail(selectedCase.id);
      await loadMyCases();
    } catch (err: any) {
      alert(err.message || 'Failed to submit compensation decision');
    }
  };

  const getStatusBadge = (status: SupportCase['status']) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Queued', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'IN_PROGRESS':
        return { label: 'Under Review', bg: 'bg-[#234B36]/10 text-[#234B36] border-[#234B36]/20' };
      case 'WAITING_ON_REQUESTER':
        return { label: 'Action Required', bg: 'bg-purple-50 text-purple-800 border-purple-200 animate-pulse' };
      case 'WAITING_ON_INTERNAL':
        return { label: 'Staff Handling', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'RESOLVED':
        return { label: 'Resolved', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'CLOSED':
        return { label: 'Closed', bg: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
      default:
        return { label: status, bg: 'bg-zinc-50 text-zinc-700 border-zinc-200' };
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans">
      <AppHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-4">
          <Link
            href={Boolean(user?.hostProfile) ? '/host/dashboard' : '/'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#73776F] hover:text-[#234B36] transition group cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-1">arrow_back</span>
            <span>{Boolean(user?.hostProfile) ? 'Back to Host Dashboard' : 'Back to Explore Stays'}</span>
          </Link>
        </div>
        {/* Header Hero */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] text-xs font-bold uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-sm">support_agent</span>
                ENGIDA Concierge &amp; Resolution
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#252923] tracking-tight">
                Help &amp; Support Center
              </h1>
              <p className="text-sm text-[#73776F] mt-1 max-w-2xl">
                Get quick answers, report reservation issues, or communicate directly with our trust and safety specialists.
              </p>
            </div>

            <button
              onClick={() => {
                setActiveTab('new');
                setSelectedCase(null);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] text-white text-sm font-bold shadow-md hover:bg-[#1C3C2B] transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Open Support Ticket
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-[#E5E0D5]">
            <button
              onClick={() => {
                setActiveTab('tickets');
                setSelectedCase(null);
              }}
              className={`pb-3 px-3 text-sm font-bold transition border-b-2 flex items-center gap-2 ${
                activeTab === 'tickets'
                  ? 'border-[#234B36] text-[#234B36]'
                  : 'border-transparent text-[#73776F] hover:text-[#252923]'
              }`}
            >
              <span className="material-symbols-outlined text-base">confirmation_number</span>
              My Tickets ({cases.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('new');
                setSelectedCase(null);
              }}
              className={`pb-3 px-3 text-sm font-bold transition border-b-2 flex items-center gap-2 ${
                activeTab === 'new'
                  ? 'border-[#234B36] text-[#234B36]'
                  : 'border-transparent text-[#73776F] hover:text-[#252923]'
              }`}
            >
              <span className="material-symbols-outlined text-base">rate_review</span>
              Submit New Ticket
            </button>
            <button
              onClick={() => {
                setActiveTab('faqs');
                setSelectedCase(null);
              }}
              className={`pb-3 px-3 text-sm font-bold transition border-b-2 flex items-center gap-2 ${
                activeTab === 'faqs'
                  ? 'border-[#234B36] text-[#234B36]'
                  : 'border-transparent text-[#73776F] hover:text-[#252923]'
              }`}
            >
              <span className="material-symbols-outlined text-base">help</span>
              Help Guides &amp; FAQs
            </button>
          </div>
        </div>

        {/* Tab 1: My Tickets & Selected Ticket Thread */}
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Ticket List */}
            <div className={`space-y-3 ${selectedCase ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
              {authLoading || loadingCases ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E0D5]">
                  <div className="w-8 h-8 border-2 border-[#234B36] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-[#73776F]">Loading your support history...</p>
                </div>
              ) : !user ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#E5E0D5]">
                  <span className="material-symbols-outlined text-4xl text-[#73776F] mb-2">lock</span>
                  <h3 className="text-base font-bold text-[#252923]">Sign in to view your tickets</h3>
                  <p className="text-xs text-[#73776F] mt-1 mb-4">Please log in to track your inquiries or submit a dispute.</p>
                  <Link
                    href="/login"
                    className="inline-block px-5 py-2 rounded-xl bg-[#234B36] text-white text-xs font-bold"
                  >
                    Log In
                  </Link>
                </div>
              ) : cases.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E0D5]">
                  <div className="w-12 h-12 rounded-full bg-[#EEF3EF] flex items-center justify-center mx-auto mb-3 text-[#234B36]">
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                  </div>
                  <h3 className="text-base font-bold text-[#252923]">No support tickets found</h3>
                  <p className="text-xs text-[#73776F] mt-1 mb-4 max-w-sm mx-auto">
                    You currently have no open inquiries or dispute cases with the concierge team.
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#234B36] text-white text-xs font-bold"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Create Ticket
                  </button>
                </div>
              ) : (
                cases.map((c) => {
                  const badge = getStatusBadge(c.status);
                  const isSelected = selectedCase?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => void loadCaseDetail(c.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#EEF3EF] border-[#234B36] shadow-sm'
                          : 'bg-white border-[#E5E0D5] hover:border-[#234B36]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-[#234B36] bg-[#234B36]/10 px-2 py-0.5 rounded-md">
                          {c.number}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#252923] line-clamp-1">{c.subject}</h4>
                      <p className="text-xs text-[#73776F] line-clamp-2 mt-1">{c.description}</p>
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#E5E0D5]/60 text-[11px] text-[#73776F]">
                        <span className="capitalize">{c.category.toLowerCase().replace(/_/g, ' ')}</span>
                        <span>{new Date(c.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Conversation Detail Drawer */}
            {selectedCase && (
              <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E0D5] shadow-xs flex flex-col h-[700px]">
                {/* Detail Header */}
                <div className="p-4 sm:p-5 border-b border-[#E5E0D5] flex items-center justify-between bg-[#F8F5ED]/50 rounded-t-2xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#234B36]">{selectedCase.number}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          getStatusBadge(selectedCase.status).bg
                        }`}
                      >
                        {getStatusBadge(selectedCase.status).label}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#252923] mt-1">{selectedCase.subject}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedCase(null)}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                {/* Compensation Banner (if proposed) */}
                {selectedCase.compensationStatus === 'PROPOSED' && (
                  <div className="p-4 bg-emerald-50 border-b border-emerald-200">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-emerald-700 text-xl mt-0.5">price_check</span>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                          Compensation Settlement Offered
                        </h4>
                        <p className="text-sm font-bold text-emerald-800 mt-0.5">
                          Amount: ETB {Number(selectedCase.compensationAmount || 0).toLocaleString()}
                        </p>
                        {selectedCase.compensationNote && (
                          <p className="text-xs text-emerald-700 mt-1 italic">
                            &quot;{selectedCase.compensationNote}&quot;
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => void handleDecideCompensation('ACCEPT')}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition"
                          >
                            Accept Offer
                          </button>
                          <button
                            onClick={() => void handleDecideCompensation('REJECT')}
                            className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-50 transition"
                          >
                            Decline Offer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Thread */}
                <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-zinc-50/50">
                  {selectedCase.messages && selectedCase.messages.length > 0 ? (
                    selectedCase.messages.map((m) => {
                      const isCustomer = m.direction === 'INBOUND';
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#73776F]">
                            <span className="font-bold text-[#252923]">
                              {isCustomer ? 'You' : `${m.authorName} (Support)`}
                            </span>
                            <span>&middot;</span>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                              isCustomer
                                ? 'bg-[#234B36] text-white rounded-tr-none'
                                : 'bg-white text-[#252923] border border-[#E5E0D5] rounded-tl-none shadow-xs'
                            }`}
                          >
                            {m.body}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 text-xs text-[#73776F]">No correspondence yet.</div>
                  )}
                </div>

                {/* Reply Composer */}
                {selectedCase.status !== 'CLOSED' ? (
                  <div className="p-3 sm:p-4 border-t border-[#E5E0D5] bg-white rounded-b-2xl">
                    <div className="flex items-center gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your response to the support team..."
                        rows={2}
                        className="flex-1 resize-none rounded-xl border border-[#E5E0D5] p-2.5 text-xs sm:text-sm text-[#252923] focus:outline-none focus:border-[#234B36]"
                      />
                      <button
                        onClick={() => void handleSendReply()}
                        disabled={sendingReply || !replyText.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1C3C2B] disabled:opacity-50 transition shrink-0"
                      >
                        {sendingReply ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-[#73776F] bg-zinc-100 border-t border-[#E5E0D5] rounded-b-2xl">
                    This ticket has been resolved and closed.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Submit New Ticket Form */}
        {activeTab === 'new' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E5E0D5] p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-[#252923] mb-1">Submit a Support Ticket</h2>
            <p className="text-xs text-[#73776F] mb-6">
              Our hospitality concierges and trust team review cases within 4 hours.
            </p>

            {formError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#252923] mb-1.5">Category</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                        category === cat.value
                          ? 'border-[#234B36] bg-[#EEF3EF] text-[#234B36]'
                          : 'border-[#E5E0D5] hover:border-zinc-300 text-[#252923]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg mt-0.5">{cat.icon}</span>
                      <div>
                        <div className="text-xs font-bold">{cat.label}</div>
                        <div className="text-[10px] text-[#73776F] leading-tight mt-0.5">{cat.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#252923] mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your question or issue"
                  className="w-full rounded-xl border border-[#E5E0D5] px-3.5 py-2 text-xs sm:text-sm text-[#252923] focus:outline-none focus:border-[#234B36]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#252923] mb-1">
                  Linked Reservation Reference (Optional)
                </label>
                <input
                  type="text"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="e.g. Booking UUID or reservation reference"
                  className="w-full rounded-xl border border-[#E5E0D5] px-3.5 py-2 text-xs sm:text-sm text-[#252923] focus:outline-none focus:border-[#234B36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#252923] mb-1">Detailed Explanation</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Provide all relevant details, what happened, dates, or what resolution you are requesting..."
                  className="w-full rounded-xl border border-[#E5E0D5] p-3 text-xs sm:text-sm text-[#252923] focus:outline-none focus:border-[#234B36]"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E0D5] text-xs font-bold text-[#73776F] hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#234B36] text-white text-xs font-bold shadow-md hover:bg-[#1C3C2B] disabled:opacity-50 transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: FAQs */}
        {activeTab === 'faqs' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 mb-6">
              <h3 className="text-base font-bold text-[#252923] mb-1">Frequently Asked Questions</h3>
              <p className="text-xs text-[#73776F]">
                Quick solutions to our most common guest and host inquiries.
              </p>
            </div>

            {FAQS.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-xs">
                <h4 className="text-sm font-bold text-[#252923] flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-base text-[#234B36]">help_outline</span>
                  {faq.q}
                </h4>
                <p className="text-xs sm:text-sm text-[#73776F] leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

