'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import type { RecommendationsResponse, RecommendationItem } from '@/types/guest-ai';
import { Sparkles, MapPin, Bed, Star, ArrowRight, Building2, ShieldCheck } from 'lucide-react';

export default function PersonalizedAiRecommendationsSection() {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const data = await apiFetch<RecommendationsResponse>('/ai/guest/recommendations', {
          method: 'POST',
          body: JSON.stringify({ limit: 4 }),
        });
        setRecommendations(data.recommendations || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not fetch recommendations';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    void fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <section className="py-12 bg-[#FAF8F2] border-y border-[#E5E0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-[#234B36]/10 text-[#234B36] flex items-center justify-center">
              <Sparkles size={16} className="text-[#D87836]" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#252923]">Personalized Stays For You</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-[#E5E0D5] p-4 h-72 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || recommendations.length === 0) {
    return null; // Gracefully degrade if no recommendations or error
  }

  return (
    <section className="py-14 bg-gradient-to-b from-[#FAF8F2] to-white border-y border-[#E5E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#234B36]/10 text-[#234B36] mb-2">
              <Sparkles size={13} className="text-[#D87836]" /> AI Smart Matching
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#252923]">
              Curated Stays Based on Your Preferences
            </h2>
            <p className="text-xs sm:text-sm text-[#73776F] mt-1 max-w-2xl">
              Real listings scored by location suitability, verified reviews, capacity, and your travel habits.
            </p>
          </div>

          <Link
            href="/properties"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#234B36] hover:text-[#1a3828] underline underline-offset-4 group"
          >
            <span>Explore all verified properties</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.map(({ property, score, reason, matchTags }) => (
            <div
              key={property.id}
              className="bg-white rounded-3xl border border-[#E5E0D5] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Property Image & Score Badge */}
                <div className="relative aspect-4/3 w-full bg-[#FAF8F2] overflow-hidden">
                  {property.coverImage ? (
                    <Image
                      src={property.coverImage}
                      alt={property.title}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#73776F]">
                      <Building2 size={36} />
                    </div>
                  )}


                </div>

                {/* Content */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between text-xs text-[#73776F] mb-1.5">
                    <span className="font-semibold text-[#D87836] uppercase text-[10px] tracking-wider">
                      {property.propertyType}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-[#252923]">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {property.averageRating > 0 ? property.averageRating : 'New'}
                      {property.reviewCount > 0 && ` (${property.reviewCount})`}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#252923] line-clamp-1 group-hover:text-[#234B36] transition-colors">
                    {property.title}
                  </h3>

                  <p className="text-xs text-[#73776F] flex items-center gap-1 mt-1 truncate">
                    <MapPin size={12} className="shrink-0 text-[#234B36]" />
                    {property.subCity ? `${property.subCity}, ` : ''}{property.city}
                  </p>

                  {/* Grounded AI Rationale Pill */}
                  <div className="mt-3 p-2.5 rounded-2xl bg-[#FAF8F2] border border-[#E5E0D5]/80 text-[11px] text-[#252923] leading-snug">
                    <p className="italic text-[#73776F]">{reason}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 pt-0 border-t border-[#E5E0D5]/40 mt-2 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-[#252923]">
                    {property.pricePerNight.toLocaleString()} ETB
                  </span>
                  <span className="text-[10px] text-[#73776F]"> / night</span>
                </div>

                <Link
                  href={`/properties/${property.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-semibold transition active:scale-95 shadow-xs"
                >
                  View Stay
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

