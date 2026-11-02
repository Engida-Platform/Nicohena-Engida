/**
 * Wishlist / Favorites Store for Engida Platform
 * Synchronizes saved properties across the homepage, property detail pages,
 * the guest dashboard, and dedicated wishlist views via localStorage and CustomEvent.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

const WISHLIST_STORAGE_KEY = 'engida_wishlist';
export const WISHLIST_UPDATED_EVENT = 'engida_wishlist_updated';

export interface SavedPropertyItem {
  id: string;
  title: string;
  location: string;
  subLocation?: string;
  pricePerNight: number;
  currency?: string;
  rating: number;
  reviewsCount?: number;
  images: string[];
  propertyType?: string;
  badge?: string;
  details?: string;
}

export function getSavedWishlist(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isWishlisted(id: string): boolean {
  if (!id) return false;
  const list = getSavedWishlist();
  return !!list[id];
}

export function getSavedCount(): number {
  const list = getSavedWishlist();
  return Object.values(list).filter(Boolean).length;
}

export function getSavedIds(): string[] {
  const list = getSavedWishlist();
  return Object.keys(list).filter((key) => list[key] === true);
}

export function toggleWishlist(id: string): boolean {
  if (typeof window === 'undefined' || !id) return false;
  try {
    const list = getSavedWishlist();
    const willBeSaved = !list[id];

    if (willBeSaved) {
      list[id] = true;
    } else {
      delete list[id];
    }

    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(list));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(WISHLIST_UPDATED_EVENT, {
          detail: { id, isSaved: willBeSaved, count: Object.keys(list).length },
        }),
      );
    }

    return willBeSaved;
  } catch {
    return false;
  }
}

export function removeWishlist(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const list = getSavedWishlist();
    delete list[id];
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent(WISHLIST_UPDATED_EVENT, {
        detail: { id, isSaved: false, count: Object.keys(list).length },
      }),
    );
  } catch {}
}

/**
 * React hook to reactively track saved property IDs and live count
 */
export function useWishlist() {
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [savedCount, setSavedCount] = useState(0);

  const sync = useCallback(() => {
    const current = getSavedWishlist();
    setWishlist(current);
    setSavedCount(Object.values(current).filter(Boolean).length);
  }, []);

  useEffect(() => {
    sync();
    const handleUpdate = () => sync();
    window.addEventListener(WISHLIST_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [sync]);

  return {
    wishlist,
    savedCount,
    isSaved: (id: string) => !!wishlist[id],
    toggle: (id: string) => toggleWishlist(id),
    remove: (id: string) => removeWishlist(id),
  };
}
