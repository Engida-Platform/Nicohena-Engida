'use client';

import { showPlatformToast } from '@/context/ToastContext';
/**
 * ENGIDA — Public Property Search & Discovery Page
 * Phase 2: Guest Discovery Engine
 * Routes: /properties
 *
 * Fetches from GET /properties with Ethiopian-first filters:
 * city, listingType, propertyType, minPrice, maxPrice, guests, search
 */

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { Property, PaginatedResponse } from '@/types';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import { computePropertyTrustScore } from '@/lib/trustScore';
import AiConversationalSearchModal from '@/components/search/AiConversationalSearchModal';
import PersonalizedAiRecommendationsSection from '@/components/home/PersonalizedAiRecommendationsSection';
import AiPropertyComparisonModal from '@/components/compare/AiPropertyComparisonModal';
import AiBookingAssistantWidget from '@/components/assistant/AiBookingAssistantWidget';

// ─── Ethiopian Cities ─────────────────────────────────────────────────────────
const ETHIOPIAN_CITIES = [
  'All Ethiopia',
  'Addis Ababa',
  'Bahir Dar',
  'Hawassa',
  'Dire Dawa',
  'Gondar',
  'Mekele',
  'Jimma',
  'Adama',
];

const PROPERTY_TYPES = ['HOUSE', 'APARTMENT', 'VILLA', 'STUDIO', 'BEDROOM'] as const;
type PropertyTypeFilter = (typeof PROPERTY_TYPES)[number];

const SORT_OPTIONS = [
  { value: 'createdAt:DESC', label: 'Newest' },
  { value: 'pricePerNight:ASC', label: 'Price: Low → High' },
  { value: 'pricePerNight:DESC', label: 'Price: High → Low' },
  { value: 'bedrooms:DESC', label: 'Most Bedrooms' },
];

// ─── Fallback images ──────────────────────────────────────────────────────────
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=70',
];

function getPropertyImage(property: Property): string {
  if (property.coverImage) return property.coverImage;
  if (property.images && property.images.length > 0) return property.images[0];
  const idx = property.title.charCodeAt(0) % FALLBACK_IMAGES.length;
  return FALLBACK_IMAGES[idx];
}

// ─── Trust Badge ──────────────────────────────────────────────────────────────
function TrustBadge({ property }: { property: Property }) {
  const result = computePropertyTrustScore(property as Parameters<typeof computePropertyTrustScore>[0]);
  const score = result.score;
  if (score < 50) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEF3EF] text-[#234B36] text-[10px] font-bold border border-[#234B36]/20">
      <span className="material-symbols-outlined text-[11px] text-[#234B36]">verified</span>
      {score >= 80 ? 'Top Host' : 'Verified'}
    </span>
  );
}

