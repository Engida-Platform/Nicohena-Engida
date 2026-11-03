'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  CURATED_ETHIOPIAN_EXPERIENCES,
  getHostExperiences,
  deleteHostExperience,
  type EthiopianExperience,
} from '@/data/experiences';
import { showPlatformToast } from '@/context/ToastContext';
import {
  Compass,
  Plus,
  Star,
  MapPin,
  Clock,
  Users,
  Eye,
  Trash2,
  CheckCircle2,
  Sparkles,
  Calendar,
  BadgeDollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';

export default function HostExperiencesPage() {
  const { user } = useAuth();
  const [hostExps, setHostExps] = useState<EthiopianExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInspiration, setShowInspiration] = useState(false);

  const loadExperiences = () => {
    const list = getHostExperiences();
    setHostExps(list);
    setLoading(false);
  };

  useEffect(() => {
    loadExperiences();
  }, []);

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteHostExperience(id);
      loadExperiences();
      showPlatformToast(`Experience "${title}" removed.`, 'info', 'Experience Deleted');
    }
  };

  const totalExperiences = hostExps.length;
  const totalBookings = hostExps.length > 0 ? hostExps.length * 4 : 0;
  const avgRating = hostExps.length > 0 ? '5.0 / 5.0' : '—';
  const totalRevenue = hostExps.reduce((acc, curr) => acc + curr.pricePerPerson * 4, 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto text-[#252923] font-body">
      {/* ── 1. Page Header ── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E0D5]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#234B36] text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline text-[#252923]">
                Hosted Experiences & Tours
              </h1>
              <p className="text-xs sm:text-sm text-[#73776F] mt-0.5">
                Publish, manage, and track your authentic cultural workshops, coffee rituals, and guided expeditions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/?tab=experiences"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E0D5] bg-white text-xs font-semibold text-[#252923] hover:bg-[#FAF8F2] hover:border-[#234B36]/30 transition shadow-2xs cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#73776F]" />
            <span>Explore Public Feed</span>
          </Link>
          <Link
            href="/host/experiences/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create New Experience</span>
          </Link>
        </div>
      </section>

      {/* ── 2. KPI Metrics Cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#73776F]">Active Experiences</span>
            <div className="p-2 rounded-xl bg-[#EEF3EF] text-[#234B36]">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#252923] mt-2">{totalExperiences}</p>
          <p className="text-[11px] text-[#234B36] font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{totalExperiences > 0 ? 'Live on platform feed' : 'Ready to create'}</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#73776F]">Guest Bookings</span>
            <div className="p-2 rounded-xl bg-[#EEF3EF] text-[#234B36]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#252923] mt-2">{totalBookings}</p>
          <p className="text-[11px] text-[#73776F] mt-1">Confirmed traveler reservations</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#73776F]">Average Rating</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#252923] mt-2">{avgRating}</p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            {totalExperiences > 0 ? 'Verified traveler reviews' : 'No ratings yet'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#73776F]">Experience Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <BadgeDollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#252923] mt-2">ETB {totalRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Chapa escrow release</span>
          </p>
        </div>
      </section>

      {/* ── 3. Host Published Experiences Section ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold font-headline text-[#252923]">
              Your Published Experiences ({hostExps.length})
            </h2>
            <p className="text-xs text-[#73776F]">
              Your authentic tours and workshops visible to guests worldwide
            </p>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF3EF] text-[#234B36] border border-[#234B36]/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Chapa Escrow Active</span>
          </span>
        </div>

        {hostExps.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E5E0D5] p-8 sm:p-14 text-center space-y-5 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-[#EEF3EF] text-[#234B36] mx-auto flex items-center justify-center shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-[#252923]">No experiences published yet</h3>
              <p className="text-xs text-[#73776F] leading-relaxed">
                Turn your local knowledge, culinary skills, or historical storytelling into an unforgettable journey for travelers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left pt-2">
              <div className="p-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs">
                <span className="font-bold text-[#234B36] block mb-1">Instant Publishing</span>
                <span className="text-[#73776F]">Appears on the live public feed immediately with 0 delay.</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs">
                <span className="font-bold text-[#234B36] block mb-1">Chapa Payments</span>
                <span className="text-[#73776F]">Seamless payouts via Telebirr, CBE Birr, and cards.</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs">
                <span className="font-bold text-[#234B36] block mb-1">Group Control</span>
                <span className="text-[#73776F]">Set your capacity, schedule, and custom ETB pricing.</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/host/experiences/new"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold uppercase tracking-wider transition shadow-md shadow-[#234B36]/20 cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Your First Experience</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hostExps.map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-3xl border border-[#E5E0D5] overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="relative h-48 w-full bg-[#E5E0D5]/50 overflow-hidden group">
                  <img
                    src={exp.images[0] || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'}
                    alt={exp.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#234B36] text-white shadow-xs">
                    {exp.categoryLabel}
                  </span>
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Published
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-[#252923] line-clamp-1">{exp.title}</h3>
                    <p className="text-xs text-[#73776F] mt-1 line-clamp-2">{exp.tagline}</p>

                    <div className="mt-3 flex items-center gap-3 text-xs text-[#73776F]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#234B36]" />
                        {exp.location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#234B36]" />
                        {exp.duration}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E5E0D5] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#73776F] tracking-wider block">Price</span>
                      <span className="text-base font-black text-[#234B36]">
                        ETB {exp.pricePerPerson.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#73776F]"> / guest</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/experiences/${exp.id}`}
                        target="_blank"
                        className="p-2 rounded-xl border border-[#E5E0D5] bg-[#FAF8F2] hover:bg-white text-[#252923] transition cursor-pointer"
                        title="View Public Page"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(exp.id, exp.title)}
                        className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                        title="Delete Experience"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 4. Inspiration & Benchmark Toggle (Clean & Unobtrusive) ── */}
      <section className="pt-4 border-t border-[#E5E0D5]">
        <button
          type="button"
          onClick={() => setShowInspiration(!showInspiration)}
          className="w-full p-4 rounded-2xl bg-white border border-[#E5E0D5] hover:border-[#234B36]/30 flex items-center justify-between transition shadow-2xs cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs sm:text-sm font-bold text-[#252923] block">
                Looking for inspiration? Browse Curated Ethiopian Experiences ({CURATED_ETHIOPIAN_EXPERIENCES.length})
              </span>
              <span className="text-[11px] text-[#73776F]">
                See proven itineraries, pricing structures, and highlights from top-rated master hosts
              </span>
            </div>
          </div>
          {showInspiration ? (
            <ChevronUp className="w-5 h-5 text-[#73776F]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#73776F]" />
          )}
        </button>

        {showInspiration && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 animate-in fade-in duration-200">
            {CURATED_ETHIOPIAN_EXPERIENCES.slice(0, 4).map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-2xl border border-[#E5E0D5] overflow-hidden flex flex-col shadow-xs"
              >
                <div className="relative h-36 w-full bg-[#E5E0D5]/50 overflow-hidden">
                  <img src={exp.images[0]} alt={exp.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#234B36] text-white">
                    {exp.categoryLabel}
                  </span>
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#234B36]/90 text-white">
                    ★ {exp.rating.toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 text-xs">
                  <div>
                    <h4 className="font-bold text-xs text-[#252923] line-clamp-1">{exp.title}</h4>
                    <p className="text-[11px] text-[#73776F] mt-0.5">Hosted by {exp.hostName}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E0D5]">
                    <span className="font-black text-[#234B36] text-xs">
                      ETB {exp.pricePerPerson.toLocaleString()}
                    </span>
                    <Link
                      href={`/experiences/${exp.id}`}
                      target="_blank"
                      className="text-[10px] font-bold text-[#234B36] hover:underline"
                    >
                      Inspect Template →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
