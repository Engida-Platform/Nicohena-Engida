'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import { getSavedIds, removeWishlist, WISHLIST_UPDATED_EVENT } from '@/lib/wishlist';
import { ETHIOPIAN_FALLBACK_PROPERTIES, type PropertyListing } from '@/components/home/StitchHomePage';
import { apiFetch } from '@/lib/api';
import { showPlatformToast } from '@/context/ToastContext';
import { MapPin, Star, Heart, ArrowUpRight, Compass, Sparkles } from 'lucide-react';

export default function WishlistPage() {
  const [savedProperties, setSavedProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    const ids = getSavedIds();
    if (ids.length === 0) {
      setSavedProperties([]);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch<any[]>('/properties', { skipAuth: true });
      const apiList: PropertyListing[] = Array.isArray(res)
        ? res.map((p) => {
            const isRental =
              (p.propertyType || '').toLowerCase() !== 'for_sale' &&
              (p.propertyType || '').toLowerCase() !== 'for sale';
            let price = Number(p.price);
            if (!Number.isFinite(price) || price <= 0) {
              price = isRental ? 3500 : 8500000;
            }
            return {
              id: p.id,
              title: p.title,
              location: `${p.subCity ? p.subCity + ', ' : ''}${p.city}`,
              subLocation: p.address || `${p.city} neighborhood`,
              details: `${p.maxGuests || 4} guests · ${p.bedrooms || 2} bedrooms · ${p.bathrooms || 1} baths`,
              dates: 'Available this season',
              rating: 4.95,
              reviewsCount: 24,
              pricePerNight: price,
              currency: 'ETB',
              totalBeforeTaxes: price * 5,
              images:
                p.images && p.images.length > 0
                  ? p.images
                  : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'],
              category: p.propertyType?.toLowerCase() || 'apartment',
              propertyType: p.propertyType,
              badge: isRental ? (price > 5000 ? 'Rare Find' : 'Guest Favorite') : 'For Sale',
            };
          })
        : [];

      const map = new Map<string, PropertyListing>();
      ETHIOPIAN_FALLBACK_PROPERTIES.forEach((p) => map.set(p.id, p));
      apiList.forEach((p) => map.set(p.id, p));

      const matched = ids.map((id) => map.get(id)).filter((p): p is PropertyListing => !!p);
      setSavedProperties(matched);
    } catch {
      const matched = ids
        .map((id) => ETHIOPIAN_FALLBACK_PROPERTIES.find((p) => p.id === id))
        .filter((p): p is PropertyListing => !!p);
      setSavedProperties(matched);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();
    window.addEventListener(WISHLIST_UPDATED_EVENT, loadProperties);
    return () => window.removeEventListener(WISHLIST_UPDATED_EVENT, loadProperties);
  }, [loadProperties]);

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeWishlist(id);
    setSavedProperties((prev) => prev.filter((p) => p.id !== id));
    showPlatformToast('Removed from your favorites', 'info', 'Removed');
  };

  return (
    <div className="min-h-screen bg-[#F8F5ED] text-[#252923] flex flex-col font-body">
      <AppHeader />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12 animate-fade-in-up">
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-[#73776F]">
          <Link href="/" className="hover:text-[#234B36] transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#252923]">Wishlist &amp; Saved Stays</span>
        </div>

        {/* Title Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#E5E0D5]/70 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D87836]/15 text-[#9C4B18] text-xs font-bold mb-3">
              <Heart className="w-3.5 h-3.5 fill-[#D87836] text-[#D87836]" />
              <span>Personal Collection</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-headline text-[#252923]">
              Your Saved Stays
            </h1>
            <p className="mt-2 text-sm text-[#73776F] max-w-xl">
              Verified accommodations, luxury penthouses, and scenic retreats across Ethiopia you have curated for future trips.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#E5E0D5] text-xs font-bold text-[#234B36] shadow-2xs">
              {savedProperties.length} {savedProperties.length === 1 ? 'Stay' : 'Stays'} Saved
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition shadow-xs active:scale-95"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore More Stays</span>
            </Link>
          </div>
        </div>

        {/* Saved Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-white border border-[#E5E0D5]" />
            ))}
          </div>
        ) : savedProperties.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#E5E0D5] p-8 max-w-xl mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#FAF8F2] border border-[#E5E0D5] flex items-center justify-center mx-auto mb-4 text-[#D87836]">
              <Heart className="w-8 h-8 fill-[#D87836] text-[#D87836]" />
            </div>
            <h2 className="text-2xl font-bold font-headline text-[#252923]">Your wishlist is empty</h2>
            <p className="mt-2 text-sm text-[#73776F] max-w-md mx-auto leading-relaxed">
              As you browse properties on Engida, tap the heart icon on any card to save your favorite stays here.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#234B36] text-white font-bold text-sm shadow-md hover:bg-[#1a3828] transition active:scale-95"
              >
                <Compass className="w-4 h-4" />
                <span>Browse Verified Ethiopian Stays</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {savedProperties.map((prop) => (
              <article
                key={prop.id}
                className="group flex flex-col bg-white rounded-2xl border border-[#E5E0D5] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300"
              >
                {/* Image Container */}
                <div className="relative aspect-[4/3] w-full bg-[#FAF8F2] overflow-hidden">
                  <img
                    src={prop.images[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {prop.badge && (
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#234B36] text-white shadow-xs">
                      {prop.badge}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(prop.id, e)}
                    title="Remove from wishlist"
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 text-red-600 flex items-center justify-center shadow-xs hover:bg-red-50 hover:scale-110 active:scale-95 transition cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-red-600" />
                  </button>
                </div>

                {/* Details */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs text-[#73776F] flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#234B36] shrink-0" />
                      <span className="truncate">{prop.location}</span>
                    </span>
                    <div className="flex items-center gap-1 text-xs font-bold text-[#252923] shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{prop.rating.toFixed(2)}</span>
                    </div>
                  </div>

                  <Link href={`/properties/${prop.id}`}>
                    <h3
                      className="text-base font-bold text-[#252923] line-clamp-1 group-hover:text-[#234B36] transition-colors"
                      title={prop.title}
                    >
                      {prop.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-[#73776F] mt-1 line-clamp-1">{prop.details}</p>

                  <div className="mt-4 pt-3 border-t border-[#E5E0D5]/60 flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-[#252923]">
                        ETB {prop.pricePerNight.toLocaleString()}
                      </span>
                      <span className="text-xs text-[#73776F]"> / night</span>
                    </div>

                    <Link
                      href={`/properties/${prop.id}`}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition active:scale-95 shadow-2xs"
                    >
                      <span>Reserve</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
