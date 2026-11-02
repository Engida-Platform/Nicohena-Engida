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
  Mail,
  MapPin,
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

      {/* Contact & Platform Support Desk */}
      <section id="contact" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-gradient-to-br from-[#234B36] to-[#163525] rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/15 backdrop-blur-md text-[#E8D7C8] mb-3">
              <Headphones className="w-3.5 h-3.5" />
              Direct Team & Concierge Support
            </span>

            <h2 className="text-2xl sm:text-3xl font-black font-headline text-white leading-tight">
              Have Questions or Need Direct Booking Assistance?
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-[#E5E0D5] leading-relaxed">
              Whether you are planning a trip to Ethiopia, inquiring about host property verification, or registering as a licensed tour guide, reach out to our team directly.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email Contact */}
              <a
                href="mailto:habtamushewamene905@gmail.com"
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <span className="block text-[10px] uppercase font-bold text-[#D87836] tracking-wider">
                    Direct Email
                  </span>
                  <span className="text-xs font-bold text-white truncate block">
                    habtamushewamene905@gmail.com
                  </span>
                </div>
              </a>

              {/* GitHub Collaboration */}
              <a
                href="https://github.com/Engida-Platform/Nicohena-Engida"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                </div>
                <div className="overflow-hidden">
                  <span className="block text-[10px] uppercase font-bold text-[#D87836] tracking-wider">
                    GitHub Team
                  </span>
                  <span className="text-xs font-bold text-white truncate block">
                    Engida-Platform / Nicohena
                  </span>
                </div>
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-[#E5E0D5]/90 pt-4 border-t border-white/10">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#D87836]" />
                Addis Ababa, Ethiopia
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Verified Inquiries & 24/7 Response
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

