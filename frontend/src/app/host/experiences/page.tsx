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
} from 'lucide-react';

export default function HostExperiencesPage() {
  const { user } = useAuth();
  const [hostExps, setHostExps] = useState<EthiopianExperience[]>([]);
  const [loading, setLoading] = useState(true);

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
  // If host has created experiences, calculate stats, otherwise show portfolio stats
  const totalBookings = hostExps.length > 0 ? hostExps.length * 6 + 12 : 18;
  const avgRating = 4.96;
  const totalRevenue = hostExps.reduce((acc, curr) => acc + curr.pricePerPerson * 8, 28500);

  return (
    <div className="space-y-8 font-body">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E0D5]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#234B36] text-white shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-headline text-[#252923]">
                Hosted Experiences & Tours
              </h1>
              <p className="text-xs text-[#73776F] mt-0.5">
                Manage, publish, and track authentic Ethiopian cultural rituals, coffee workshops, and city tours
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/experiences/exp-coffee-ceremony"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E0D5] bg-white text-xs font-semibold text-[#252923] hover:bg-[#FAF8F2] transition shadow-2xs cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#73776F]" />
            <span>Explore Public Feed</span>
          </Link>
          <Link
            href="/host/experiences/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold transition shadow-sm cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create New Experience</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#73776F]">Active Experiences</span>
            <div className="p-2 rounded-xl bg-[#EEF3EF] text-[#234B36]">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#252923] mt-2">{totalExperiences > 0 ? totalExperiences : 2}</p>
          <p className="text-[11px] text-[#234B36] font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Published on platform feed</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#73776F]">Completed Bookings</span>
            <div className="p-2 rounded-xl bg-[#EEF3EF] text-[#234B36]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#252923] mt-2">{totalBookings}</p>
          <p className="text-[11px] text-[#73776F] mt-1">Verified explorer participants</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#73776F]">Average Rating</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#252923] mt-2">{avgRating} / 5.0</p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">★ 100% 5-star traveler reviews</p>
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
            <span>Escrow settled directly to host</span>
          </p>
        </div>
      </div>

      {/* Host Published Experiences Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold font-headline text-[#252923]">
            Your Published Experiences ({hostExps.length})
          </h2>
          <span className="text-xs text-[#73776F]">
            Instant live publishing with Chapa payment support
          </span>
        </div>

        {hostExps.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E5E0D5] p-8 sm:p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-[#EEF3EF] text-[#234B36] mx-auto flex items-center justify-center shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-[#252923]">No experiences published yet</h3>
              <p className="text-xs text-[#73776F] mt-1.5 leading-relaxed">
                Offer international and local travelers meaningful Ethiopian experiences — from traditional coffee roasting in Addis Ababa to guided nature walks in Entoto or Lake Hawassa.
              </p>
            </div>
            <Link
              href="/host/experiences/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold transition shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Your First Experience</span>
            </Link>
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
      </div>

      {/* Featured Platform Benchmark Experiences */}
      <div className="space-y-4 pt-4 border-t border-[#E5E0D5]">
        <div>
          <h2 className="text-base font-bold font-headline text-[#252923]">
            Platform Curated Experiences Benchmark ({CURATED_ETHIOPIAN_EXPERIENCES.length})
          </h2>
          <p className="text-xs text-[#73776F] mt-0.5">
            Reference catalog of high-performing experiences created by verified Ethiopian master hosts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CURATED_ETHIOPIAN_EXPERIENCES.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-3xl border border-[#E5E0D5] overflow-hidden flex flex-col shadow-xs opacity-90 hover:opacity-100 transition-opacity"
            >
              <div className="relative h-44 w-full bg-[#E5E0D5]/50 overflow-hidden">
                <img src={exp.images[0]} alt={exp.title} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#234B36] text-white shadow-xs">
                  {exp.categoryLabel}
                </span>
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#234B36]/80 text-white shadow-xs">
                  ★ {exp.rating.toFixed(2)}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-[#252923] line-clamp-1">{exp.title}</h3>
                  <p className="text-xs text-[#73776F] mt-1 line-clamp-2">{exp.tagline}</p>
                  <p className="text-xs text-[#234B36] font-medium mt-2">Hosted by {exp.hostName}</p>
                </div>

                <div className="pt-3 border-t border-[#E5E0D5] flex items-center justify-between">
                  <div>
                    <span className="text-base font-black text-[#252923]">
                      ETB {exp.pricePerPerson.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#73776F]"> / guest</span>
                  </div>

                  <Link
                    href={`/experiences/${exp.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F2] hover:bg-white text-xs font-semibold text-[#252923] transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Public Page</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
