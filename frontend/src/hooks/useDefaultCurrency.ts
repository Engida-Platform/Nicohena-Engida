'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

let cachedCurrency: string | null = null;
let pendingRequest: Promise<string | null> | null = null;

async function fetchDefaultCurrency(): Promise<string | null> {
  if (cachedCurrency) return cachedCurrency;
  if (!pendingRequest) {
    pendingRequest = apiFetch<Record<string, unknown>>('/settings/public')
      .then((settings) => {
        const value = settings['localization.default_currency'];
        cachedCurrency = typeof value === 'string' && value ? value : null;
        return cachedCurrency;
      })
      .catch(() => null)
      .finally(() => {
        pendingRequest = null;
      });
  }
  return pendingRequest;
}

/**
 * Reads the platform's configured default currency from public settings so
 * money labels stay aligned with the backend instead of duplicating the code.
 */
export function useDefaultCurrency(): string {
  const [currency, setCurrency] = useState(cachedCurrency ?? '');

  useEffect(() => {
    let active = true;
    fetchDefaultCurrency().then((value) => {
      if (active && value) setCurrency(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return currency;
}