// ─── Property Card ────────────────────────────────────────────────────────────
function PropertyCard({
  property,
  isComparing,
  onToggleCompare,
}: {
  property: Property;
  isComparing?: boolean;
  onToggleCompare?: (e: React.MouseEvent) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const image = imgError ? FALLBACK_IMAGES[0] : getPropertyImage(property);
  const isRental = !property.listingType || property.listingType === 'RENTAL';
  const price = isRental
    ? `ETB ${Number(property.pricePerNight || 3500).toLocaleString()}/night`
    : `ETB ${Number(property.salePrice || 8500000).toLocaleString()} (For Sale)`;

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group bg-white rounded-2xl border border-[#E5E0D5] shadow-[0_2px_12px_rgba(35,75,54,0.06)] hover:shadow-[0_8px_32px_rgba(35,75,54,0.12)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#EEF3EF]">
        {/* Subtle compare toggle button */}
        <button
          type="button"
          onClick={onToggleCompare}
          title={isComparing ? 'Remove from comparison' : 'Compare listing'}
          className={`absolute top-2.5 left-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
            isComparing
              ? 'bg-[#234B36] text-white shadow-md ring-2 ring-white scale-105 opacity-100'
              : 'bg-white/90 hover:bg-white text-[#252923] opacity-0 group-hover:opacity-100'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {isComparing ? 'check' : 'balance'}
          </span>
        </button>
        <img
          src={image}
          alt={property.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[#252923] text-[10px] font-bold border border-white/60 shadow-xs">
            {property.propertyType}
          </span>
        </div>
        {/* Listing type badge */}
        {property.listingType === 'SALE' && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#234B36] text-white text-[10px] font-bold shadow-xs">
              For Sale
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        {/* Location & Trust */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-[#73776F] font-medium truncate">
            {property.subCity ? `${property.subCity}, ` : ''}{property.city}
          </p>
          <TrustBadge property={property} />
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#252923] leading-tight line-clamp-2 group-hover:text-[#234B36] transition-colors">
          {property.title}
        </h3>

        {/* Specs row */}
        <div className="flex items-center gap-3 text-[11px] text-[#73776F]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">bed</span>
            {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">bathtub</span>
            {property.bathrooms} bath
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">group</span>
            {property.maxGuests} guests
          </span>
        </div>

        {/* Amenities preview */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {property.amenities.slice(0, 3).map((a) => (
              <span key={a.id} className="text-[10px] text-[#73776F] bg-[#F8F5ED] rounded-full px-2 py-0.5 border border-[#E5E0D5]">
                {a.name}
              </span>
            ))}
            {property.amenities.length > 3 && (
              <span className="text-[10px] text-[#73776F]">+{property.amenities.length - 3} more</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mt-auto pt-3 border-t border-[#E5E0D5]/70 flex items-baseline justify-between">
          <span className="text-sm font-black text-[#252923]">{price}</span>
          <span className="text-[10px] text-[#73776F] font-medium">
            {isRental ? 'per night' : 'sale price'}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E0D5] overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-[#EEF3EF]" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-24 bg-[#EEF3EF] rounded-full" />
        <div className="h-4 w-full bg-[#EEF3EF] rounded-lg" />
        <div className="h-3 w-3/4 bg-[#EEF3EF] rounded-lg" />
        <div className="flex gap-2 pt-2">
          <div className="h-5 w-14 bg-[#EEF3EF] rounded-full" />
          <div className="h-5 w-14 bg-[#EEF3EF] rounded-full" />
          <div className="h-5 w-14 bg-[#EEF3EF] rounded-full" />
        </div>
        <div className="h-5 w-32 bg-[#EEF3EF] rounded-full mt-2 pt-3" />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-[#EEF3EF] border border-[#234B36]/20 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-[#234B36]">search_off</span>
      </div>
      <h3 className="text-xl font-black text-[#252923] mb-2">No properties found</h3>
      <p className="text-sm text-[#73776F] max-w-sm leading-relaxed mb-6">
        No verified listings match your current filters. Try adjusting your search or explore all Ethiopian cities.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="px-6 py-3 rounded-xl bg-[#234B36] text-white text-sm font-semibold hover:bg-[#1a3828] transition active:scale-95 cursor-pointer shadow-md shadow-[#234B36]/20"
      >
        Reset Filters
      </button>
    </div>
  );
}

// ─── Search Content (inside Suspense) ─────────────────────────────────────────
function PropertiesSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCity = searchParams.get('city') || 'All Ethiopia';
  const initialListingType = (searchParams.get('listingType') as 'RENTAL' | 'SALE' | '') || '';
  const initialPropertyType = (searchParams.get('propertyType') as PropertyTypeFilter | '') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialDestination = searchParams.get('destination') || '';
  const initialSearch = searchParams.get('search') || '';

  // ── Filter state ──
  const [selectedCity, setSelectedCity] = useState<string>(initialCity);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedDestination, setSelectedDestination] = useState<string>(initialDestination);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string; icon?: string }>>([]);
  const [destinations, setDestinations] = useState<Array<{ id: string; name: string; slug: string; city: string }>>([]);
  const [listingType, setListingType] = useState<'RENTAL' | 'SALE' | ''>(initialListingType);
  const [propertyType, setPropertyType] = useState<PropertyTypeFilter | ''>(initialPropertyType);
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [guestCount, setGuestCount] = useState(searchParams.get('guests') || '');
  const [searchText, setSearchText] = useState(initialSearch);
  const [sortValue, setSortValue] = useState('createdAt:DESC');
  const [showFilters, setShowFilters] = useState(false);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Load catalog categories and destinations
  useEffect(() => {
    apiFetch<Array<{ id: string; name: string; slug: string; icon?: string }>>('/catalog/categories', { skipAuth: true })
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
    apiFetch<Array<{ id: string; name: string; slug: string; city: string }>>('/catalog/destinations', { skipAuth: true })
      .then((data) => {
        if (Array.isArray(data)) setDestinations(data);
      })
      .catch(() => {});
  }, []);

  const handleToggleCompare = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        showPlatformToast('You can compare up to 3 properties at a time.', 'warning', 'Comparison Limit');
        return prev;
      }
      return [...prev, id];
    });
  };

  // ── Data state ──
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchProperties = useCallback(
    async (pageNum: number, append: boolean) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams();
        if (selectedCity !== 'All Ethiopia') params.set('city', selectedCity);
        if (selectedCategory) params.set('category', selectedCategory);
        if (selectedDestination) params.set('destination', selectedDestination);
        if (listingType) params.set('listingType', listingType);
        if (propertyType) params.set('propertyType', propertyType);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (guestCount) params.set('guests', guestCount);
        if (searchText.trim()) params.set('search', searchText.trim());
        const [sortBy, sortOrder] = sortValue.split(':');
        params.set('sortBy', sortBy);
        params.set('sortOrder', sortOrder);
        params.set('page', String(pageNum));
        params.set('limit', '12');

        const result = await apiFetch<PaginatedResponse<Property>>(
          `/properties?${params.toString()}`,
          { skipAuth: true },
        );

        const data = result.data || [];
        const tot = result.total || 0;

        setProperties((prev) => (append ? [...prev, ...data] : data));
        setTotal(tot);
        setHasMore(pageNum * 12 < tot);
        setPage(pageNum);
      } catch {
        // silently absorb abort/network errors
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedCity, selectedCategory, selectedDestination, listingType, propertyType, minPrice, maxPrice, guestCount, searchText, sortValue],
  );

  // Fetch on filter change (reset to page 1)
  useEffect(() => {
    fetchProperties(1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedCategory, selectedDestination, listingType, propertyType, sortValue]);

  // Debounced fetch for text/number inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProperties(1, false);
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, minPrice, maxPrice, guestCount]);

  const handleLoadMore = () => {
    fetchProperties(page + 1, true);
  };

  const handleReset = () => {
    setSelectedCity('All Ethiopia');
    setSelectedCategory('');
    setSelectedDestination('');
    setListingType('');
    setPropertyType('');
    setMinPrice('');
    setMaxPrice('');
    setGuestCount('');
    setSearchText('');
    setSortValue('createdAt:DESC');
  };

  const activeFilterCount = [
    selectedCity !== 'All Ethiopia',
    selectedCategory !== '',
    selectedDestination !== '',
    listingType !== '',
    propertyType !== '',
    minPrice !== '',
    maxPrice !== '',
    guestCount !== '',
    searchText !== '',
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#F8F5ED] flex flex-col font-body">
      <AppHeader />

      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-8">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#73776F] hover:text-[#234B36] transition group cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-1">arrow_back</span>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* ── Page Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-[#252923] tracking-tight leading-tight">
            Discover Properties in Ethiopia
          </h1>
          <p className="mt-2 text-sm text-[#73776F]">
            {total > 0 ? (
              <>{total.toLocaleString()} verified {total === 1 ? 'property' : 'properties'} available</>
            ) : loading ? (
              'Loading verified properties...'
            ) : (
              'No properties match your filters'
            )}
          </p>
        </div>

        {/* ── Search Bar ── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-lg">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#73776F] text-xl pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Search by title, city, address…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#E5E0D5] text-sm text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
            />
          </div>

          {/* AI Search Trigger Button */}
          <button
            type="button"
            onClick={() => setAiSearchOpen(true)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-[#234B36]/40 hover:bg-[#EEF3EF] hover:border-[#234B36] text-[#234B36] text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-lg text-[#D87836]">auto_awesome</span>
            <span className="hidden sm:inline">Search with AI</span>
          </button>

          {/* Filter toggle (mobile) */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="relative flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#E5E0D5] text-sm font-semibold text-[#252923] hover:bg-[#EEF3EF] hover:border-[#234B36]/30 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl text-[#234B36]">tune</span>
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#234B36] text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort */}
          <select
            value={sortValue}
            onChange={(e) => setSortValue(e.target.value)}
            className="hidden sm:block px-3 py-3 rounded-xl bg-white border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] cursor-pointer transition"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* ── City Quick-Filter Pills ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
          {ETHIOPIAN_CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                setSelectedCity(city);
                if (city !== 'All Ethiopia') setSelectedDestination('');
              }}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                selectedCity === city
                  ? 'bg-[#234B36] text-white border-[#234B36] shadow-md shadow-[#234B36]/20'
                  : 'bg-white text-[#252923] border-[#E5E0D5] hover:border-[#234B36]/40 hover:bg-[#EEF3EF]'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* ── Dynamic Category Pills ── */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                selectedCategory === ''
                  ? 'bg-[#234B36] text-white border-[#234B36] shadow-xs'
                  : 'bg-white text-[#73776F] border-[#E5E0D5] hover:border-[#234B36]/40 hover:text-[#234B36]'
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => {
              const catKey = c.slug || c.name;
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? '' : catKey)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#234B36] text-white border-[#234B36] shadow-xs'
                      : 'bg-white text-[#73776F] border-[#E5E0D5] hover:border-[#234B36]/40 hover:text-[#234B36]'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Expanded Filters Panel ── */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 mb-6 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Listing Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-2">
                  Listing Type
                </label>
                <div className="flex gap-2">
                  {(['', 'RENTAL', 'SALE'] as const).map((lt) => (
                    <button
                      key={lt}
                      type="button"
                      onClick={() => setListingType(lt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        listingType === lt
                          ? 'bg-[#234B36] text-white border-[#234B36]'
                          : 'bg-white text-[#252923] border-[#E5E0D5] hover:border-[#234B36]/40'
                      }`}
                    >
                      {lt === '' ? 'All' : lt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Type */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-2">
                  Property Type
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPropertyType('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      propertyType === ''
                        ? 'bg-[#234B36] text-white border-[#234B36]'
                        : 'bg-white text-[#252923] border-[#E5E0D5] hover:border-[#234B36]/40'
                    }`}
                  >
                    All
                  </button>
                  {PROPERTY_TYPES.map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPropertyType(pt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        propertyType === pt
                          ? 'bg-[#234B36] text-white border-[#234B36]'
                          : 'bg-white text-[#252923] border-[#E5E0D5] hover:border-[#234B36]/40'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-2">
                  Price Range (ETB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    min={0}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-[#F8F5ED] text-xs text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                  />
                  <span className="text-[#73776F] text-xs">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    min={0}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-[#F8F5ED] text-xs text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                  />
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-2">
                  Guests
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min guests"
                    value={guestCount}
                    min={1}
                    max={50}
                    onChange={(e) => setGuestCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-[#F8F5ED] text-xs text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                  />
                </div>
              </div>

              {/* Destination Filter */}
              {destinations.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-2">
                    Curated Destination
                  </label>
                  <select
                    value={selectedDestination}
                    onChange={(e) => setSelectedDestination(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-[#F8F5ED] text-xs text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] cursor-pointer"
                  >
                    <option value="">All Curated Destinations</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.slug || d.name}>
                        {d.name} ({d.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Filter actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E5E0D5]/70">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-[#73776F] hover:text-[#252923] underline underline-offset-2 cursor-pointer transition"
              >
                Clear all filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="px-5 py-2 rounded-xl bg-[#234B36] text-white text-xs font-semibold hover:bg-[#1a3828] transition cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* ── Listing Type Tabs (always visible) ── */}
        <div className="flex items-center gap-2 mb-6">
          {(['', 'RENTAL', 'SALE'] as const).map((lt) => (
            <button
              key={lt}
              type="button"
              onClick={() => setListingType(lt)}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition cursor-pointer ${
                listingType === lt
                  ? 'bg-[#234B36] text-white border-[#234B36] shadow-md shadow-[#234B36]/20'
                  : 'bg-white text-[#252923] border-[#E5E0D5] hover:border-[#234B36]/40 hover:bg-[#EEF3EF]'
              }`}
            >
              {lt === '' ? 'All Properties' : lt === 'RENTAL' ? 'Rentals & Stays' : 'For Sale'}
            </button>
          ))}

          {/* Sort (mobile) */}
          <select
            value={sortValue}
            onChange={(e) => setSortValue(e.target.value)}
            className="sm:hidden ml-auto px-3 py-2 rounded-xl bg-white border border-[#E5E0D5] text-xs text-[#252923] focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* ── Property Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          ) : properties.length === 0 ? (
            <EmptyState onReset={handleReset} />
          ) : (
            properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isComparing={selectedForCompare.includes(property.id)}
                onToggleCompare={(e) => handleToggleCompare(property.id, e)}
              />
            ))
          )}

          {/* Load More skeletons */}
          {loadingMore && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`more-${i}`} />)}
        </div>

        {/* ── Load More ── */}
        {!loading && hasMore && (
          <div className="flex justify-center mt-10">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-8 py-3.5 rounded-xl bg-white border border-[#E5E0D5] text-sm font-semibold text-[#252923] hover:bg-[#EEF3EF] hover:border-[#234B36]/40 disabled:opacity-50 transition cursor-pointer shadow-xs flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#234B36]/30 border-t-[#234B36] rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <span>Load more properties</span>
                  <span className="text-[#73776F]">({total - properties.length} remaining)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Results count (when loaded) ── */}
        {!loading && properties.length > 0 && (
          <p className="text-center text-xs text-[#73776F] mt-6">
            Showing {properties.length} of {total} verified properties
          </p>
        )}
      
        {/* ── Personalized Recommendations Section ── */}
        <div className="mt-14">
          <PersonalizedAiRecommendationsSection />
        </div>

        {/* ── Floating Compare Bar ── */}
        {selectedForCompare.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#252923] text-white rounded-full px-5 py-3 shadow-2xl border border-[#234B36] flex items-center gap-4 animate-fade-in-up">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="material-symbols-outlined text-lg text-[#D87836]">balance</span>
              <span>{selectedForCompare.length} {selectedForCompare.length === 1 ? 'property' : 'properties'} selected</span>
              <span className="text-white/60 hidden sm:inline">(Select 2 or 3 to compare)</span>
            </div>
            <button
              type="button"
              disabled={selectedForCompare.length < 2}
              onClick={() => setCompareModalOpen(true)}
              className="px-4 py-1.5 rounded-full bg-[#234B36] hover:bg-[#2D5E43] disabled:opacity-40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Compare with AI</span>
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedForCompare([])}
              className="text-xs text-white/70 hover:text-white underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        {/* ── AI Conversational Search Modal ── */}
        <AiConversationalSearchModal
          isOpen={aiSearchOpen}
          onClose={() => setAiSearchOpen(false)}
        />

        {/* ── AI Property Comparison Modal ── */}
        <AiPropertyComparisonModal
          isOpen={compareModalOpen}
          onClose={() => setCompareModalOpen(false)}
          propertyIds={selectedForCompare}
        />

        {/* ── AI Booking Assistant Floating Widget ── */}
        <AiBookingAssistantWidget />
      </main>

      <AppFooter />
    </div>
  );
}

// ─── Exported Page Wrapped in Suspense ────────────────────────────────────────
export default function PropertiesSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F5ED] flex flex-col font-body">
          <AppHeader />
          <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-8">
            <div className="h-8 w-64 bg-[#EEF3EF] rounded-xl animate-pulse mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </main>
          <AppFooter />
        </div>
      }
    >
      <PropertiesSearchContent />
    </Suspense>
  );
}
