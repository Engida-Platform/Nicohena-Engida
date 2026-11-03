'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { showPlatformToast } from '@/context/ToastContext';
import {
  Sparkles,
  MapPin,
  Clock,
  Users,
  Star,
  CheckCircle2,
  Calendar,
  X,
  Compass,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  CURATED_ETHIOPIAN_EXPERIENCES,
  getAllExperiences,
  type EthiopianExperience,
} from '@/data/experiences';

export { CURATED_ETHIOPIAN_EXPERIENCES, type EthiopianExperience };

export default function ExperiencesSection() {
  const [allExps, setAllExps] = useState<EthiopianExperience[]>(CURATED_ETHIOPIAN_EXPERIENCES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    setAllExps(getAllExperiences());
  }, []);
  const [bookingModalExp, setBookingModalExp] = useState<EthiopianExperience | null>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const categories = [
    { id: 'all', label: 'All Experiences', icon: 'auto_awesome' },
    { id: 'coffee', label: 'Coffee & Culinary', icon: 'coffee' },
    { id: 'hiking', label: 'Hiking & Treks', icon: 'hiking' },
    { id: 'heritage', label: 'Heritage & History', icon: 'castle' },
    { id: 'water', label: 'Lakes & Water', icon: 'water' },
    { id: 'wildlife', label: 'Wildlife & Safari', icon: 'pets' },
  ];

  const filteredExperiences = allExps.filter((exp) => {
    if (selectedCategory === 'all') return true;
    return exp.category === selectedCategory;
  });

  const handleBookExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModalExp) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setBookingSuccess(true);
      showPlatformToast(
        `Experience reserved! ${bookingModalExp.hostName} will confirm your schedule.`,
        'success',
        'Reservation Submitted'
      );
    }, 600);
  };

  return (
    <div className="w-full bg-[#FAF8F2] py-8 px-4 sm:px-6 lg:px-12 font-body">
      {/* Header Banner */}
      <div className="max-w-[1360px] mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E0D5]">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D87836]" />
              <span>Authentic Ethiopian Experiences</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-headline text-[#252923] tracking-tight">
              Curated Cultural Journeys & Guided Treks
            </h1>
            <p className="mt-2 text-sm text-[#73776F] max-w-2xl leading-relaxed">
              Led by master coffee roasters, Simien mountain scouts, and native historians. Every journey is protected with ENGIDA escrow guarantees.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/host/experiences/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition shadow-xs active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Host an Experience</span>
            </Link>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#234B36] text-white shadow-xs'
                    : 'bg-white border border-[#E5E0D5] text-[#252923] hover:border-[#234B36]/40 hover:bg-[#FAF8F2]'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Experiences Grid */}
      <div className="max-w-[1360px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#73776F]">
            Showing {filteredExperiences.length} Verified Experience{filteredExperiences.length === 1 ? '' : 's'}
          </p>
          <span className="text-xs text-[#234B36] font-semibold bg-[#EEF3EF] px-3 py-1 rounded-full">
            100% Escrow & Local Guide Protection
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredExperiences.map((exp) => (
            <article
              key={exp.id}
              className="group flex flex-col bg-white rounded-2xl border border-[#E5E0D5] overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Image & Host Badge */}
              <Link
                href={`/experiences/${exp.id}`}
                className="relative aspect-[4/3] w-full bg-[#FAF8F2] overflow-hidden block"
              >
                <img
                  src={exp.images[0]}
                  alt={exp.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#234B36]/90 backdrop-blur-xs text-white shadow-xs">
                  {exp.categoryLabel}
                </span>

                {/* Host Avatar on bottom right of image */}
                <div
                  className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-md"
                  title={`Hosted by ${exp.hostName}`}
                >
                  <img
                    src={exp.hostAvatar}
                    alt={exp.hostName}
                    className="w-5 h-5 rounded-full object-cover border border-[#E5E0D5]"
                  />
                  <span className="text-[11px] font-bold text-[#252923] truncate max-w-[90px]">
                    {exp.hostName.split(' ')[0]}
                  </span>
                </div>
              </Link>

              {/* Card Body */}
              <div className="p-5 flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs text-[#73776F] flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#234B36] shrink-0" />
                      <span className="truncate">{exp.location}</span>
                    </span>
                    <div className="flex items-center gap-1 text-xs font-bold text-[#252923] shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{exp.rating.toFixed(2)}</span>
                      <span className="text-[#73776F] font-normal">({exp.reviewsCount})</span>
                    </div>
                  </div>

                  <Link href={`/experiences/${exp.id}`}>
                    <h3
                      className="text-base font-bold text-[#252923] line-clamp-2 leading-snug group-hover:text-[#234B36] transition-colors"
                      title={exp.title}
                    >
                      {exp.title}
                    </h3>
                  </Link>

                  <div className="mt-3 flex items-center gap-3 text-xs text-[#73776F]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#D87836]" />
                      {exp.duration}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#D87836]" />
                      {exp.groupSize}
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs text-[#73776F] line-clamp-2 leading-relaxed">
                    {exp.description}
                  </p>
                </div>

                {/* Price & Action */}
                <div className="mt-5 pt-3.5 border-t border-[#E5E0D5]/70 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-base font-bold text-[#252923]">
                      ETB {exp.pricePerPerson.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#73776F]"> / person</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/experiences/${exp.id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F2] hover:bg-[#EEF3EF] text-[#252923] text-xs font-semibold transition active:scale-95 shadow-2xs"
                    >
                      Details
                    </Link>
                    <button
                      type="button"
                      onClick={() => setBookingModalExp(exp)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition active:scale-95 shadow-xs cursor-pointer"
                    >
                      <span>Reserve</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Quick Reservation Modal */}
      {bookingModalExp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => !isSubmitting && setBookingModalExp(null)}
        >
          <div
            className="bg-[#FAF8F2] rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D5]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D87836]">
                  {bookingModalExp.categoryLabel}
                </span>
                <h3 className="text-lg font-bold font-headline text-[#252923] line-clamp-1">
                  {bookingModalExp.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBookingModalExp(null)}
                disabled={isSubmitting}
                className="w-8 h-8 rounded-full bg-[#E5E0D5]/50 hover:bg-[#E5E0D5] text-[#252923] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#EEF3EF] text-[#234B36] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-bold text-[#252923]">Reservation Received!</h4>
                <p className="text-xs text-[#73776F] max-w-sm mx-auto leading-relaxed">
                  Your reservation request for <strong>{guestCount} guest(s)</strong> on <strong>{selectedDate}</strong> has been secured with host <strong>{bookingModalExp.hostName}</strong>.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href={`/experiences/${bookingModalExp.id}`}
                    className="px-5 py-2.5 rounded-xl border border-[#E5E0D5] bg-white text-[#252923] text-xs font-bold hover:bg-[#FAF8F2] transition"
                  >
                    View Experience Details
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingModalExp(null);
                      setBookingSuccess(false);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookExperience} className="space-y-4 pt-4">
                <div className="flex items-center gap-4 p-3.5 bg-white rounded-2xl border border-[#E5E0D5]">
                  <img
                    src={bookingModalExp.images[0]}
                    alt={bookingModalExp.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#252923] line-clamp-1">
                      {bookingModalExp.title}
                    </p>
                    <p className="text-[11px] text-[#73776F]">
                      Hosted by {bookingModalExp.hostName}
                    </p>
                    <p className="text-xs font-extrabold text-[#234B36] mt-1">
                      ETB {bookingModalExp.pricePerPerson.toLocaleString()} / person
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E0D5] text-xs font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1">
                      Guests
                    </label>
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E0D5] text-xs font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1">
                    Phone Number (Telebirr / Call)
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+251 9... or 09..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E0D5] text-xs text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                  />
                </div>

                <div className="pt-2 border-t border-[#E5E0D5] flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#73776F]">Estimated Total</span>
                  <span className="text-base font-extrabold text-[#234B36]">
                    ETB {(bookingModalExp.pricePerPerson * guestCount).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setBookingModalExp(null)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl border border-[#d8d0c8] text-xs font-semibold text-[#605850] hover:bg-[#faf5ee] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? 'Securing...' : 'Reserve Spot'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
