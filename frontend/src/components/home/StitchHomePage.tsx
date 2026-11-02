'use client';

import { showPlatformToast } from '@/context/ToastContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { toggleWishlist as toggleWishlistStore, WISHLIST_UPDATED_EVENT, getSavedWishlist } from '@/lib/wishlist';
import type { RecommendationsResponse } from '@/types/guest-ai';
import type { Property } from '@/types';
import AiConversationalSearchModal from '@/components/search/AiConversationalSearchModal';
import PersonalizedAiRecommendationsSection from '@/components/home/PersonalizedAiRecommendationsSection';
import AiPropertyComparisonModal from '@/components/compare/AiPropertyComparisonModal';
import AiBookingAssistantWidget from '@/components/assistant/AiBookingAssistantWidget';
import ExperiencesSection from '@/components/experiences/ExperiencesSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';

export interface PropertyListing {
  id: string;
  title: string;
  location: string;
  subLocation: string;
  details: string;
  dates: string;
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  currency?: string;
  totalBeforeTaxes: number;
  images: string[];
  badge?: 'Superhost' | 'Guest Favorite' | 'Rare Find' | string;
  category: string;
  propertyType?: string;
  instantBook?: boolean;
  isSuperhost?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
}

// Stitch curated luxury stays from the design
export const ETHIOPIAN_FALLBACK_PROPERTIES: PropertyListing[] = [
  {
    id: '3d600de0-423b-4678-a361-962d3edcfb13',
    title: 'Executive Luxury Penthouse overlooking Bole Medhanialem',
    location: 'Bole, Addis Ababa',
    subLocation: 'Bole Medhanialem Cathedral Area',
    details: '6 guests · 3 bedrooms · Panoramic capital skyline views',
    dates: 'Available this season',
    rating: 4.98,
    reviewsCount: 38,
    pricePerNight: 6500,
    currency: 'ETB',
    totalBeforeTaxes: 32500,
    badge: 'Superhost',
    isSuperhost: true,
    instantBook: true,
    category: 'apartment',
    propertyType: 'APARTMENT',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '65645631-a442-405a-bb92-400e8c7cea7d',
    title: 'Sleek Diplomatic Suite in Kazanchis',
    location: 'Kazanchis, Addis Ababa',
    subLocation: 'UN-ECA Diplomatic Enclave',
    details: '3 guests · 1 bedroom · Fiber broadband & standby generator',
    dates: 'Available this season',
    rating: 4.94,
    reviewsCount: 29,
    pricePerNight: 4800,
    currency: 'ETB',
    totalBeforeTaxes: 24000,
    badge: 'Guest Favorite',
    instantBook: true,
    category: 'apartment',
    propertyType: 'APARTMENT',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '5eebd2cd-0f04-49e1-9e5f-0894add2a727',
    title: 'Lake Tana Shoreline Retreat Villa with Sunset Views',
    location: 'Bahir Dar, Ethiopia',
    subLocation: 'Lake Tana Shoreline Promenade',
    details: '8 guests · 4 bedrooms · Private lawn & private kayak pier',
    dates: 'Available this season',
    rating: 4.96,
    reviewsCount: 42,
    pricePerNight: 5200,
    currency: 'ETB',
    totalBeforeTaxes: 26000,
    badge: 'Superhost',
    isSuperhost: true,
    category: 'villa',
    propertyType: 'VILLA',
    images: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '7ca67992-278d-408d-aff5-4213baa46de9',
    title: 'Babogaya Crater Lakefront Infinity Villa',
    location: 'Bishoftu, Ethiopia',
    subLocation: 'Crater Lake Babogaya Rim',
    details: '6 guests · 3 bedrooms · Volcanic crater panoramas & plunge pool',
    dates: 'Available this season',
    rating: 4.97,
    reviewsCount: 54,
    pricePerNight: 8000,
    currency: 'ETB',
    totalBeforeTaxes: 40000,
    badge: 'Rare Find',
    instantBook: true,
    category: 'villa',
    propertyType: 'VILLA',
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '65d3b9c4-b4bd-4657-8ff0-06ea805d5370',
    title: 'Waterfront Serenity Resort Villa on Lake Hawassa',
    location: 'Hawassa, Ethiopia',
    subLocation: 'Lake Hawassa Waterfront Strip',
    details: '6 guests · 3 bedrooms · Tropical gardens & lake breeze veranda',
    dates: 'Available this season',
    rating: 4.91,
    reviewsCount: 31,
    pricePerNight: 7500,
    currency: 'ETB',
    totalBeforeTaxes: 37500,
    badge: 'Superhost',
    isSuperhost: true,
    category: 'villa',
    propertyType: 'VILLA',
    images: [
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '549aa254-d365-4e99-ad4b-24a037bbb884',
    title: 'Fasil Ghebbi Heritage Guest Estate',
    location: 'Gondar, Ethiopia',
    subLocation: 'Royal Enclosure Historic Buffer Zone',
    details: '4 guests · 2 bedrooms · Traditional masonry stone architecture',
    dates: 'Available this season',
    rating: 4.93,
    reviewsCount: 26,
    pricePerNight: 3800,
    currency: 'ETB',
    totalBeforeTaxes: 19000,
    badge: 'Guest Favorite',
    category: 'house',
    propertyType: 'HOUSE',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    ],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Stays', icon: 'apps' },
  { id: 'apartment', label: 'Apartments', icon: 'apartment' },
  { id: 'villa', label: 'Villas', icon: 'villa' },
  { id: 'house', label: 'Houses', icon: 'home' },
  { id: 'studio', label: 'Studios', icon: 'bed' },
  { id: 'lakefront', label: 'Lakefront Stays', icon: 'water' },
  { id: 'for-sale', label: 'For Sale', icon: 'real_estate_agent' },
  { id: 'bole', label: 'Bole Central', icon: 'location_city' },
];

interface StitchHomePageProps {
  onNavigateTab?: (tab: string) => void;
  activeNavTab?: string;
}

export default function StitchHomePage({ onNavigateTab, activeNavTab = 'stays' }: StitchHomePageProps) {
  const { user, logout } = useAuth();

  // Top Nav Tab State (Stays, Experiences, How it Works)
  const [activeTab, setActiveTab] = useState<'stays' | 'destinations' | 'how-it-works'>(
    (activeNavTab as any) || 'stays'
  );

  useEffect(() => {
    if (activeNavTab) {
      setActiveTab(activeNavTab as any);
    }
  }, [activeNavTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'experiences' || tabParam === 'destinations') {
        setActiveTab('destinations');
      } else if (tabParam === 'how-it-works' || tabParam === 'howitworks') {
        setActiveTab('how-it-works');
      }
    }
  }, []);

  // Search state
  const [activeSegment, setActiveSegment] = useState<'where' | 'when' | 'who' | null>(null);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [datesSelected, setDatesSelected] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);
  const [aiSearchModalOpen, setAiSearchModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

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
  const [popularDestinations, setPopularDestinations] = useState<string[]>([
    'Addis Ababa', 'Bishoftu', 'Hawassa', 'Bahir Dar', 'Lalibela'
  ]);
  const [realProperties, setRealProperties] = useState<PropertyListing[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<
    Record<string, { score: number; reason: string; matchTags: string[] }>
  >({});
  const [isAiPersonalized, setIsAiPersonalized] = useState(false);

  // Load Guest AI Recommendations based on authenticated guest context, search or viewing history
  useEffect(() => {
    async function loadPersonalizedStays() {
      try {
        let cityPreference: string | undefined;
        let budgetPreference: number | undefined;

        if (typeof window !== 'undefined') {
          // 1. Analyze recent view history from localStorage
          const rawViews = localStorage.getItem('engida_viewed_properties');
          if (rawViews) {
            try {
              const views: Array<{ city?: string; price?: number }> = JSON.parse(rawViews);
              if (views.length > 0) {
                const cityMap: Record<string, number> = {};
                let totalPrice = 0;
                let count = 0;
                views.forEach((v) => {
                  if (v.city) cityMap[v.city] = (cityMap[v.city] || 0) + 1;
                  if (v.price && v.price > 0) {
                    totalPrice += v.price;
                    count++;
                  }
                });
                const topCity = Object.entries(cityMap).sort((a, b) => b[1] - a[1])[0];
                if (topCity) cityPreference = topCity[0];
                if (count > 0) budgetPreference = Math.round(totalPrice / count);
              }
            } catch {
              // ignore
            }
          }

          // 2. Fallback to last searched city if no views
          if (!cityPreference) {
            const lastSearch = localStorage.getItem('engida_last_searched_city');
            if (lastSearch) cityPreference = lastSearch;
          }
        }

        // 3. Query the AI Recommendations endpoint
        const res = await apiFetch<RecommendationsResponse>('/ai/guest/recommendations', {
          method: 'POST',
          body: JSON.stringify({
            preferredCity: cityPreference || 'Addis Ababa',
            maxBudget: budgetPreference || undefined,
            limit: 15,
          }),
        });

        if (res && Array.isArray(res.recommendations) && res.recommendations.length > 0) {
          const recMap: Record<string, { score: number; reason: string; matchTags: string[] }> = {};
          res.recommendations.forEach((item) => {
            if (item.property && item.property.id) {
              recMap[item.property.id] = {
                score: item.score,
                reason: item.reason,
                matchTags: item.matchTags || [],
              };
            }
          });
          setAiRecommendations(recMap);
          setIsAiPersonalized(true);
        }
      } catch {
        // Graceful fallback to default sorting
      }
    }

    void loadPersonalizedStays();
  }, [user]);

  // Fetch real properties from database
  useEffect(() => {
    apiFetch<{ data: Property[] } | Property[]>('/properties?limit=30', { skipAuth: true })
      .then((res) => {
        const items = Array.isArray(res) ? res : res.data;
        if (Array.isArray(items) && items.length > 0) {
          // Prioritize rental stays at the top of the feed for Stays exploration
          const sortedItems = [...items].sort((a, b) => {
            const aIsSale = String(a.listingType || '').toUpperCase() === 'SALE';
            const bIsSale = String(b.listingType || '').toUpperCase() === 'SALE';
            if (aIsSale && !bIsSale) return 1;
            if (!aIsSale && bIsSale) return -1;
            return 0;
          });

          const mapped: PropertyListing[] = sortedItems.map((p) => {
            const cover =
              p.coverImage ||
              (p.images && p.images[0]) ||
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80';
            const isRental = !p.listingType || p.listingType === 'RENTAL';
            let price = isRental ? Number(p.pricePerNight) : Number(p.salePrice);
            if (!price || price <= 0) {
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
              images: p.images && p.images.length > 0 ? p.images : [cover],
              category: p.propertyType?.toLowerCase() || 'apartment',
              propertyType: p.propertyType,
              instantBook: true,
              isSuperhost: true,
              bedrooms: p.bedrooms || 2,
              bathrooms: p.bathrooms || 1,
              amenities: p.amenities && p.amenities.length > 0
                ? p.amenities.map((a: any) => (typeof a === 'string' ? a : a.name || ''))
                : ['Wi-Fi', 'Standby Generator', 'Water Tank', 'Kitchen', 'Free Parking'],
              badge: isRental ? (price > 5000 ? 'Rare Find' : 'Guest Favorite') : 'For Sale',
            };
          });
          setRealProperties(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Load featured destinations from catalog if available
  useEffect(() => {
    apiFetch<Array<{ name: string }>>('/catalog/destinations?featured=true', { skipAuth: true })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPopularDestinations(data.map((d) => d.name));
        }
      })
      .catch(() => {});
  }, []);

  // Category and filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating'>('recommended');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Comprehensive Marketplace Filter State
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | 'any'>('any');
  const [selectedBathrooms, setSelectedBathrooms] = useState<number | 'any'>('any');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('all');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const totalActiveFilterCount =
    activeFilters.length +
    (minPrice !== null ? 1 : 0) +
    (maxPrice !== null ? 1 : 0) +
    (selectedBedrooms !== 'any' ? 1 : 0) +
    (selectedBathrooms !== 'any' ? 1 : 0) +
    (selectedPropertyType !== 'all' ? 1 : 0) +
    selectedAmenities.length;

  // Wishlist state & Saved Filter
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const savedCount = useMemo(() => Object.values(wishlist).filter(Boolean).length, [wishlist]);

  // Pagination / Load more state
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allLoadedMessage, setAllLoadedMessage] = useState(false);

  // User menu and language menu
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [currency, setCurrency] = useState('ETB');
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close user menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatPrice = (amount: number) => {
    if (currency === 'ETB') {
      return `ETB ${Math.round(amount).toLocaleString()}`;
    }
    return `$${Math.round(amount / 125).toLocaleString()}`;
  };

  // Load wishlist from localStorage on mount & listen for updates
  useEffect(() => {
    const syncWishlist = () => {
      setWishlist(getSavedWishlist());
    };
    syncWishlist();

    // Check URL params for ?saved=true or ?tab=saved
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('saved') === 'true' || params.get('tab') === 'saved' || params.get('favorites') === 'true') {
        setShowSavedOnly(true);
      }
    }

    window.addEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
    window.addEventListener('storage', syncWishlist);
    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
      window.removeEventListener('storage', syncWishlist);
    };
  }, []);

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    btn.classList.add('heart-pop');
    setTimeout(() => btn.classList.remove('heart-pop'), 350);

    const isNowSaved = toggleWishlistStore(id);
    setWishlist((prev) => {
      const next = { ...prev };
      if (isNowSaved) {
        next[id] = true;
      } else {
        delete next[id];
      }
      return next;
    });

    showPlatformToast(
      isNowSaved ? 'Saved to your favorites!' : 'Removed from your favorites',
      isNowSaved ? 'success' : 'info',
      isNowSaved ? 'Saved' : 'Removed'
    );
  };

  const removeFilterChip = (filter: string) => {
    setActiveFilters((prev) => prev.filter((f) => f !== filter));
  };

  const [cardImageIndex, setCardImageIndex] = useState<Record<string, number>>({});

  const nextCardImage = (id: string, total: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCardImageIndex((prev) => ({
      ...prev,
      [id]: ((prev[id] || 0) + 1) % total,
    }));
  };

  const prevCardImage = (id: string, total: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCardImageIndex((prev) => ({
      ...prev,
      [id]: ((prev[id] || 0) - 1 + total) % total,
    }));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSelectedCategory('all');
    setDestinationSearch('');
    setGuestCount(1);
    setDatesSelected('');
    setMinPrice(null);
    setMaxPrice(null);
    setSelectedBedrooms('any');
    setSelectedBathrooms('any');
    setSelectedPropertyType('all');
    setSelectedAmenities([]);
    setShowSavedOnly(false);
  };

  // Filter and sort listings
  const sourceListings = realProperties.length > 0 ? realProperties : ETHIOPIAN_FALLBACK_PROPERTIES;
  const filteredListings = useMemo(() => {
    return sourceListings.filter((item) => {
      // Saved / Wishlist filter
      if (showSavedOnly && !wishlist[item.id]) {
        return false;
      }

      // Category filter with smart fuzzy matching
      if (selectedCategory !== 'all') {
        const cat = selectedCategory.toLowerCase();
        const pType = (item.propertyType || '').toLowerCase();
        const itemCat = (item.category || '').toLowerCase();
        const loc = (item.location || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        const match =
          pType.includes(cat) ||
          itemCat.includes(cat) ||
          loc.includes(cat) ||
          title.includes(cat);
        if (!match) return false;
      }
      // Text search
      if (destinationSearch.trim()) {
        const q = destinationSearch.toLowerCase();
        const matchesLoc = item.location.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSub = item.subLocation.toLowerCase().includes(q);
        if (!matchesLoc && !matchesTitle && !matchesSub) return false;
      }
      // Guest capacity filter
      if (guestCount > 1) {
        const guestMatch = item.details.match(/(\d+)\s*guests?/i);
        const maxGuests = guestMatch ? parseInt(guestMatch[1], 10) : 2;
        if (maxGuests < guestCount) {
          return false;
        }
      }
      // Date availability filter
      if (datesSelected && datesSelected !== 'Flexible Dates') {
        if (datesSelected === 'Anytime in Nov') {
          if (!item.dates.toLowerCase().includes('nov')) return false;
        } else if (item.dates) {
          if (!item.dates.trim()) return false;
        }
      }
      // Superhost chip
      if (activeFilters.includes('Superhost') && !item.isSuperhost && item.badge !== 'Superhost') {
        return false;
      }
      // Instant book chip
      if (activeFilters.includes('Instant Book') && !item.instantBook) {
        return false;
      }
      // Entire home filter
      if (activeFilters.includes('Entire home')) {
        const detailsLower = item.details.toLowerCase();
        if (detailsLower.includes('private room') || detailsLower.includes('shared room') || detailsLower.includes('hotel room')) {
          return false;
        }
      }
      // Min price filter (ETB)
      if (minPrice !== null && item.pricePerNight < minPrice) {
        return false;
      }
      // Max price filter (ETB)
      if (maxPrice !== null && item.pricePerNight > maxPrice) {
        return false;
      }
      // Bedrooms filter
      if (selectedBedrooms !== 'any') {
        const bedMatch = item.details.match(/(\d+)\s*bedrooms?/i);
        const beds = item.bedrooms || (bedMatch ? parseInt(bedMatch[1], 10) : 1);
        if (beds < selectedBedrooms) {
          return false;
        }
      }
      // Bathrooms filter
      if (selectedBathrooms !== 'any') {
        const bathMatch = item.details.match(/(\d+)\s*baths?/i);
        const baths = item.bathrooms || (bathMatch ? parseInt(bathMatch[1], 10) : 1);
        if (baths < selectedBathrooms) {
          return false;
        }
      }
      // Property type filter
      if (selectedPropertyType !== 'all') {
        const pType = (item.propertyType || item.category || '').toLowerCase();
        if (!pType.includes(selectedPropertyType.toLowerCase())) {
          return false;
        }
      }
      // Amenities filter (Ethiopian Essentials & Stays Amenities)
      if (selectedAmenities.length > 0) {
        const searchable = `${item.title} ${item.details} ${item.subLocation} ${(item.amenities || []).join(' ')}`.toLowerCase();
        const matchesAll = selectedAmenities.every((amenity) => {
          const am = amenity.toLowerCase();
          if (am.includes('generator') || am.includes('power')) {
            return searchable.includes('generator') || searchable.includes('power') || searchable.includes('backup') || searchable.includes('standby');
          }
          if (am.includes('water')) {
            return searchable.includes('water') || searchable.includes('tank') || searchable.includes('reserve');
          }
          if (am.includes('wifi') || am.includes('wi-fi') || am.includes('internet')) {
            return searchable.includes('wifi') || searchable.includes('wi-fi') || searchable.includes('broadband') || searchable.includes('fiber') || searchable.includes('internet');
          }
          if (am.includes('parking')) {
            return searchable.includes('parking') || searchable.includes('garage');
          }
          if (am.includes('kitchen')) {
            return searchable.includes('kitchen') || searchable.includes('cooking');
          }
          if (am.includes('security') || am.includes('gated')) {
            return searchable.includes('security') || searchable.includes('gated') || searchable.includes('guard');
          }
          if (am.includes('workspace')) {
            return searchable.includes('workspace') || searchable.includes('desk') || searchable.includes('office');
          }
          return searchable.includes(am);
        });
        if (!matchesAll) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortOption === 'price-asc') return a.pricePerNight - b.pricePerNight;
      if (sortOption === 'price-desc') return b.pricePerNight - a.pricePerNight;
      if (sortOption === 'rating') return b.rating - a.rating;
      // AI Personalized sorting: elevate high-match properties for authenticated guest
      const scoreA = aiRecommendations[a.id]?.score || 0;
      const scoreB = aiRecommendations[b.id]?.score || 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return 0; // recommended
    });
  }, [sourceListings, selectedCategory, destinationSearch, guestCount, datesSelected, activeFilters, sortOption, minPrice, maxPrice, selectedBedrooms, selectedBathrooms, selectedPropertyType, selectedAmenities, aiRecommendations, showSavedOnly, wishlist]);

  const displayedListings = useMemo(() => {
    return filteredListings.slice(0, visibleCount);
  }, [filteredListings, visibleCount]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setIsLoadingMore(false);
      if (visibleCount < filteredListings.length) {
        setVisibleCount((prev) => Math.min(prev + 4, filteredListings.length));
      } else {
        setAllLoadedMessage(true);
        setTimeout(() => setAllLoadedMessage(false), 2200);
      }
    }, 700);
  };

  const progressPercent = Math.min(100, Math.round((displayedListings.length / Math.max(1, filteredListings.length)) * 100));

  return (
    <div className="w-full min-h-screen bg-[#F8F5ED] text-[#252923] font-body selection:bg-[#234B36]/20 selection:text-[#234B36]">
      {/* ============================================================ */}
      {/* 1. STICKY TOP HEADER                                         */}
      {/* ============================================================ */}
      <header className="relative z-[60] w-full bg-[#F8F5ED]/95 backdrop-blur-xl border-b border-[#E5E0D5]/40 shadow-[0_1px_8px_rgba(58,48,42,0.04)] transition-all duration-300">
        <div className="h-20 w-full px-4 sm:px-6 lg:px-12 flex items-center justify-between max-w-[1440px] mx-auto">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 group transition-transform duration-200 hover:scale-[1.02] active:scale-95"
            >
              <span className="text-3xl font-bold tracking-tight text-[#234B36] font-headline transition-colors group-hover:text-[#2D5E43]">
                Engida
              </span>
            </Link>
          </div>

                    {/* Center Segmented Navigation Bar (Stays / Experiences / How it Works) */}
          <nav className="hidden md:inline-flex items-center gap-1 p-1 rounded-full bg-[#FAF8F2] border border-[#E5E0D5]/80 shadow-2xs transition-all">
            <button
              type="button"
              onClick={() => {
                setActiveTab('stays');
                onNavigateTab?.('stays');
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
                activeTab === 'stays'
                  ? 'bg-[#234B36] text-white shadow-xs'
                  : 'text-[#252923] hover:text-[#234B36] hover:bg-[#EEF3EF]'
              }`}
            >
              <span className="material-symbols-outlined text-base">cottage</span>
              <span>Stays</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('destinations');
                onNavigateTab?.('destinations');
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
                activeTab === 'destinations'
                  ? 'bg-[#234B36] text-white shadow-xs'
                  : 'text-[#252923] hover:text-[#234B36] hover:bg-[#EEF3EF]'
              }`}
            >
              <span className="material-symbols-outlined text-base">local_activity</span>
              <span>Experiences</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('how-it-works');
                onNavigateTab?.('how-it-works');
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${
                activeTab === 'how-it-works'
                  ? 'bg-[#234B36] text-white shadow-xs'
                  : 'text-[#252923] hover:text-[#234B36] hover:bg-[#EEF3EF]'
              }`}
            >
              <span className="material-symbols-outlined text-base">help_outline</span>
              <span>How it Works</span>
            </button>
          </nav>

          {/* Right Actions: Become a Host & User Profile */}
          <div className="flex items-center gap-4">
            {user?.hostProfile || (user as any)?.role === 'HOST' ? (
              <Link
                href="/host/dashboard"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-[#234B36] text-white font-semibold text-sm hover:bg-[#2D5E43] transition-all duration-200 active:scale-95 shadow-sm hover:shadow"
              >
                Host Dashboard
              </Link>
            ) : (
              <Link
                href="/become-a-host"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-[#EEF3EF] text-[#252923] font-semibold text-sm hover:bg-[#234B36] hover:text-white transition-all duration-200 active:scale-95 shadow-sm hover:shadow"
              >
                Become a Host
              </Link>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Global currency and language"
                onClick={() => setCurrencyModalOpen(true)}
                title={`Language: English / አማርኛ • Currency: ${currency}. Click to change`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#EEF3EF] transition-all duration-200 text-[#73776F] hover:text-[#234B36] active:scale-95 text-xs font-bold border border-transparent hover:border-[#E5E0D5]"
              >
                <span className="material-symbols-outlined text-lg">
                  language
                </span>
                <span className="hidden sm:inline font-mono">{currency}</span>
              </button>

              {/* User Menu Trigger */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  aria-label="User menu"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 p-1.5 pl-3 rounded-full bg-white border border-[#E5E0D5]/60 shadow-[0_2px_12px_rgba(58,48,42,0.06)] hover:shadow-[0_4px_16px_rgba(194,101,42,0.14)] hover:border-[#234B36]/40 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#73776F] text-base">menu</span>
                  <div className="w-8 h-8 rounded-full bg-[#EEF3EF] flex items-center justify-center overflow-hidden text-[#234B36] font-bold text-xs">
                    {user?.name ? (
                      user.name.charAt(0).toUpperCase()
                    ) : (
                      <span className="material-symbols-outlined text-lg text-[#73776F]">person</span>
                    )}
                  </div>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E5E0D5]/80 py-2 z-50 animate-fade-in-up">
                    {user ? (
                      <>
                        <div className="px-4 py-2 border-b border-[#E5E0D5]/50">
                          <p className="text-xs text-[#73776F]">Signed in as</p>
                          <p className="text-sm font-bold text-[#252923] truncate">{user.name || user.email}</p>
                          {user.hostProfile && (
                            <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#234B36]/10 text-[#234B36]">
                              Verified Host
                            </span>
                          )}
                        </div>
                        {user.hostProfile ? (
                          <>
                            <Link
                              href="/host/dashboard"
                              onClick={() => setUserMenuOpen(false)}
                              className="block px-4 py-2.5 text-sm text-[#234B36] font-bold hover:bg-[#F8F5ED]"
                            >
                              Host Dashboard
                            </Link>
                            <Link
                              href="/host/listings"
                              onClick={() => setUserMenuOpen(false)}
                              className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                            >
                              My Listings
                            </Link>
                            <Link
                              href="/host/reservations"
                              onClick={() => setUserMenuOpen(false)}
                              className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                            >
                              Host Reservations
                            </Link>
                          </>
                        ) : (
                          <Link
                            href="/become-a-host"
                            onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-2.5 text-sm text-[#234B36] font-bold hover:bg-[#F8F5ED]"
                          >
                            Become a Host
                          </Link>
                        )}
                        <div className="h-[1px] bg-[#E5E0D5]/50 my-1"></div>
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setShowSavedOnly(true);
                            document.getElementById('listings-grid')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-[#D87836]">favorite</span>
                            <span>Wishlist &amp; Saved Stays</span>
                          </div>
                          {savedCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#234B36]/10 text-[#234B36]">
                              {savedCount}
                            </span>
                          )}
                        </button>
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                        >
                          Guest Trips & Dashboard
                        </Link>
                        <Link
                          href="/messages"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium"
                        >
                          Messages
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium cursor-pointer"
                        >
                          Sign out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login?next=/host/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 text-sm font-bold text-[#234B36] hover:bg-[#F8F5ED]"
                        >
                          <span>Host Sign In</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36]">Host Portal</span>
                        </Link>
                        <Link
                          href="/login"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm font-semibold text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36]"
                        >
                          Guest Sign In
                        </Link>
                        <Link
                          href="/register"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-[#73776F] hover:bg-[#F8F5ED] hover:text-[#234B36]"
                        >
                          Create Account
                        </Link>
                        <div className="h-[1px] bg-[#E5E0D5]/50 my-1"></div>
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setShowSavedOnly(true);
                            document.getElementById('listings-grid')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[#252923] hover:bg-[#F8F5ED] hover:text-[#234B36] font-medium text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-[#D87836]">favorite</span>
                            <span>Wishlist &amp; Saved Stays</span>
                          </div>
                          {savedCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#234B36]/10 text-[#234B36]">
                              {savedCount}
                            </span>
                          )}
                        </button>
                        <Link
                          href="/become-a-host"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-[#73776F] hover:bg-[#F8F5ED] hover:text-[#234B36]"
                        >
                          Engida your home (Become Host)
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </header>

      {/* Main content */}
      <main className="w-full">
        {activeTab === 'destinations' ? (
          <ExperiencesSection />
        ) : activeTab === 'how-it-works' ? (
          <HowItWorksSection />
        ) : (
          <>
            {/* ============================================================ */}
            {/* 2. SEARCH BAR SECTION                                        */}
            {/* ============================================================ */}
        <section className="sticky top-0 z-[45] w-full px-4 sm:px-6 lg:px-12 pt-3 pb-3 flex flex-col items-center justify-center bg-[#F8F5ED]/95 backdrop-blur-md animate-fade-in-up">
          <div className="w-full max-w-4xl mx-auto flex justify-center relative">
            <div className="search-bar-container inline-flex flex-wrap sm:flex-nowrap items-center bg-white rounded-full border border-[#E5E0D5] shadow-[0_4px_16px_rgba(58,48,42,0.06)] hover:shadow-[0_8px_28px_rgba(194,101,42,0.16)] hover:border-[#234B36]/50 transition-all duration-300 pl-4 sm:pl-8 pr-2.5 py-2.5 gap-2 focus-within:ring-2 focus-within:ring-[#234B36]/40 focus-within:border-[#234B36]">
              {/* WHERE SEGMENT */}
              <button
                type="button"
                onClick={() => {
                  setActiveSegment('where');
                  setSearchPopoverOpen(true);
                }}
                className={`search-segment flex flex-col text-left pr-6 sm:pr-8 pl-3 py-1.5 rounded-full transition-all duration-200 focus:outline-none relative cursor-pointer ${
                  activeSegment === 'where' ? 'bg-[#EEF3EF] shadow-inner' : 'hover:bg-[#f6f0e8]'
                }`}
              >
                <span className="text-xs font-bold text-[#252923] tracking-tight">Where</span>
                <span className="text-sm text-[#73776F] font-normal truncate max-w-[140px] sm:max-w-[180px]">
                  {destinationSearch || 'Search destinations'}
                </span>
              </button>

              <div className="hidden sm:block h-8 w-[1px] bg-[#E5E0D5]/60 shrink-0"></div>

              {/* WHEN SEGMENT */}
              <button
                type="button"
                onClick={() => {
                  setActiveSegment('when');
                  setSearchPopoverOpen(true);
                }}
                className={`search-segment flex flex-col text-left px-6 sm:px-8 py-1.5 rounded-full transition-all duration-200 focus:outline-none relative cursor-pointer ${
                  activeSegment === 'when' ? 'bg-[#EEF3EF] shadow-inner' : 'hover:bg-[#f6f0e8]'
                }`}
              >
                <span className="text-xs font-bold text-[#252923] tracking-tight">When</span>
                <span className="text-sm text-[#73776F] font-normal truncate max-w-[120px]">
                  {datesSelected || 'Add dates'}
                </span>
              </button>

              <div className="hidden sm:block h-8 w-[1px] bg-[#E5E0D5]/60 shrink-0"></div>

              {/* WHO SEGMENT */}
              <button
                type="button"
                onClick={() => {
                  setActiveSegment('who');
                  setSearchPopoverOpen(true);
                }}
                className={`search-segment flex flex-col text-left pl-6 sm:pl-8 pr-4 sm:pr-6 py-1.5 rounded-full transition-all duration-200 focus:outline-none relative cursor-pointer ${
                  activeSegment === 'who' ? 'bg-[#EEF3EF] shadow-inner' : 'hover:bg-[#f6f0e8]'
                }`}
              >
                <span className="text-xs font-bold text-[#252923] tracking-tight">Who</span>
                <span className="text-sm text-[#73776F] font-normal">
                  {guestCount > 1 ? `${guestCount} guests` : 'Add guests'}
                </span>
              </button>

              {/* UNIFIED SEARCH BUTTON */}
              <button
                type="button"
                aria-label="Search"
                onClick={() => {
                  setSearchPopoverOpen(false);
                  setActiveSegment(null);
                  const el = document.getElementById('listings-grid');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="search-btn search-glow w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 bg-[#234B36] hover:bg-[#1a3828] shadow-md hover:scale-105 active:scale-95 transition-all duration-200 ml-1 relative overflow-hidden cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl font-bold">
                  search
                </span>
              </button>
            </div>



            {/* Interactive Search Popover */}
            {searchPopoverOpen && (
              <div className="absolute top-20 w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E5E0D5] p-6 z-50 animate-fade-in-up">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]/40 mb-4">
                  <h4 className="font-bold text-sm text-[#252923]">
                    {activeSegment === 'where' && 'Search by destination or property'}
                    {activeSegment === 'when' && 'Select travel window'}
                    {activeSegment === 'who' && 'Select guests'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchPopoverOpen(false);
                      setActiveSegment(null);
                    }}
                    className="text-[#73776F] hover:text-[#234B36]"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                {activeSegment === 'where' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Addis Ababa, Bole, Hawassa, Bahir Dar..."
                      value={destinationSearch}
                      onChange={(e) => setDestinationSearch(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:border-[#234B36]"
                    />
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="text-xs text-[#73776F] self-center mr-1">Popular:</span>
                      {popularDestinations.map((dest) => (
                        <button
                          key={dest}
                          type="button"
                          onClick={() => {
                            setDestinationSearch(dest);
                            setSearchPopoverOpen(false);
                            setActiveSegment(null);
                          }}
                          className="px-3 py-1 rounded-full text-xs bg-[#EEF3EF] hover:bg-[#234B36] hover:text-white transition-colors"
                        >
                          {dest}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeSegment === 'when' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {['This Weekend', 'Next Weekend', 'Anytime in Nov', 'Flexible Dates'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setDatesSelected(option);
                            setSearchPopoverOpen(false);
                            setActiveSegment(null);
                          }}
                          className="p-3 text-left border border-[#E5E0D5] rounded-xl text-sm font-medium hover:border-[#234B36] hover:bg-[#F8F5ED]"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeSegment === 'who' && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-bold text-[#252923]">Guests</p>
                      <p className="text-xs text-[#73776F]">Ages 13 or above</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={guestCount <= 1}
                        onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                        className="w-8 h-8 rounded-full border border-[#E5E0D5] flex items-center justify-center text-sm font-bold disabled:opacity-30 hover:border-[#234B36]"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{guestCount}</span>
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => c + 1)}
                        className="w-8 h-8 rounded-full border border-[#E5E0D5] flex items-center justify-center text-sm font-bold hover:border-[#234B36]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. STICKY CATEGORIES & CONTROLS BAR                          */}
        {/* ============================================================ */}
        <section className="relative z-30 bg-[#F8F5ED]/95 backdrop-blur-md border-y border-[#E5E0D5]/50 w-full py-2 px-4 sm:px-6 lg:px-12 animate-fade-in-up">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
            {/* Horizontal Categories Scroller */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-1">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`category-btn group flex flex-col items-center gap-1 pb-2 shrink-0 border-b-2 transition-all duration-200 active:scale-95 cursor-pointer ${
                      isActive
                        ? 'border-[#234B36] text-[#234B36] font-semibold'
                        : 'border-transparent text-[#73776F] hover:text-[#234B36] hover:border-[#E5E0D5] font-medium'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl transition-transform duration-200 group-hover:-translate-y-0.5"
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {cat.icon}
                    </span>
                    <span className="text-xs tracking-normal whitespace-nowrap">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Controls: AI Search, Saved Favorites, Filters & Sort */}
            <div className="flex items-center gap-2 shrink-0 pl-4 border-l border-[#E5E0D5]/40">
              <button
                type="button"
                onClick={() => setAiSearchModalOpen(true)}
                className="ai-search-action-btn flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-linear-to-r from-white to-[#FAF8F2] border border-[#D87836]/40 hover:border-[#D87836] text-[#252923] hover:text-[#234B36] shadow-[0_2px_8px_rgba(58,48,42,0.04)] hover:shadow-[0_4px_16px_rgba(216,120,54,0.15)] active:scale-95 transition-all duration-200 cursor-pointer"
                title="Search using conversational Ethiopian AI"
              >
                <span className="material-symbols-outlined text-base text-[#D87836] transition-transform duration-200 hover:rotate-12">
                  auto_awesome
                </span>
                <span className="text-xs sm:text-sm font-semibold text-[#234B36]">AI Search</span>
              </button>

              {/* Saved Stays / Favorites Toggle */}
              <button
                type="button"
                onClick={() => setShowSavedOnly((prev) => !prev)}
                className={`favorites-action-btn flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                  showSavedOnly
                    ? 'bg-[#234B36] text-white border border-[#234B36] shadow-sm hover:bg-[#1a3828]'
                    : savedCount > 0
                    ? 'bg-white border border-[#D87836]/40 text-[#252923] hover:text-[#234B36] hover:border-[#234B36] shadow-[0_2px_8px_rgba(58,48,42,0.04)] hover:shadow-[0_4px_16px_rgba(216,120,54,0.15)] active:scale-95'
                    : 'bg-white border border-[#E5E0D5] text-[#73776F] hover:text-[#252923] hover:border-[#234B36]/50 shadow-[0_2px_8px_rgba(58,48,42,0.04)] active:scale-95'
                }`}
                title={showSavedOnly ? 'Show all stays' : 'Show only your saved properties'}
              >
                <span
                  className={`material-symbols-outlined text-base transition-colors ${
                    showSavedOnly ? 'text-white' : savedCount > 0 ? 'text-[#D87836]' : 'text-[#73776F]'
                  }`}
                  style={showSavedOnly || savedCount > 0 ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  favorite
                </span>
                <span className="text-xs sm:text-sm font-semibold">
                  Saved{savedCount > 0 ? ` (${savedCount})` : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterModalOpen(true)}
                className={`filter-action-btn flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                  totalActiveFilterCount > 0
                    ? 'bg-[#234B36] text-white border border-[#234B36] shadow-sm hover:bg-[#1a3828]'
                    : 'bg-white border border-[#E5E0D5] text-[#252923] hover:text-[#234B36] hover:border-[#234B36]/50 shadow-[0_2px_8px_rgba(58,48,42,0.04)] hover:shadow-[0_4px_16px_rgba(194,101,42,0.15)] active:scale-95'
                }`}
              >
                <span className="material-symbols-outlined text-lg transition-transform duration-200 hover:rotate-45">
                  tune
                </span>
                <span className="text-sm font-semibold">Filters</span>
                {totalActiveFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 ml-1 text-xs font-bold rounded-full bg-white text-[#234B36]">
                    {totalActiveFilterCount}
                  </span>
                )}
              </button>

              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setSortDropdownOpen((open) => !open)}
                  className="sort-action-btn flex items-center gap-1 px-4 py-2 rounded-full bg-white border border-[#E5E0D5] text-[#252923] hover:text-[#234B36] hover:border-[#234B36]/50 shadow-[0_2px_8px_rgba(58,48,42,0.04)] hover:shadow-[0_4px_16px_rgba(194,101,42,0.15)] active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span className="text-sm font-semibold capitalize">
                    {sortOption === 'recommended' && 'Sort: Recommended'}
                    {sortOption === 'price-asc' && 'Price: Low to High'}
                    {sortOption === 'price-desc' && 'Price: High to Low'}
                    {sortOption === 'rating' && 'Highest Rated'}
                  </span>
                  <span className="material-symbols-outlined text-base transition-transform duration-200">
                    expand_more
                  </span>
                </button>

                {sortDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#E5E0D5] py-1.5 z-50 animate-fade-in-up">
                    {[
                      { id: 'recommended', label: 'Recommended' },
                      { id: 'price-asc', label: 'Price: Low to High' },
                      { id: 'price-desc', label: 'Price: High to Low' },
                      { id: 'rating', label: 'Highest Rated' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSortOption(opt.id as any);
                          setSortDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-[#F8F5ED] hover:text-[#234B36] ${
                          sortOption === opt.id ? 'text-[#234B36] font-bold' : 'text-[#252923]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. RESULT META HEADER & ACTIVE FILTER CHIPS                  */}
        {/* ============================================================ */}
        <section className="w-full px-4 sm:px-6 lg:px-12 pt-6 pb-2 max-w-[1440px] mx-auto animate-fade-in-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-bold font-headline text-[#252923]">
                {showSavedOnly
                  ? `Your Saved Stays (${filteredListings.length})`
                  : `Over ${filteredListings.length} verified stays available`}
              </h2>
              {showSavedOnly ? (
                <button
                  type="button"
                  onClick={() => setShowSavedOnly(false)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-bold text-xs hover:bg-[#234B36] hover:text-white transition cursor-pointer"
                >
                  <span>View all stays</span>
                </button>
              ) : (
                <span className="hidden md:inline-flex items-center px-3 py-0.5 rounded-full bg-[#eae2da] text-[#73776F] font-semibold text-xs border border-[#E5E0D5]/50 transition-all hover:bg-[#fbe8d8] hover:text-[#401a08] cursor-default">
                  Updated today
                </span>
              )}
              {user && isAiPersonalized && !showSavedOnly && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold text-xs border border-[#234B36]/30 shadow-2xs">
                  <span className="material-symbols-outlined text-xs text-[#D87836]">auto_awesome</span>
                  <span>Curated for {user.name ? user.name.split(' ')[0] : 'you'}</span>
                </span>
              )}
            </div>

            {/* Quick Toggle & Active Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Saved filter chip */}
              {showSavedOnly && (
                <span className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D87836]/15 text-[#9C4B18] font-bold text-xs border border-[#D87836]/40 shadow-2xs">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                    favorite
                  </span>
                  <span>Favorites Only ({savedCount})</span>
                  <button
                    type="button"
                    aria-label="Remove saved stays filter"
                    onClick={() => setShowSavedOnly(false)}
                    className="hover:text-red-700 transition-transform duration-150 hover:scale-125 cursor-pointer ml-1"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              )}
              {/* Category chip */}
              {selectedCategory !== 'all' && (
                <span className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold text-xs border border-[#234B36]/30 shadow-2xs">
                  <span>Category: {CATEGORIES.find((c) => c.id === selectedCategory)?.label || selectedCategory}</span>
                  <button
                    type="button"
                    aria-label="Remove category filter"
                    onClick={() => setSelectedCategory('all')}
                    className="hover:text-red-700 transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              )}

              {/* Destination search chip */}
              {destinationSearch.trim() && (
                <span className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold text-xs border border-[#234B36]/30 shadow-2xs">
                  <span>📍 {destinationSearch}</span>
                  <button
                    type="button"
                    aria-label="Remove destination filter"
                    onClick={() => setDestinationSearch('')}
                    className="hover:text-red-700 transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              )}

              {/* Guest count chip */}
              {guestCount > 1 && (
                <span className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold text-xs border border-[#234B36]/30 shadow-2xs">
                  <span>👥 {guestCount} guests</span>
                  <button
                    type="button"
                    aria-label="Remove guest filter"
                    onClick={() => setGuestCount(1)}
                    className="hover:text-red-700 transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              )}

              {/* Dates chip */}
              {datesSelected && (
                <span className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold text-xs border border-[#234B36]/30 shadow-2xs">
                  <span>📅 {datesSelected}</span>
                  <button
                    type="button"
                    aria-label="Remove dates filter"
                    onClick={() => setDatesSelected('')}
                    className="hover:text-red-700 transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              )}

              {/* Price Range Chip */}
              {(minPrice !== null || maxPrice !== null) && (
                <span className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold text-xs border border-[#234B36]/30 shadow-2xs">
                  <span>💰 {minPrice !== null && maxPrice !== null ? `ETB ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}` : minPrice !== null ? `≥ ETB ${minPrice.toLocaleString()}` : maxPrice !== null ? `≤ ETB ${maxPrice.toLocaleString()}` : ''}</span>
                  <button
                    type="button"
                    aria-label="Remove price filter"
                    onClick={() => { setMinPrice(null); setMaxPrice(null); }}
                    className="hover:text-red-700 transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              )}

              {/* Bedrooms Chip */}
              {selectedBedrooms !== 'any' && (
                <span className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold text-xs border border-[#234B36]/30 shadow-2xs">
                  <span>🛏️ {selectedBedrooms}+ beds</span>
                  <button
                    type="button"
                    aria-label="Remove bedrooms filter"
                    onClick={() => setSelectedBedrooms('any')}
                    className="hover:text-red-700 transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              )}

              {/* Bathrooms Chip */}
              {selectedBathrooms !== 'any' && (
                <span className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold text-xs border border-[#234B36]/30 shadow-2xs">
                  <span>🚿 {selectedBathrooms}+ baths</span>
                  <button
                    type="button"
                    aria-label="Remove bathrooms filter"
                    onClick={() => setSelectedBathrooms('any')}
                    className="hover:text-red-700 transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              )}

              {/* Property Type Chip */}
              {selectedPropertyType !== 'all' && (
                <span className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold text-xs border border-[#234B36]/30 shadow-2xs">
                  <span>🏡 {selectedPropertyType}</span>
                  <button
                    type="button"
                    aria-label="Remove property type filter"
                    onClick={() => setSelectedPropertyType('all')}
                    className="hover:text-red-700 transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              )}

              {/* Amenities Chips */}
              {selectedAmenities.map((amenity) => (
                <span
                  key={amenity}
                  className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold text-xs border border-[#234B36]/30 shadow-2xs"
                >
                  <span>✓ {amenity}</span>
                  <button
                    type="button"
                    aria-label={`Remove amenity ${amenity}`}
                    onClick={() => setSelectedAmenities((prev) => prev.filter((a) => a !== amenity))}
                    className="hover:text-red-700 transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              ))}

              {/* Standard active filters */}
              {activeFilters.map((chip) => (
                <span
                  key={chip}
                  className="filter-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EF] border border-[#E5E0D5]/60 text-[#252923] font-medium text-xs hover:border-[#234B36] hover:bg-[#ece6dc] transition-all duration-200 shadow-sm"
                >
                  {chip}
                  <button
                    type="button"
                    aria-label={`Remove filter ${chip}`}
                    onClick={() => removeFilterChip(chip)}
                    className="hover:text-[#234B36] transition-transform duration-150 hover:scale-125 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </span>
              ))}

              {(activeFilters.length > 0 || selectedCategory !== 'all' || destinationSearch.trim() || guestCount > 1 || datesSelected) && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="clear-all-btn text-xs font-semibold text-[#73776F] hover:text-[#234B36] underline ml-1 active:scale-95 transition-all duration-150 cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </section>



        {/* ============================================================ */}
        {/* 5. CURATED PROPERTY LISTINGS GRID                            */}
        {/* ============================================================ */}
        <section id="listings-grid" className="w-full px-4 sm:px-6 lg:px-12 py-4 max-w-[1440px] mx-auto">
          {displayedListings.length === 0 ? (
            showSavedOnly ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-[#E5E0D5] p-8 max-w-xl mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[#FAF8F2] border border-[#E5E0D5] flex items-center justify-center mx-auto mb-4 text-[#D87836]">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    favorite
                  </span>
                </div>
                <h3 className="text-xl font-bold font-headline text-[#252923]">No saved stays yet</h3>
                <p className="text-sm text-[#73776F] mt-2 max-w-md mx-auto">
                  Tap the heart icon on any property card while exploring to build your personal Ethiopian travel wishlist.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSavedOnly(false)}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#234B36] text-white font-semibold text-sm shadow-md hover:bg-[#2D5E43] transition cursor-pointer"
                >
                  Browse all verified stays
                </button>
              </div>
            ) : (
              <div className="py-20 text-center bg-white rounded-3xl border border-[#E5E0D5] p-8 max-w-xl mx-auto shadow-sm">
                <span className="material-symbols-outlined text-4xl text-[#234B36]">cottage</span>
                <h3 className="text-xl font-bold font-headline mt-3 text-[#252923]">No stays match your criteria</h3>
                <p className="text-sm text-[#73776F] mt-1">Try clearing some filters or searching for another destination.</p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-5 px-5 py-2.5 rounded-full bg-[#234B36] text-white font-semibold text-xs shadow-md hover:bg-[#2D5E43]"
                >
                  Reset filters
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedListings.map((property, idx) => {
                const isSaved = wishlist[property.id];
                return (
                  <article
                    key={property.id}
                    className="property-card group relative flex flex-col bg-white rounded-xl border border-[#E5E0D5]/70 overflow-hidden shadow-[0_4px_20px_-2px_rgba(58,48,42,0.05)] hover:shadow-[0_16px_36px_-4px_rgba(194,101,42,0.18)] hover:-translate-y-1.5 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${0.1 + (idx % 8) * 0.05}s` }}
                  >
                    {/* Media Container with 4:3 Aspect Ratio */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#EEF3EF] group/media">
                      <img
                        src={property.images[cardImageIndex[property.id] || 0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'}
                        alt={property.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';
                        }}
                        className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      />

                      {/* Carousel Navigation Chevrons */}
                      {property.images && property.images.length > 1 && (
                        <>
                          <button
                            type="button"
                            aria-label="Previous image"
                            onClick={(e) => prevCardImage(property.id, property.images.length, e)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-[#252923] shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm font-bold">chevron_left</span>
                          </button>
                          <button
                            type="button"
                            aria-label="Next image"
                            onClick={(e) => nextCardImage(property.id, property.images.length, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-[#252923] shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm font-bold">chevron_right</span>
                          </button>
                        </>
                      )}

                      {/* Floating Badge (Isolated on Top Left) */}
                      {property.badge && (
                        <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-white font-semibold text-[10px] uppercase tracking-wider shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                              property.badge === 'Superhost'
                                ? 'bg-[#234B36]'
                                : property.badge === 'Guest Favorite'
                                ? 'bg-[#2D5E43]'
                                : 'bg-[#D87836]'
                            }`}
                          >
                            {property.badge}
                          </span>
                        </div>
                      )}

                      {/* Top Right Action Cluster: Compare & Wishlist */}
                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                        {/* Subtle Compare Toggle */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleCompare(property.id, e)}
                          title={selectedForCompare.includes(property.id) ? 'Remove from compare' : 'Compare stay'}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                            selectedForCompare.includes(property.id)
                              ? 'bg-[#234B36] text-white shadow-md ring-2 ring-white scale-105 opacity-100'
                              : 'bg-white/90 hover:bg-white text-[#252923] opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {selectedForCompare.includes(property.id) ? 'check' : 'balance'}
                          </span>
                        </button>

                        {/* Wishlist Heart Button */}
                        <button
                          type="button"
                          aria-label="Add to wishlist"
                          onClick={(e) => toggleWishlist(property.id, e)}
                          className={`wishlist-btn w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-[#E5E0D5]/60 flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer ${
                            isSaved ? 'text-[#234B36]' : 'text-[#252923]'
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-lg transition-all duration-200"
                            style={isSaved ? { fontVariationSettings: "'FILL' 1" } : undefined}
                          >
                            favorite
                          </span>
                        </button>
                      </div>

                      {/* Interactive Gallery Indicator Dots */}
                      {property.images && property.images.length > 1 && (
                        <div className="absolute bottom-2.5 left-0 right-0 z-20 flex justify-center items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {property.images.slice(0, 5).map((_, dotIdx) => {
                            const currentIdx = cardImageIndex[property.id] || 0;
                            const isDotActive = currentIdx === dotIdx;
                            return (
                              <button
                                key={dotIdx}
                                type="button"
                                aria-label={`View photo ${dotIdx + 1}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCardImageIndex((prev) => ({ ...prev, [property.id]: dotIdx }));
                                }}
                                className={`rounded-full transition-all duration-200 cursor-pointer ${
                                  isDotActive
                                    ? 'w-2 h-2 bg-white shadow-xs scale-110'
                                    : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                                }`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Card Content Details */}
                    <div className="flex flex-col p-4 flex-1 justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <h3
                            title={property.title}
                            className="font-headline text-base font-bold text-[#252923] line-clamp-1 group-hover:text-[#234B36] transition-colors duration-200 flex-1 min-w-0"
                          >
                            <Link
                              href={`/properties/${property.id}`}
                              className="focus:outline-hidden after:absolute after:inset-0 after:z-0"
                            >
                              {property.title}
                            </Link>
                          </h3>
                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            <span
                              className="material-symbols-outlined text-sm text-[#234B36]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                            <span className="text-xs font-bold text-[#252923]">{property.rating.toFixed(2)}</span>
                            <span className="text-xs text-[#73776F]">({property.reviewsCount})</span>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-[#234B36] mt-1 truncate">{property.location}</p>
                        <p className="text-xs text-[#73776F] mt-0.5 truncate">{property.details}</p>
                      </div>

                      <div className="mt-3 pt-2.5 flex items-baseline justify-between border-t border-[#E5E0D5]/50">
                        {property.badge === 'For Sale' ? (
                          <div>
                            <span className="text-base font-bold text-[#234B36] font-headline">
                              {formatPrice(property.pricePerNight)}
                            </span>
                            <span className="text-xs font-semibold text-[#D87836] ml-1.5">· For Sale</span>
                            <span className="block text-[11px] text-[#73776F]/80">
                              Verified title deed & direct inquiry
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-base font-bold text-[#252923] font-headline">
                              {formatPrice(property.pricePerNight)}
                            </span>
                            <span className="text-xs text-[#73776F]"> / night</span>
                            <span className="block text-[11px] text-[#73776F]/80">
                              {formatPrice(property.totalBeforeTaxes)} total before taxes
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* 6. PAGINATION & LOAD MORE SECTION                            */}
        {/* ============================================================ */}
        <section className="w-full px-4 sm:px-6 lg:px-12 py-10 flex flex-col items-center justify-center gap-4 animate-fade-in-up">
          <p className="text-sm text-[#73776F] font-medium">
            Showing {displayedListings.length} of {filteredListings.length} properties
          </p>

          {/* Progress Indicator Bar */}
          <div className="w-48 h-1.5 bg-[#ece6dc] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#234B36] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <button
            type="button"
            disabled={isLoadingMore}
            onClick={handleLoadMore}
            className="show-more-btn mt-2 inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-[#234B36] text-white font-semibold text-sm shadow-md hover:bg-[#2D5E43] hover:shadow-lg active:scale-95 transition-all duration-200 relative overflow-hidden group cursor-pointer disabled:opacity-75"
          >
            {isLoadingMore ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Loading stays...</span>
              </>
            ) : allLoadedMessage ? (
              <>
                <span>All stays loaded</span>
                <span className="material-symbols-outlined text-base">check</span>
              </>
            ) : (
              <>
                <span>Show more stays</span>
                <span className="material-symbols-outlined text-base transition-transform duration-200 group-hover:translate-y-0.5">
                  expand_more
                </span>
              </>
            )}
          </button>
        </section>
          </>
        )}
      </main>

      {/* ============================================================ */}
      {/* Language & Currency Modal */}
      {currencyModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCurrencyModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E5E0D5]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D5]/60 mb-5">
              <h3 className="text-lg font-bold font-headline text-[#252923]">Language & Currency</h3>
              <button
                type="button"
                onClick={() => setCurrencyModalOpen(false)}
                className="text-[#73776F] hover:text-[#234B36] p-1.5 rounded-full hover:bg-[#F8F5ED]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-[#73776F] uppercase tracking-wider block mb-2">Display Currency</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setCurrency('ETB'); setCurrencyModalOpen(false); }}
                    className={`p-3.5 rounded-xl border text-left font-semibold text-sm transition ${currency === 'ETB' ? 'border-[#234B36] bg-[#234B36]/10 text-[#234B36]' : 'border-[#E5E0D5] hover:border-[#234B36]'}`}
                  >
                    <div className="font-bold">ETB</div>
                    <div className="text-xs text-[#73776F]">Ethiopian Birr</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCurrency('USD'); setCurrencyModalOpen(false); }}
                    className={`p-3.5 rounded-xl border text-left font-semibold text-sm transition ${currency === 'USD' ? 'border-[#234B36] bg-[#234B36]/10 text-[#234B36]' : 'border-[#E5E0D5] hover:border-[#234B36]'}`}
                  >
                    <div className="font-bold">USD</div>
                    <div className="text-xs text-[#73776F]">US Dollar ($)</div>
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E5E0D5]/60 flex justify-end">
              <button
                type="button"
                onClick={() => setCurrencyModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#2D5E43] transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. COMPREHENSIVE FILTER MODAL                                */}
      {/* ============================================================ */}
      {filterModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm animate-fade-in-up"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFilterModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#E5E0D5] relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E5E0D5]/70 flex items-center justify-between bg-[#FAF8F2]/60">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#234B36] text-xl">tune</span>
                <h3 className="text-lg font-bold font-headline text-[#252923]">Filter Properties</h3>
                {totalActiveFilterCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#234B36] text-white text-xs font-bold">
                    {totalActiveFilterCount} active
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-[#EEF3EF] flex items-center justify-center text-[#73776F] hover:text-[#234B36] transition cursor-pointer border border-[#E5E0D5]"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-7 overflow-y-auto flex-1">
              {/* 1. PRICE RANGE (ETB) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-[#252923]">Price Range (ETB per night)</h4>
                  {(minPrice !== null || maxPrice !== null) && (
                    <button
                      type="button"
                      onClick={() => { setMinPrice(null); setMaxPrice(null); }}
                      className="text-xs text-[#234B36] font-semibold underline cursor-pointer"
                    >
                      Reset Price
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#73776F] block mb-1">Minimum Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#73776F]">ETB</span>
                      <input
                        type="number"
                        placeholder="1,000"
                        value={minPrice ?? ''}
                        onChange={(e) => setMinPrice(e.target.value ? Math.max(0, parseInt(e.target.value, 10)) : null)}
                        className="w-full pl-12 pr-3 py-2 rounded-xl border border-[#E5E0D5] bg-[#FAF8F2] text-sm font-semibold text-[#252923] focus:outline-none focus:border-[#234B36]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#73776F] block mb-1">Maximum Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#73776F]">ETB</span>
                      <input
                        type="number"
                        placeholder="25,000+"
                        value={maxPrice ?? ''}
                        onChange={(e) => setMaxPrice(e.target.value ? Math.max(0, parseInt(e.target.value, 10)) : null)}
                        className="w-full pl-12 pr-3 py-2 rounded-xl border border-[#E5E0D5] bg-[#FAF8F2] text-sm font-semibold text-[#252923] focus:outline-none focus:border-[#234B36]"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Price Tier Pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: 'Under 4,000 ETB', min: null, max: 4000 },
                    { label: '4,000 – 8,000 ETB', min: 4000, max: 8000 },
                    { label: '8,000 – 15,000 ETB', min: 8000, max: 15000 },
                    { label: '15,000+ ETB', min: 15000, max: null },
                  ].map((tier) => {
                    const isSelected = minPrice === tier.min && maxPrice === tier.max;
                    return (
                      <button
                        key={tier.label}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setMinPrice(null);
                            setMaxPrice(null);
                          } else {
                            setMinPrice(tier.min);
                            setMaxPrice(tier.max);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#234B36] text-white border-[#234B36]'
                            : 'bg-white border-[#E5E0D5] text-[#252923] hover:border-[#234B36]/60 hover:bg-[#EEF3EF]'
                        }`}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. PROPERTY TYPE */}
              <div>
                <h4 className="font-bold text-sm text-[#252923] mb-3">Property Type</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'all', label: 'Any Type', icon: 'domain' },
                    { id: 'apartment', label: 'Apartment', icon: 'apartment' },
                    { id: 'villa', label: 'Villa', icon: 'villa' },
                    { id: 'house', label: 'House', icon: 'home' },
                  ].map((type) => {
                    const isSelected = selectedPropertyType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedPropertyType(type.id)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                          isSelected
                            ? 'border-[#234B36] bg-[#234B36]/5 ring-1 ring-[#234B36]'
                            : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/50'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-xl mb-1.5 ${isSelected ? 'text-[#234B36]' : 'text-[#73776F]'}`}>
                          {type.icon}
                        </span>
                        <span className="text-xs font-bold text-[#252923]">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. ROOMS & BEDS */}
              <div>
                <h4 className="font-bold text-sm text-[#252923] mb-3">Rooms and Beds</h4>
                <div className="space-y-3.5">
                  <div>
                    <span className="text-xs text-[#73776F] block mb-1.5 font-medium">Bedrooms</span>
                    <div className="flex gap-2">
                      {(['any', 1, 2, 3, 4] as const).map((num) => {
                        const isSelected = selectedBedrooms === num;
                        return (
                          <button
                            key={String(num)}
                            type="button"
                            onClick={() => setSelectedBedrooms(num)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#234B36] text-white border-[#234B36]'
                                : 'bg-white border-[#E5E0D5] text-[#252923] hover:border-[#234B36]/50'
                            }`}
                          >
                            {num === 'any' ? 'Any' : `${num}+`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-[#73776F] block mb-1.5 font-medium">Bathrooms</span>
                    <div className="flex gap-2">
                      {(['any', 1, 2, 3] as const).map((num) => {
                        const isSelected = selectedBathrooms === num;
                        return (
                          <button
                            key={String(num)}
                            type="button"
                            onClick={() => setSelectedBathrooms(num)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#234B36] text-white border-[#234B36]'
                                : 'bg-white border-[#E5E0D5] text-[#252923] hover:border-[#234B36]/50'
                            }`}
                          >
                            {num === 'any' ? 'Any' : `${num}+`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. ETHIOPIAN ESSENTIALS & AMENITIES */}
              <div>
                <h4 className="font-bold text-sm text-[#252923] mb-3">Ethiopian Essentials & Amenities</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'Standby Generator', label: 'Standby Generator (24/7 Power)', icon: 'bolt' },
                    { id: 'Water Tank', label: 'Water Reserve Tank', icon: 'water_drop' },
                    { id: 'Wi-Fi', label: 'High-Speed Fiber Wi-Fi', icon: 'wifi' },
                    { id: 'Free Parking', label: 'Free Dedicated Parking', icon: 'local_parking' },
                    { id: 'Kitchen', label: 'Fully Equipped Kitchen', icon: 'kitchen' },
                    { id: 'Security', label: 'Gated Compound / 24/7 Guard', icon: 'shield' },
                    { id: 'Workspace', label: 'Dedicated Workspace', icon: 'desk' },
                  ].map((amenity) => {
                    const isSelected = selectedAmenities.includes(amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAmenities((prev) => prev.filter((a) => a !== amenity.id));
                          } else {
                            setSelectedAmenities((prev) => [...prev, amenity.id]);
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
                          isSelected
                            ? 'border-[#234B36] bg-[#234B36]/5 text-[#234B36]'
                            : 'border-[#E5E0D5] bg-white text-[#252923] hover:border-[#234B36]/50'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-lg ${isSelected ? 'text-[#234B36]' : 'text-[#73776F]'}`}>
                          {amenity.icon}
                        </span>
                        <span className="text-xs font-semibold flex-1">{amenity.label}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-sm text-[#234B36]">check_circle</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. BOOKING OPTIONS */}
              <div>
                <h4 className="font-bold text-sm text-[#252923] mb-3">Booking Options</h4>
                <div className="space-y-3">
                  {[
                    {
                      id: 'Instant Book',
                      title: 'Instant Book',
                      desc: 'Listings you can book without waiting for host confirmation',
                    },
                    {
                      id: 'Superhost',
                      title: 'Superhost',
                      desc: 'Recognized, experienced hosts with 4.9+ star ratings',
                    },
                    {
                      id: 'Entire home',
                      title: 'Entire Home',
                      desc: 'Exclusive private stay with no shared host spaces',
                    },
                  ].map((opt) => {
                    const isChecked = activeFilters.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-[#E5E0D5] bg-white hover:bg-[#FAF8F2]/60 cursor-pointer"
                      >
                        <div className="pr-4">
                          <p className="font-bold text-xs sm:text-sm text-[#252923]">{opt.title}</p>
                          <p className="text-[11px] sm:text-xs text-[#73776F]">{opt.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setActiveFilters((prev) => [...prev, opt.id]);
                            } else {
                              setActiveFilters((prev) => prev.filter((f) => f !== opt.id));
                            }
                          }}
                          className="w-5 h-5 accent-[#234B36] rounded cursor-pointer shrink-0"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E5E0D5]/70 flex items-center justify-between bg-[#FAF8F2]/80">
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-bold text-[#73776F] hover:text-[#234B36] underline cursor-pointer"
              >
                Clear all filters
              </button>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="px-6 py-3 rounded-2xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>Show {filteredListings.length} {filteredListings.length === 1 ? 'stay' : 'stays'}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. EDITORIAL FOOTER                                          */}
      {/* ============================================================ */}
      <footer className="w-full bg-[#f6f0e8] border-t border-[#E5E0D5]/50 mt-12 pt-12 pb-8">
        <div className="w-full px-4 sm:px-6 lg:px-12 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10">
            {/* Support */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Support</span>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Help Center
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Safety &amp; AirCover
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Cancellation Options
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Neighborhood Support
              </a>
            </div>

            {/* Hosting */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Hosting</span>
              <Link href="/become-a-host" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Engida your home
              </Link>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Host Cover
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Hosting Resources
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Community Forum
              </a>
            </div>

            {/* Discover */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Discover</span>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Curated Stays
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Local Guides
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Architectural Digest
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Gift Cards
              </a>
            </div>

            {/* Engida */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#252923] uppercase tracking-wider">Engida</span>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Newsroom
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Careers
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Investors
              </a>
              <a href="#" className="text-xs text-[#73776F] hover:text-[#234B36] transition-colors duration-150">
                Sustainability
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E5E0D5]/40">
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#73776F]">
              <span>&copy; {new Date().getFullYear()} Engida. All rights reserved.</span>
              <span>&middot;</span>
              <a href="#" className="hover:text-[#234B36] transition-colors duration-150">
                Privacy
              </a>
              <span>&middot;</span>
              <a href="#" className="hover:text-[#234B36] transition-colors duration-150">
                Terms
              </a>
              <span>&middot;</span>
              <a href="#" className="hover:text-[#234B36] transition-colors duration-150">
                Sitemap
              </a>
            </div>

            <div className="flex items-center gap-6 text-[#73776F]">
              <span className="material-symbols-outlined text-base cursor-pointer hover:text-[#234B36] hover:scale-110 active:scale-90 transition-all duration-200">
                share
              </span>
              <span className="material-symbols-outlined text-base cursor-pointer hover:text-[#234B36] hover:scale-110 active:scale-90 transition-all duration-200">
                mail
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Compare Bar */}
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

      {/* AI Conversational Search Modal */}
      <AiConversationalSearchModal
        isOpen={aiSearchModalOpen}
        onClose={() => setAiSearchModalOpen(false)}
      />

      {/* AI Property Comparison Modal */}
      <AiPropertyComparisonModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        propertyIds={selectedForCompare}
      />


    </div>
  );
}
