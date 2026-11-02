'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Zap,
  Droplets,
  CreditCard,
  MessageSquare,
  Building2,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Headphones,
  Lock,
} from 'lucide-react';

export default function HowItWorksSection() {
  const [activePersona, setActivePersona] = useState<'guest' | 'host'>('guest');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const guestSteps = [
    {
      num: '01',
      title: 'Discover Verified Ethiopian Stays',
      desc: 'Browse hand-inspected apartments, penthouses, and lakeside villas across Addis Ababa, Bishoftu, Hawassa, and Gondar. Every stay is tagged with verified standby generator and backup water reserve status.',
      icon: Building2,
      badge: '100% Real Photography',
    },
    {
      num: '02',
      title: 'Book Safely with Escrow Protection',
      desc: 'Reserve with Telebirr, CBE Birr, Chapa, or international cards. Your money is held in a protected bank escrow vault and only released to the property host 24 hours after you successfully check in.',
      icon: Lock,
      badge: 'Escrow Guarantee',
    },
    {
      num: '03',
      title: 'Enjoy Stress-Free Ethiopian Hospitality',
      desc: 'Check in smoothly with digital smart lock codes or verified host greeting. Need local guidance, driver coordination, or airport transfer? Our bilingual 24/7 AI Concierge and support team are always at hand.',
      icon: Headphones,
      badge: '24/7 Local Support',
    },
  ];

  const hostSteps = [
    {
      num: '01',
      title: 'List for Free in Under 10 Minutes',
      desc: 'Publish your apartment, luxury compound, or guest house with zero upfront listing fees. Highlight your standby generator, water tank, fiber internet, and set custom nightly or monthly rates in ETB or USD.',
      icon: Building2,
      badge: '0% Upfront Cost',
    },
    {
      num: '02',
      title: 'Welcome Identity-Verified Guests',
      desc: 'Screen travelers with confidence. Every guest on Engida is identity-verified with national ID or passport matching before reservation confirmation. You have full control over your calendar and house rules.',
      icon: ShieldCheck,
      badge: 'Verified Travelers Only',
    },
    {
      num: '03',
      title: 'Guaranteed, Fast Bank Payouts',
      desc: 'Say goodbye to cash collection anxiety. Payouts are transferred automatically to your Commercial Bank of Ethiopia (CBE) or Telebirr account within 24 hours of guest arrival.',
      icon: CreditCard,
      badge: 'Direct to CBE / Telebirr',
    },
  ];

  const faqs = [
    {
      q: 'How does the Engida Escrow Guarantee protect travelers?',
      a: 'When you book a stay on Engida, your payment is held securely in escrow. The host does NOT receive payout until 24 hours after your scheduled check-in. If the property differs significantly from description or has unannounced utility failures, our resolution team steps in to rebook you or issue an immediate refund.',
    },
    {
      q: 'What does "Verified Utilities" (Generator & Water Tank) mean?',
      a: 'In Ethiopia, continuous power and water are essential. Engida listings feature verified badges indicating whether the property has an automatic standby generator, an independent water reserve tank, or solar backup. These amenities are physically inspected or confirmed by recent guest reviews.',
    },
    {
      q: 'Which payment methods are accepted in Ethiopia?',
      a: 'We accept Telebirr, CBE Birr, Commercial Bank of Ethiopia (CBE), Dashen Bank, Chapa, and international Visa/Mastercard payments. Prices are displayed transparently in Ethiopian Birr (ETB) with optional USD conversion.',
    },
    {
      q: 'How do hosts receive payouts?',
      a: 'Hosts receive automated direct deposits to their CBE bank account or Telebirr merchant wallet within 24 hours after the guest checks in. There are zero hidden remittance fees or delays.',
    },
    {
      q: 'What is the cancellation policy on Engida?',
      a: 'Hosts choose between Flexible (full refund up to 24h before check-in), Moderate (full refund up to 5 days before), or Strict policies. Cancellation terms are always clearly shown before you confirm your payment.',
    },
  ];

  const steps = activePersona === 'guest' ? guestSteps : hostSteps;

  return (
    <div className="w-full bg-[#F8F5ED]">
      {/* Hero Intro */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 pb-8 text-center animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] text-xs font-bold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#D87836]" />
          <span>The Standard for Ethiopian Hospitality</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black font-headline text-[#252923] tracking-tight">
          How Engida Works
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#73776F] max-w-2xl mx-auto leading-relaxed">
          The trusted bridge connecting travelers with verified Ethiopian homes, villas, and cultural experiences — protected by modern escrow payments and 24/7 local support.
        </p>

        {/* Persona Switcher Toggle */}
        <div className="mt-8 inline-flex items-center p-1.5 rounded-full bg-white border border-[#E5E0D5] shadow-sm">
          <button
            type="button"
            onClick={() => setActivePersona('guest')}
            className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activePersona === 'guest'
                ? 'bg-[#234B36] text-white shadow-xs'
                : 'text-[#73776F] hover:text-[#252923]'
            }`}
          >
            For Travelers &amp; Guests
          </button>
          <button
            type="button"
            onClick={() => setActivePersona('host')}
            className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activePersona === 'host'
                ? 'bg-[#234B36] text-white shadow-xs'
                : 'text-[#73776F] hover:text-[#252923]'
            }`}
          >
            For Property Hosts
          </button>
        </div>
      </section>

      {/* 3 Step Process Grid */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.num}
                className="relative bg-white rounded-3xl border border-[#E5E0D5] p-8 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black font-headline text-[#234B36]/25">
                      {st.num}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#D87836] bg-[#D87836]/15 px-3 py-1 rounded-full">
                      {st.badge}
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-[#FAF8F2] border border-[#E5E0D5] flex items-center justify-center text-[#234B36] mb-5">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-bold font-headline text-[#252923] mb-3">
                    {st.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#73776F] leading-relaxed">
                    {st.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E5E0D5]/60 flex items-center gap-1.5 text-xs font-bold text-[#234B36]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified &amp; Guaranteed</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA banner based on persona */}
        <div className="mt-12 rounded-3xl bg-linear-to-r from-[#234B36] to-[#1A3828] p-8 sm:p-12 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold font-headline">
              {activePersona === 'guest'
                ? 'Ready to experience verified Ethiopian comfort?'
                : 'Turn your property into reliable monthly income'}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-white/80 max-w-xl">
              {activePersona === 'guest'
                ? 'Browse verified penthouses in Bole, crater lakefront villas in Bishoftu, and historic heritage homes in Gondar.'
                : 'Join over 150 verified Ethiopian hosts enjoying guaranteed payouts, zero listing fees, and protected security deposits.'}
            </p>
          </div>

          <Link
            href={activePersona === 'guest' ? '/?tab=stays' : '/become-a-host'}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#D87836] hover:bg-[#c2652a] text-white font-bold text-sm shadow-md transition active:scale-95 shrink-0"
          >
            <span>{activePersona === 'guest' ? 'Browse Stays Now' : 'Engida Your Home'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Trust Pillars */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-12 border-t border-[#E5E0D5]/70">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black font-headline text-[#252923]">
            Why Travelers &amp; Hosts Choose Engida
          </h2>
          <p className="text-xs sm:text-sm text-[#73776F] mt-1">
            Built specifically to address the unique logistical realities of Ethiopian hospitality.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E0D5] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-[#252923] mb-1">Guaranteed Backup Power</h4>
            <p className="text-xs text-[#73776F] leading-relaxed">
              Every listing transparently displays standby generator status and fuel capacity for uninterrupted electricity.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E5E0D5] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
              <Droplets className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-[#252923] mb-1">Water Reserve Verification</h4>
            <p className="text-xs text-[#73776F] leading-relaxed">
              Pressure-tested underground and rooftop water storage tanks ensure constant high-pressure hot and cold water.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E5E0D5] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-[#252923] mb-1">Bank-Backed Escrow</h4>
            <p className="text-xs text-[#73776F] leading-relaxed">
              Payments via Telebirr or CBE are locked safely in institutional escrow until 24h after verified guest check-in.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E5E0D5] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Headphones className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-[#252923] mb-1">Bilingual Local Concierge</h4>
            <p className="text-xs text-[#73776F] leading-relaxed">
              Support in Amharic and English 24/7. Immediate assistance for directions, taxi dispatch, and host coordination.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black font-headline text-[#252923]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-[#73776F] mt-1">
            Everything you need to know about booking and hosting on Engida.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="bg-white rounded-2xl border border-[#E5E0D5] overflow-hidden shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-[#252923] hover:text-[#234B36] transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#73776F] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-[#73776F] leading-relaxed border-t border-[#E5E0D5]/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

