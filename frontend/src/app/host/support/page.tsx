'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { showPlatformToast } from '@/context/ToastContext';
import {
  HelpCircle,
  ShieldCheck,
  Plus,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  BadgeDollarSign,
  Building2,
  FileText,
} from 'lucide-react';

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
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_REQUESTER' | 'WAITING_ON_INTERNAL' | 'RESOLVED' | 'CLOSED';
  subject: string;
  description: string;
  createdAt: string;
  messages?: SupportCaseMessage[];
}

const HOST_CATEGORIES = [
  { value: 'PAYMENT', label: 'Payouts & Escrow Release', desc: 'Inquiries regarding Telebirr/CBE bank transfer disbursement' },
  { value: 'LISTING', label: 'Listing Verification & Deeds', desc: 'Title deed document review, amenity approval, photos' },
  { value: 'BOOKING', label: 'Guest Reservation & Dates', desc: 'Assistance with guest check-in logistics or calendar sync' },
  { value: 'SAFETY', label: 'Trust & Host AirCover', desc: 'Security, damage protection reports, or urgent property concerns' },
];

const HOST_FAQS = [
  {
    q: 'When are host reservation payouts disbursed?',
    a: 'Under ENGIDA Escrow rules, payout releases are automatically initiated 24 hours after your guest successfully checks in. Funds are settled directly to your verified Ethiopian bank account or Telebirr registered number.',
  },
  {
    q: 'What is Host AirCover Protection?',
    a: 'Every verified ENGIDA listing is covered with up to ETB 2,500,000 in property damage protection and round-the-clock host safety emergency support at no additional cost.',
  },
  {
    q: 'How do I request official verification for my listing?',
    a: 'Submit a ticket under "Listing Verification & Deeds" with a photo of your title deed (ካርታ) or property lease agreement. Our compliance team will audit and apply the green verified badge within 24 hours.',
  },
  {
    q: 'How does calendar synchronization work with Airbnb or Booking.com?',
    a: 'You can import your external iCal calendar links under Host Portal -> Availability. This prevents double bookings across platforms automatically.',
  },
];

export default function HostSupportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tickets' | 'new' | 'faqs'>('tickets');
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);

  // Form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('PAYMENT');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCases = useCallback(async () => {
    if (!user) return;
    setLoadingCases(true);
    try {
      const res = await apiFetch<{ items: SupportCase[] }>('/cases/mine');
      setCases(res.items || []);
    } catch {
      // Offline fallback
    } finally {
      setLoadingCases(false);
    }
  }, [user]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      await apiFetch('/cases', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          description: description.trim(),
          priority: 'HIGH',
        }),
      });

      showPlatformToast('Priority host support ticket submitted successfully!', 'success', 'Ticket Dispatched');
      setSubject('');
      setDescription('');
      setActiveTab('tickets');
      loadCases();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit support ticket';
      showPlatformToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto text-[#252923] font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#234B36] text-white shadow-xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-headline text-[#252923]">
              Host Support & Concierge Desk
            </h1>
            <p className="text-xs text-[#73776F]">
              Dedicated 24/7 host assistance, payout reconciliation, and AirCover protection
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold transition shadow-sm cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Open Priority Host Ticket</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E0D5] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'tickets'
              ? 'bg-[#234B36] text-white shadow-xs'
              : 'text-[#73776F] hover:bg-white hover:text-[#252923]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Host Tickets ({cases.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'new'
              ? 'bg-[#234B36] text-white shadow-xs'
              : 'text-[#73776F] hover:bg-white hover:text-[#252923]'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'faqs'
              ? 'bg-[#234B36] text-white shadow-xs'
              : 'text-[#73776F] hover:bg-white hover:text-[#252923]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Host Guides & FAQs</span>
        </button>
      </div>

      {/* Tab 1: My Tickets */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {loadingCases ? (
            <div className="p-12 text-center text-xs text-[#73776F]">Loading your support cases...</div>
          ) : cases.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E5E0D5] p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-[#234B36] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-[#252923]">No open tickets</h3>
              <p className="text-xs text-[#73776F] max-w-sm mx-auto">
                Everything looks great with your host account and payouts. If you ever need help, our concierge is here.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition cursor-pointer"
              >
                Submit In-Platform Request
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {cases.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-xs flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#234B36] bg-[#EEF3EF] px-2.5 py-0.5 rounded-md">
                        {c.number || 'CAS-HOST'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#73776F] bg-[#FAF8F2] px-2 py-0.5 rounded-md border border-[#E5E0D5]">
                        {c.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#252923]">{c.subject}</h4>
                    <p className="text-xs text-[#73776F] line-clamp-2">{c.description}</p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Open Ticket */}
      {activeTab === 'new' && (
        <form onSubmit={handleCreateTicket} className="bg-white rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl">
          <div>
            <h2 className="text-base font-bold font-headline text-[#252923]">Create Host Support Ticket</h2>
            <p className="text-xs text-[#73776F] mt-0.5">
              Tickets opened from the Host Portal are prioritized with direct concierge dispatch
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HOST_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    category === cat.value
                      ? 'border-[#234B36] bg-[#EEF3EF] ring-2 ring-[#234B36]/20'
                      : 'border-[#E5E0D5] bg-[#FAF8F2] hover:bg-white'
                  }`}
                >
                  <p className="font-bold text-xs text-[#252923]">{cat.label}</p>
                  <p className="text-[10px] text-[#73776F] mt-0.5">{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Inquiry regarding Telebirr payout settlement for reservation #8392"
              className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide relevant details such as listing title, reservation reference, or transaction timestamps..."
              className="w-full p-4 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className="px-5 py-2.5 rounded-xl border border-[#E5E0D5] text-xs font-semibold text-[#73776F] hover:bg-[#FAF8F2] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Dispatch Ticket'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: FAQs */}
      {activeTab === 'faqs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HOST_FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-xs space-y-2">
              <h4 className="text-xs font-bold text-[#252923] flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-[#234B36] shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs text-[#73776F] leading-relaxed pl-6">{faq.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

