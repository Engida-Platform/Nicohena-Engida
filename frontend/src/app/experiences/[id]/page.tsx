'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import { CURATED_ETHIOPIAN_EXPERIENCES, type EthiopianExperience } from '@/data/experiences';
import { useAuth } from '@/context/AuthContext';
import { showPlatformToast } from '@/context/ToastContext';
import {
  MapPin,
  Clock,
  Users,
  Star,
  CheckCircle2,
  Calendar,
  X,
  Compass,
  ArrowLeft,
  Share2,
  Heart,
  ShieldCheck,
  Languages,
  Ticket,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Phone,
  CreditCard,
  ChevronRight,
} from 'lucide-react';

export default function ExperienceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const expId = params?.id as string;

  const experience = CURATED_ETHIOPIAN_EXPERIENCES.find((e) => e.id === expId) || CURATED_ETHIOPIAN_EXPERIENCES[0];

  const [selectedSlot, setSelectedSlot] = useState(experience.timeSlots[0]?.id || 'default');
  const [guestCount, setGuestCount] = useState(2);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [savedWishlist, setSavedWishlist] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [messageHostOpen, setMessageHostOpen] = useState(false);
  const [hostMessage, setHostMessage] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState(false);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewList, setReviewList] = useState(experience.reviews);

  const pricePerPerson = experience.pricePerPerson;
  const totalPrice = pricePerPerson * guestCount;

  const handleToggleWishlist = () => {
    setSavedWishlist(!savedWishlist);
    showPlatformToast(
      !savedWishlist ? 'Saved to your favorite experiences' : 'Removed from saved experiences',
      'info',
      'Experience Wishlist'
    );
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showPlatformToast('Experience link copied to clipboard!', 'success', 'Link Copied');
    }
  };

  const handleConfirmReservation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setReservationSuccess(true);
      showPlatformToast(
        `Reservation confirmed! ${experience.hostName} has received your schedule for ${guestCount} guest(s).`,
        'success',
        'Experience Reserved'
      );
    }, 700);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    const newRev = {
      id: `rev-${Date.now()}`,
      author: user?.name || 'Verified Explorer',
      date: 'Just now',
      avatar: (user as any)?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      rating: reviewRating,
      comment: reviewComment.trim(),
    };

    setReviewList([newRev, ...reviewList]);
    setReviewModalOpen(false);
    setReviewComment('');
    showPlatformToast('Thank you! Your experience review has been published.', 'success', 'Review Added');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostMessage.trim()) return;
    setMessageHostOpen(false);
    setHostMessage('');
    showPlatformToast(`Message forwarded to ${experience.hostName}!`, 'success', 'Message Sent');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F2] font-body text-[#252923] flex flex-col">
      <AppHeader />

      <main className="w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-5 border-b border-[#E5E0D5]/70">
          <Link
            href="/?tab=experiences"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#234B36] hover:text-[#1a3828] transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Experiences</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E5E0D5] bg-white text-xs font-semibold text-[#252923] hover:bg-[#FAF8F2] transition cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-[#73776F]" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              type="button"
              onClick={handleToggleWishlist}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E5E0D5] bg-white text-xs font-semibold text-[#252923] hover:bg-[#FAF8F2] transition cursor-pointer shadow-2xs"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  savedWishlist ? 'fill-rose-500 text-rose-500' : 'text-[#73776F]'
                }`}
              />
              <span className="hidden sm:inline">
                {savedWishlist ? 'Saved' : 'Save'}
              </span>
            </button>
          </div>
        </div>

        {/* Header Title & Badges */}
        <div className="pt-6 pb-6">
          <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#234B36] text-white shadow-xs">
              {experience.categoryLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#252923]">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{experience.rating.toFixed(2)}</span>
              <span className="text-[#73776F] font-normal">
                ({experience.reviewsCount} verified reviews)
              </span>
            </span>
            <span className="text-[#73776F]">•</span>
            <span className="text-xs text-[#73776F] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#234B36]" />
              {experience.location}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-headline text-[#252923] leading-tight text-balance">
            {experience.title}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#73776F] font-medium leading-relaxed max-w-3xl">
            {experience.tagline}
          </p>
        </div>

        {/* Media Photo Gallery */}
        <section className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-3xl overflow-hidden aspect-[16/9] md:aspect-[21/9] max-h-[480px]">
            <div className="md:col-span-2 relative h-full bg-[#E5E0D5]/50 overflow-hidden group">
              <img
                src={experience.images[0]}
                alt={experience.title}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 pointer-events-none" />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                <Sparkles className="w-4 h-4 text-[#D87836]" />
                <span className="text-xs font-bold text-[#252923]">Curated Authentic Experience</span>
              </div>
            </div>

            <div className="hidden md:flex flex-col gap-3 h-full">
              {experience.images.slice(1, 3).map((img, idx) => (
                <div key={idx} className="relative flex-1 bg-[#E5E0D5]/50 overflow-hidden group rounded-2xl">
                  <img
                    src={img}
                    alt={`${experience.title} ${idx + 2}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              ))}
              {experience.images.length === 1 && (
                <div className="relative flex-1 bg-[#E5E0D5]/50 overflow-hidden rounded-2xl">
                  <img
                    src={experience.images[0]}
                    alt={experience.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Core Layout Grid: 2-Column Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Comprehensive Experience Content (8 cols) */}
          <div className="lg:col-span-8 space-y-10">
            {/* Host Identity Card */}
            <div className="p-6 bg-white rounded-3xl border border-[#E5E0D5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xs">
              <div className="flex items-center gap-4">
                <img
                  src={experience.hostAvatar}
                  alt={experience.hostName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#234B36] shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#252923]">
                      Hosted by {experience.hostName}
                    </h2>
                    <CheckCircle2 className="w-4 h-4 text-[#234B36] fill-[#234B36]/10" />
                  </div>
                  <p className="text-xs text-[#73776F] font-medium mt-0.5">
                    {experience.hostRole}
                  </p>
                  <p className="text-[11px] text-[#234B36] font-semibold mt-1">
                    ⚡ {experience.hostResponseRate}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMessageHostOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#234B36] text-[#234B36] text-xs font-bold hover:bg-[#EEF3EF] transition cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Contact Host</span>
              </button>
            </div>

            {/* Key Specifications Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 px-5 bg-[#F4EFE6] rounded-2xl border border-[#E5E0D5]/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#234B36] shadow-2xs">
                  <Clock className="w-5 h-5 text-[#234B36]" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#73776F]">Duration</span>
                  <span className="text-xs font-bold text-[#252923]">{experience.duration}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#234B36] shadow-2xs">
                  <Users className="w-5 h-5 text-[#234B36]" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#73776F]">Group Size</span>
                  <span className="text-xs font-bold text-[#252923]">{experience.groupSize}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#234B36] shadow-2xs">
                  <Languages className="w-5 h-5 text-[#234B36]" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#73776F]">Languages</span>
                  <span className="text-xs font-bold text-[#252923] truncate">
                    {experience.languages.join(', ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#234B36] shadow-2xs">
                  <Ticket className="w-5 h-5 text-[#234B36]" />
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#73776F]">Ticket</span>
                  <span className="text-xs font-bold text-[#252923]">Mobile Voucher</span>
                </div>
              </div>
            </div>

            {/* Overview / Story */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold font-headline text-[#252923]">
                About This Experience
              </h2>
              <p className="text-sm text-[#3A302A] leading-relaxed">
                {experience.description}
              </p>
              <p className="text-xs text-[#73776F] leading-relaxed italic bg-white p-4 rounded-2xl border border-[#E5E0D5]/60">
                "{experience.hostBio}"
              </p>
            </div>

            {/* Experience Highlights */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold font-headline text-[#252923]">
                Highlights
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {experience.highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3.5 bg-white rounded-2xl border border-[#E5E0D5]/70 shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#234B36] shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-[#252923] leading-snug">
                      {h}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-Step Itinerary ("What You'll Do") */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-headline text-[#252923]">
                  What You'll Do (Step-by-Step Itinerary)
                </h2>
                <span className="text-xs font-bold text-[#234B36] bg-[#EEF3EF] px-3 py-1 rounded-full">
                  {experience.itinerary.length} Steps
                </span>
              </div>

              <div className="space-y-4 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5E0D5]">
                {experience.itinerary.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 pl-1">
                    <div className="w-8 h-8 rounded-full bg-[#234B36] text-white text-xs font-bold flex items-center justify-center shrink-0 z-10 shadow-xs">
                      {idx + 1}
                    </div>
                    <div className="flex-1 bg-white p-5 rounded-2xl border border-[#E5E0D5] shadow-2xs">
                      {step.time && (
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FAF8F2] border border-[#E5E0D5] text-[10px] font-bold text-[#D87836] mb-1.5">
                          {step.time}
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-[#252923]">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-[#73776F] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inclusions & Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="p-6 bg-white rounded-3xl border border-[#E5E0D5] shadow-2xs">
                <h3 className="text-base font-bold text-[#252923] flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-[#234B36]" />
                  <span>What's Included</span>
                </h3>
                <ul className="space-y-2.5">
                  {experience.included.map((item, idx) => (
                    <li key={idx} className="text-xs text-[#73776F] flex items-start gap-2">
                      <span className="text-[#234B36] font-bold mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-[#E5E0D5] shadow-2xs">
                <h3 className="text-base font-bold text-[#252923] flex items-center gap-2 mb-4">
                  <Compass className="w-4 h-4 text-[#D87836]" />
                  <span>What to Bring</span>
                </h3>
                <ul className="space-y-2.5">
                  {experience.toBring.map((item, idx) => (
                    <li key={idx} className="text-xs text-[#73776F] flex items-start gap-2">
                      <span className="text-[#D87836] font-bold mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Meeting Point & Directions */}
            <div className="p-6 bg-white rounded-3xl border border-[#E5E0D5] space-y-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#234B36]" />
                <h2 className="text-lg font-bold text-[#252923]">
                  Meeting Point & Arrival
                </h2>
              </div>
              <p className="text-sm font-bold text-[#234B36]">
                {experience.meetingPoint}
              </p>
              <p className="text-xs text-[#73776F] leading-relaxed bg-[#FAF8F2] p-4 rounded-2xl border border-[#E5E0D5]/60">
                {experience.meetingPointDirections}
              </p>
            </div>

            {/* Guest Reviews Section */}
            <div className="p-6 bg-white rounded-3xl border border-[#E5E0D5] space-y-6 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#E5E0D5]">
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                  <h2 className="text-xl font-bold font-headline text-[#252923]">
                    {experience.rating.toFixed(2)} · {reviewList.length} Guest Reviews
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setReviewModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Leave a Review</span>
                </button>
              </div>

              <div className="space-y-4">
                {reviewList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E5E0D5]/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rev.avatar}
                          alt={rev.author}
                          className="w-8 h-8 rounded-full object-cover border border-[#E5E0D5]"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#252923]">{rev.author}</p>
                          <p className="text-[10px] text-[#73776F]">{rev.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[#3A302A] leading-relaxed">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Booking / Reservation Widget (4 cols) */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 bg-white rounded-3xl border border-[#E5E0D5] p-6 shadow-xl space-y-6">
              {/* Pricing Header */}
              <div className="flex items-baseline justify-between pb-4 border-b border-[#E5E0D5]">
                <div>
                  <span className="text-2xl font-bold font-headline text-[#252923]">
                    ETB {pricePerPerson.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#73776F]"> / person</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#252923]">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{experience.rating.toFixed(2)}</span>
                </div>
              </div>

              {/* Date & Slot Picker */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                    Select Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                    Select Time Session
                  </label>
                  <div className="space-y-2">
                    {experience.timeSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot.id)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                            isSelected
                              ? 'border-[#234B36] bg-[#EEF3EF] text-[#234B36] font-bold'
                              : 'border-[#E5E0D5] bg-[#FAF8F2] text-[#252923] hover:border-[#234B36]/50'
                          }`}
                        >
                          <div>
                            <p className="font-bold">{slot.label}</p>
                            <p className="text-[11px] text-[#73776F]">{slot.time}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-[#234B36] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Guest Counter */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                    Number of Guests
                  </label>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5]">
                    <div>
                      <span className="text-xs font-bold text-[#252923]">
                        {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
                      </span>
                      <span className="block text-[10px] text-[#73776F]">
                        Max {experience.maxGuests} per group
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={guestCount <= 1}
                        onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                        className="w-7 h-7 rounded-lg bg-white border border-[#E5E0D5] text-[#252923] disabled:opacity-40 font-bold flex items-center justify-center hover:bg-[#EEF3EF] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-bold">
                        {guestCount}
                      </span>
                      <button
                        type="button"
                        disabled={guestCount >= experience.maxGuests}
                        onClick={() =>
                          setGuestCount((c) => Math.min(experience.maxGuests, c + 1))
                        }
                        className="w-7 h-7 rounded-lg bg-white border border-[#E5E0D5] text-[#252923] disabled:opacity-40 font-bold flex items-center justify-center hover:bg-[#EEF3EF] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="pt-3 border-t border-[#E5E0D5]/70 space-y-2 text-xs">
                <div className="flex justify-between text-[#73776F]">
                  <span>
                    ETB {pricePerPerson.toLocaleString()} × {guestCount} guest{guestCount > 1 ? 's' : ''}
                  </span>
                  <span>ETB {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#73776F]">
                  <span>Escrow & Safety Guarantee</span>
                  <span className="text-[#234B36] font-semibold">Included</span>
                </div>
                <div className="pt-2 border-t border-[#E5E0D5] flex justify-between font-bold text-sm text-[#252923]">
                  <span>Total Amount</span>
                  <span className="text-[#234B36]">ETB {totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                type="button"
                onClick={() => setReservationModalOpen(true)}
                className="w-full py-3.5 rounded-2xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold uppercase tracking-wider transition active:scale-98 shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Reserve Experience</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Ethiopian Escrow Protection Badge */}
              <div className="p-3.5 rounded-2xl bg-[#EEF3EF] border border-[#234B36]/20 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#234B36] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#234B36] leading-relaxed">
                  <span className="font-bold">ENGIDA Escrow Protected:</span> Funds are held securely until the experience starts. Free cancellation up to 24 hours prior.
                </div>
              </div>

              {/* Payment Methods */}
              <div className="text-center">
                <span className="text-[10px] text-[#73776F] uppercase tracking-wider font-semibold">
                  Secure local payment via Telebirr · CBE Birr · Cards
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Reservation Confirmation Modal */}
      {reservationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => !isSubmitting && setReservationModalOpen(false)}
        >
          <div
            className="bg-[#FAF8F2] rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <h3 className="text-lg font-bold font-headline text-[#252923]">
                Confirm Experience Reservation
              </h3>
              <button
                type="button"
                onClick={() => setReservationModalOpen(false)}
                disabled={isSubmitting}
                className="w-8 h-8 rounded-full bg-[#E5E0D5]/50 hover:bg-[#E5E0D5] text-[#252923] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reservationSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#EEF3EF] text-[#234B36] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-[#252923]">
                  Reservation Confirmed!
                </h4>
                <p className="text-xs text-[#73776F] leading-relaxed">
                  Your spot for <strong>{guestCount} guest(s)</strong> on{' '}
                  <strong>{selectedDate}</strong> has been secured with{' '}
                  <strong>{experience.hostName}</strong>. A voucher has been dispatched to your account.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReservationModalOpen(false);
                    setReservationSuccess(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmReservation} className="space-y-4 pt-4">
                <div className="p-3 bg-white rounded-xl border border-[#E5E0D5] text-xs space-y-1">
                  <p className="font-bold text-[#252923]">{experience.title}</p>
                  <p className="text-[#73776F]">
                    Date: {selectedDate} · {guestCount} Guest(s)
                  </p>
                  <p className="text-[#234B36] font-bold">
                    Total: ETB {totalPrice.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1">
                    Contact Phone Number (Telebirr / Call)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+251 9... or 09..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E0D5] text-xs text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1">
                    Special Requests / Dietary Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder="e.g. Vegetarian diet, hotel pickup inquiry..."
                    className="w-full p-2.5 rounded-xl bg-white border border-[#E5E0D5] text-xs text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#EEF3EF] border border-[#234B36]/20 text-[11px] text-[#234B36] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Escrow guarantee active. Cancel anytime up to 24h prior.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReservationModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-[#d8d0c8] text-xs font-semibold text-[#605850] hover:bg-[#faf5ee] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? 'Securing Spot...' : 'Confirm & Reserve'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Message Host Modal */}
      {messageHostOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setMessageHostOpen(false)}
        >
          <div
            className="bg-[#FAF8F2] rounded-3xl border border-[#E5E0D5] p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <h3 className="text-base font-bold font-headline text-[#252923]">
                Message {experience.hostName}
              </h3>
              <button
                type="button"
                onClick={() => setMessageHostOpen(false)}
                className="w-7 h-7 rounded-full bg-[#E5E0D5]/50 hover:bg-[#E5E0D5] text-[#252923] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4 pt-4">
              <textarea
                rows={4}
                required
                value={hostMessage}
                onChange={(e) => setHostMessage(e.target.value)}
                placeholder={`Ask ${experience.hostName} about group flexibility, meeting points, photography, or custom schedules...`}
                className="w-full p-3 rounded-xl bg-white border border-[#E5E0D5] text-xs text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] resize-none"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMessageHostOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#d8d0c8] text-xs font-semibold text-[#605850] hover:bg-[#faf5ee] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hostMessage.trim()}
                  className="px-5 py-2 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Experience Modal */}
      {reviewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setReviewModalOpen(false)}
        >
          <div
            className="bg-[#FAF8F2] rounded-3xl border border-[#E5E0D5] p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
              <h3 className="text-base font-bold font-headline text-[#252923]">
                Review This Experience
              </h3>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#E5E0D5]/50 hover:bg-[#E5E0D5] text-[#252923] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 pt-4">
              <div className="text-center py-2 bg-white rounded-xl border border-[#E5E0D5]/60">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                  Rating
                </label>
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReviewRating(s)}
                      className="p-1 hover:scale-110 transition cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          s <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-[#E5E0D5]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1">
                  Your Review
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details of your experience, host hospitality, guide knowledge, and recommendations..."
                  className="w-full p-3 rounded-xl bg-white border border-[#E5E0D5] text-xs text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#d8d0c8] text-xs font-semibold text-[#605850] hover:bg-[#faf5ee] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reviewComment.trim()}
                  className="px-5 py-2 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  );
}

