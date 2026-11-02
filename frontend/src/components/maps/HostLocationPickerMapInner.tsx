'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Search,
  MapPin,
  Navigation,
  Loader2,
  Check,
  Compass,
  AlertTriangle,
  ExternalLink,
  X,
  Globe,
} from 'lucide-react';

export interface LocationSelectedData {
  address: string;
  city: string;
  subCity: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
}

interface HostLocationPickerMapInnerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string;
  initialCity?: string;
  initialSubCity?: string;
  initialNeighborhood?: string;
  onLocationChange: (data: LocationSelectedData) => void;
}

// Ethiopian geographic boundary box
export const isWithinEthiopia = (lat: number, lng: number): boolean => {
  return lat >= 3.2 && lat <= 15.0 && lng >= 32.8 && lng <= 48.2;
};

// Known Ethiopian City & Landmark anchors
export const ETHIOPIAN_CITIES_ANCHORS: Record<
  string,
  { lat: number; lng: number; city: string; neighborhood?: string }
> = {
  'debre berhan': { lat: 9.6752, lng: 39.5325, city: 'Debre Berhan', neighborhood: 'Central' },
  'debre birhan': { lat: 9.6752, lng: 39.5325, city: 'Debre Berhan', neighborhood: 'Central' },
  'debere berhan': { lat: 9.6752, lng: 39.5325, city: 'Debre Berhan', neighborhood: 'Central' },
  'addis ababa': { lat: 8.9982, lng: 38.7844, city: 'Addis Ababa', neighborhood: 'Bole' },
  'hawassa': { lat: 7.0504, lng: 38.4763, city: 'Hawassa', neighborhood: 'Piazza' },
  'bahir dar': { lat: 11.5936, lng: 37.3908, city: 'Bahir Dar', neighborhood: 'Kebele 04' },
  'bishoftu': { lat: 8.7523, lng: 38.9785, city: 'Bishoftu', neighborhood: 'Kuriftu' },
  'gondar': { lat: 12.6075, lng: 37.4650, city: 'Gondar', neighborhood: 'Piazza' },
  'mekelle': { lat: 13.4967, lng: 39.4753, city: 'Mekelle', neighborhood: 'Romanat' },
  'adama': { lat: 8.54, lng: 39.27, city: 'Adama', neighborhood: 'Posta Bet' },
  'nazret': { lat: 8.54, lng: 39.27, city: 'Adama', neighborhood: 'Posta Bet' },
  'jimma': { lat: 7.6734, lng: 36.8344, city: 'Jimma', neighborhood: 'Central' },
  'arba minch': { lat: 6.0333, lng: 37.55, city: 'Arba Minch', neighborhood: 'Sikela' },
  'dire dawa': { lat: 9.5931, lng: 41.8661, city: 'Dire Dawa', neighborhood: 'Kezira' },
};

export const resolveEthiopianAnchor = (
  preferredCity?: string
): { lat: number; lng: number; city: string; neighborhood: string } => {
  if (preferredCity) {
    const lower = preferredCity.toLowerCase().trim();
    for (const [key, val] of Object.entries(ETHIOPIAN_CITIES_ANCHORS)) {
      if (lower.includes(key)) {
        return {
          lat: val.lat,
          lng: val.lng,
          city: val.city,
          neighborhood: val.neighborhood || 'Central',
        };
      }
    }
  }
  // Default anchor if no city is known: Debre Berhan
  return {
    lat: 9.6752,
    lng: 39.5325,
    city: 'Debre Berhan',
    neighborhood: 'Central',
  };
};

// Popular Ethiopian landmarks for 1-click jump (featuring Debre Berhan first)
export const QUICK_PRESETS = [
  {
    name: 'Debre Berhan (Central)',
    lat: 9.6752,
    lng: 39.5325,
    subCity: '',
    neighborhood: 'Central',
    city: 'Debre Berhan',
    featured: true,
  },
  {
    name: 'Debre Berhan (Tebase)',
    lat: 9.6607,
    lng: 39.5319,
    subCity: '',
    neighborhood: 'Tebase',
    city: 'Debre Berhan',
    featured: true,
  },
  {
    name: 'Bole Medhanialem',
    lat: 8.9982,
    lng: 38.7844,
    subCity: 'Bole',
    neighborhood: 'Medhanialem',
    city: 'Addis Ababa',
    featured: false,
  },
  {
    name: 'Kazanchis (ECA)',
    lat: 9.0175,
    lng: 38.7668,
    subCity: 'Kirkos',
    neighborhood: 'Kazanchis',
    city: 'Addis Ababa',
    featured: false,
  },
  {
    name: 'Atlas / Rwanda',
    lat: 9.0065,
    lng: 38.7758,
    subCity: 'Bole',
    neighborhood: 'Atlas',
    city: 'Addis Ababa',
    featured: false,
  },
  {
    name: 'Sarbet (Old Airport)',
    lat: 8.9961,
    lng: 38.7352,
    subCity: 'Kirkos',
    neighborhood: 'Sarbet',
    city: 'Addis Ababa',
    featured: false,
  },
  {
    name: 'Piassa / Arada',
    lat: 9.0345,
    lng: 38.7516,
    subCity: 'Arada',
    neighborhood: 'Piassa',
    city: 'Addis Ababa',
    featured: false,
  },
  {
    name: 'Gerji Imperial',
    lat: 9.0055,
    lng: 38.8105,
    subCity: 'Bole',
    neighborhood: 'Gerji',
    city: 'Addis Ababa',
    featured: false,
  },
  {
    name: 'Bahir Dar (Tana)',
    lat: 11.5936,
    lng: 37.3908,
    subCity: '',
    neighborhood: 'Kebele 04',
    city: 'Bahir Dar',
    featured: false,
  },
  {
    name: 'Hawassa (Lake)',
    lat: 7.0504,
    lng: 38.4763,
    subCity: '',
    neighborhood: 'Piazza',
    city: 'Hawassa',
    featured: false,
  },
  {
    name: 'Bishoftu (Kuriftu)',
    lat: 8.7523,
    lng: 38.9785,
    subCity: '',
    neighborhood: 'Kuriftu',
    city: 'Bishoftu',
    featured: false,
  },
  {
    name: 'Gondar (Fasil)',
    lat: 12.6075,
    lng: 37.465,
    subCity: '',
    neighborhood: 'Piazza',
    city: 'Gondar',
    featured: false,
  },
];

// Local instant dictionary for instant offline search matching
const LOCAL_SEARCH_INDEX = [
  {
    place_id: 'db-1',
    display_name: 'Debre Berhan City Center, North Shewa, Amhara, Ethiopia',
    lat: '9.6752',
    lon: '39.5325',
    city: 'Debre Berhan',
    neighborhood: 'Central',
  },
  {
    place_id: 'db-2',
    display_name: 'Tebase, Debre Berhan University (DBU) Area, Debre Berhan, Ethiopia',
    lat: '9.6607',
    lon: '39.5319',
    city: 'Debre Berhan',
    neighborhood: 'Tebase',
  },
  {
    place_id: 'db-3',
    display_name: 'Kebele 04 / Menelik Square, Debre Berhan, Ethiopia',
    lat: '9.6780',
    lon: '39.5340',
    city: 'Debre Berhan',
    neighborhood: 'Kebele 04',
  },
  {
    place_id: 'aa-1',
    display_name: 'Bole Medhanialem, Bole, Addis Ababa, Ethiopia',
    lat: '8.9982',
    lon: '38.7844',
    city: 'Addis Ababa',
    neighborhood: 'Bole Medhanialem',
  },
  {
    place_id: 'aa-2',
    display_name: 'Kazanchis, UNECA / Intercontinental Hub, Addis Ababa, Ethiopia',
    lat: '9.0175',
    lon: '38.7668',
    city: 'Addis Ababa',
    neighborhood: 'Kazanchis',
  },
  {
    place_id: 'aa-3',
    display_name: 'Atlas / Cameroon Street, Bole, Addis Ababa, Ethiopia',
    lat: '9.0065',
    lon: '38.7758',
    city: 'Addis Ababa',
    neighborhood: 'Atlas',
  },
  {
    place_id: 'aa-4',
    display_name: 'Sarbet / Old Airport, Kirkos, Addis Ababa, Ethiopia',
    lat: '8.9961',
    lon: '38.7352',
    city: 'Addis Ababa',
    neighborhood: 'Sarbet',
  },
  {
    place_id: 'aa-5',
    display_name: 'Piassa, Arada, Addis Ababa, Ethiopia',
    lat: '9.0345',
    lon: '38.7516',
    city: 'Addis Ababa',
    neighborhood: 'Piassa',
  },
  {
    place_id: 'bd-1',
    display_name: 'Bahir Dar Lake Tana Waterfront, Bahir Dar, Ethiopia',
    lat: '11.5936',
    lon: '37.3908',
    city: 'Bahir Dar',
    neighborhood: 'Lake Shore',
  },
  {
    place_id: 'hw-1',
    display_name: 'Hawassa Lake View / Piazza, Hawassa, Ethiopia',
    lat: '7.0504',
    lon: '38.4763',
    city: 'Hawassa',
    neighborhood: 'Piazza',
  },
];

interface SearchResultItem {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
  city?: string;
  neighborhood?: string;
}

export default function HostLocationPickerMapInner({
  initialLat,
  initialLng,
  initialAddress = '',
  initialCity = '',
  initialSubCity = '',
  initialNeighborhood = '',
  onLocationChange,
}: HostLocationPickerMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Initial coordinates resolution (prioritizing initialLat/Lng if within Ethiopia, otherwise resolving by city)
  const anchor = resolveEthiopianAnchor(initialCity);
  const startLat =
    typeof initialLat === 'number' && !isNaN(initialLat) && isWithinEthiopia(initialLat, initialLng || 39.5)
      ? initialLat
      : anchor.lat;
  const startLng =
    typeof initialLng === 'number' && !isNaN(initialLng) && isWithinEthiopia(startLat, initialLng)
      ? initialLng
      : anchor.lng;

  const [currentCoords, setCurrentCoords] = useState<[number, number]>([startLat, startLng]);
  const [addressSummary, setAddressSummary] = useState<string>(
    [initialAddress, initialNeighborhood, initialSubCity, initialCity].filter(Boolean).join(', ') ||
      `${anchor.city}, Ethiopia`
  );

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [locateMessage, setLocateMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  // Custom luxury SVG Pin Marker
  const createCustomPinIcon = () => {
    return L.divIcon({
      className: 'custom-engida-pin',
      html: `
        <div style="position: relative; width: 42px; height: 48px; transform: translate(-21px, -48px); cursor: grab;">
          <svg viewBox="0 0 384 512" width="42" height="48" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));">
            <path fill="#234B36" stroke="#FFFFFF" stroke-width="20" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
          </svg>
          <div style="position: absolute; top: 11px; left: 12px; width: 18px; height: 18px; background: #E6C687; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; background: #234B36; border-radius: 50%;"></div>
          </div>
        </div>
      `,
      iconSize: [42, 48],
      iconAnchor: [21, 48],
    });
  };

  // Reverse geocode coordinates to parse address components
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      // Guard against foreign coordinates
      if (!isWithinEthiopia(lat, lng)) {
        console.warn('Blocked reverse geocoding on non-Ethiopian coordinates:', lat, lng);
        return;
      }

      setIsReverseGeocoding(true);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          },
        });

        if (!res.ok) throw new Error('Failed to reverse geocode');
        const data = await res.json();
        const addr = data.address || {};

        // Parse meaningful components
        const road = addr.road || addr.pedestrian || addr.footway || addr.amenity || addr.building || '';
        let city = addr.city || addr.town || addr.municipality || addr.county || addr.state || '';
        let subCity = addr.suburb || addr.city_district || addr.district || addr.state_district || '';
        let neighborhood = addr.neighbourhood || addr.quarter || addr.residential || '';

        // Normalize Debre Berhan spellings
        if (
          /debre\s*b[ei]rhan/i.test(city) ||
          /debere\s*berhan/i.test(city) ||
          /ደብረ\s*ብርሃን/.test(city) ||
          (lat >= 9.60 && lat <= 9.75 && lng >= 39.45 && lng <= 39.60)
        ) {
          city = 'Debre Berhan';
          if (!neighborhood && subCity && !subCity.toLowerCase().includes('shewa')) {
            neighborhood = subCity;
          }
          if (subCity.toLowerCase().includes('shewa')) {
            subCity = '';
          }
        }

        if (!city) {
          city = initialCity || 'Debre Berhan';
        }

        const fullStreet =
          road ||
          data.name ||
          (neighborhood ? `${neighborhood} area` : 'Street Address');
        const summary = [fullStreet, neighborhood, subCity, city].filter(Boolean).join(', ');

        setAddressSummary(summary);

        onLocationChange({
          address: fullStreet,
          city,
          subCity,
          neighborhood,
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
        });
      } catch (err) {
        console.warn('Reverse geocoding fallback:', err);
        // Fallback to basic coordinates if offline/rate-limited
        onLocationChange({
          address: initialAddress || 'Identified on Map',
          city: initialCity || 'Debre Berhan',
          subCity: initialSubCity || '',
          neighborhood: initialNeighborhood || '',
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
        });
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [initialAddress, initialCity, initialSubCity, initialNeighborhood, onLocationChange]
  );

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: currentCoords,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Official OpenStreetMap standard tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
          }).addTo(map);

    // Custom Draggable Pin Marker
    const marker = L.marker(currentCoords, {
      icon: createCustomPinIcon(),
      draggable: true,
      autoPan: true,
    }).addTo(map);

    // Marker drag end event
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      if (!isWithinEthiopia(pos.lat, pos.lng)) {
        setLocateMessage({
          text: 'Selected pin is outside Ethiopia. Please position within Ethiopian boundaries.',
          type: 'warning',
        });
        return;
      }
      setCurrentCoords([pos.lat, pos.lng]);
      reverseGeocode(pos.lat, pos.lng);
    });

    // Click map to reposition marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isWithinEthiopia(e.latlng.lat, e.latlng.lng)) {
        setLocateMessage({
          text: 'Clicked location is outside Ethiopia. Please select an Ethiopian property location.',
          type: 'warning',
        });
        return;
      }
      marker.setLatLng(e.latlng);
      setCurrentCoords([e.latlng.lat, e.latlng.lng]);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerInstanceRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, []);

  // Update marker when coords change from search or preset
  const setMapLocation = (lat: number, lng: number, zoom = 16) => {
    if (!isWithinEthiopia(lat, lng)) {
      console.warn('Prevented moving map to coordinates outside Ethiopia:', lat, lng);
      return;
    }
    setCurrentCoords([lat, lng]);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([lat, lng]);
    }
  };

  // Live search debounced with instant local dictionary fallback
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const term = searchQuery.trim().toLowerCase();

    // 1. Instant local match
    const localMatches = LOCAL_SEARCH_INDEX.filter(
      (item) =>
        item.display_name.toLowerCase().includes(term) ||
        item.city.toLowerCase().includes(term) ||
        (item.neighborhood && item.neighborhood.toLowerCase().includes(term))
    );

    if (localMatches.length > 0) {
      setSearchResults(localMatches);
      setShowDropdown(true);
    }

    // 2. Query Nominatim biased specifically to Ethiopia
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const q = encodeURIComponent(searchQuery.trim());
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&countrycodes=et&limit=6`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en' },
        });
        if (res.ok) {
          const remoteData: SearchResultItem[] = await res.json();
          // Filter remote data to ensure within Ethiopia bounds
          const validRemote = remoteData.filter((item) => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            return !isNaN(lat) && !isNaN(lng) && isWithinEthiopia(lat, lng);
          });

          // Merge local and remote without duplicates
          const seen = new Set<string>();
          const combined: SearchResultItem[] = [];

          for (const item of [...localMatches, ...validRemote]) {
            const key = `${parseFloat(item.lat).toFixed(3)},${parseFloat(item.lon).toFixed(3)}`;
            if (!seen.has(key)) {
              seen.add(key);
              combined.push(item);
            }
          }

          setSearchResults(combined);
          setShowDropdown(combined.length > 0);
        }
      } catch (err) {
        console.warn('Map search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle selecting a search result
  const handleSelectResult = (item: SearchResultItem) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (isNaN(lat) || isNaN(lng)) return;

    setMapLocation(lat, lng, 16);
    setShowDropdown(false);
    setSearchQuery('');
    reverseGeocode(lat, lng);
  };

  // Preset button click
  const handleSelectPreset = (preset: (typeof QUICK_PRESETS)[0]) => {
    setMapLocation(preset.lat, preset.lng, 16);
    onLocationChange({
      address: preset.name,
      city: preset.city,
      subCity: preset.subCity,
      neighborhood: preset.neighborhood,
      latitude: preset.lat,
      longitude: preset.lng,
    });
    setAddressSummary(`${preset.name}, ${preset.subCity ? preset.subCity + ', ' : ''}${preset.city}`);
    setLocateMessage({
      text: `Centered on ${preset.name}. Drag the pin to your exact building.`,
      type: 'info',
    });
    setTimeout(() => setLocateMessage(null), 4500);
  };

  // Safe Ethiopian fallback when browser GPS is blocked, unavailable, or on VPN
  const fallbackIpGeolocation = async () => {
    const targetAnchor = resolveEthiopianAnchor(initialCity);

    // Try reliable HTTPS IP services with short timeouts
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Primary: ipwho.is (fast HTTPS, reliable country code)
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const lat = data.latitude;
        const lng = data.longitude;
        const countryCode = data.country_code;
        const countryName = data.country;

        // Check if detected IP is genuinely in Ethiopia
        if (countryCode === 'ET' && typeof lat === 'number' && typeof lng === 'number' && isWithinEthiopia(lat, lng)) {
          setMapLocation(lat, lng, 15);
          reverseGeocode(lat, lng);
          setIsLocating(false);
          setLocateMessage({
            text: `Pinpointed via Ethiopian network (${data.city || 'Addis Ababa'}). Drag pin to exact building.`,
            type: 'success',
          });
          setTimeout(() => setLocateMessage(null), 5000);
          return true;
        } else {
          // Foreign IP detected (VPN, Proxy, or foreign ISP)
          console.warn(`Foreign IP detected (${countryName || countryCode}). Guarding against non-Ethiopian location.`);
          setMapLocation(targetAnchor.lat, targetAnchor.lng, 15);
          reverseGeocode(targetAnchor.lat, targetAnchor.lng);
          setIsLocating(false);
          setLocateMessage({
            text: `VPN/foreign network detected (${countryName || 'Foreign country'}). Centered safely on ${targetAnchor.city}, Ethiopia. Please drag pin to your exact building or select from popular presets below.`,
            type: 'warning',
          });
          setTimeout(() => setLocateMessage(null), 8000);
          return false;
        }
      }
    } catch {
      // Ignore network errors and proceed to safe Ethiopian anchor
    }

    // Default safe fallback: Centered on Debre Berhan or chosen city
    setMapLocation(targetAnchor.lat, targetAnchor.lng, 15);
    reverseGeocode(targetAnchor.lat, targetAnchor.lng);
    setIsLocating(false);
    setLocateMessage({
      text: `Centered on ${targetAnchor.city}, Ethiopia. Drag pin to fine-tune your exact property location.`,
      type: 'info',
    });
    setTimeout(() => setLocateMessage(null), 5000);
    return false;
  };

  // Device Geolocation button with two-tier resolution and Ethiopian bounds guard
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocateMessage(null);

    // If on insecure HTTP context on non-localhost IP, modern browsers block geolocation API
    const isInsecureNonLocal =
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    if (isInsecureNonLocal || !navigator.geolocation) {
      await fallbackIpGeolocation();
      return;
    }

    // Helper to evaluate returned coordinates
    const handleSuccessPosition = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (isWithinEthiopia(lat, lng)) {
        setMapLocation(lat, lng, 17);
        reverseGeocode(lat, lng);
        setIsLocating(false);
        setLocateMessage({
          text: 'Accurately located via device location. Drag pin to fine-tune your building.',
          type: 'success',
        });
        setTimeout(() => setLocateMessage(null), 5000);
      } else {
        // Device returned foreign coordinates (e.g. GPS spoofing or virtual desktop)
        const targetAnchor = resolveEthiopianAnchor(initialCity);
        setMapLocation(targetAnchor.lat, targetAnchor.lng, 15);
        reverseGeocode(targetAnchor.lat, targetAnchor.lng);
        setIsLocating(false);
        setLocateMessage({
          text: `Device reported coordinates outside Ethiopia. Centered on ${targetAnchor.city}, Ethiopia. Drag pin to your property.`,
          type: 'warning',
        });
        setTimeout(() => setLocateMessage(null), 8000);
      }
    };

    // Tier 1: Try high accuracy with a 10s timeout
    navigator.geolocation.getCurrentPosition(
      handleSuccessPosition,
      (err) => {
        console.warn('Tier 1 high-accuracy GPS failed:', err.message, 'Trying Tier 2 standard network location…');

        // Tier 2: Try standard accuracy (works on desktop Windows laptops without GPS satellite hardware)
        navigator.geolocation.getCurrentPosition(
          handleSuccessPosition,
          async (err2) => {
            console.warn('Tier 2 network location failed:', err2.message, 'Falling back to safe Ethiopian IP lookup.');
            await fallbackIpGeolocation();
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Search Bar + GPS Locate Trigger */}
      <div className="relative">
        <div className="flex items-center gap-2">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#73776F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search Debre Berhan, Bole, Kazanchis, Hawassa, or landmark..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E5E0D5] bg-[#FCFAF6] text-xs font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition shadow-2xs"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-[#234B36] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Use My GPS Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#234B36]/30 bg-[#234B36]/10 hover:bg-[#234B36]/20 text-[#234B36] text-xs font-bold transition shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
            title="Pinpoint your current location in Ethiopia"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#234B36]" />
            ) : (
              <Navigation className="w-4 h-4 text-[#234B36]" />
            )}
            <span className="hidden sm:inline">Use My Location</span>
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E5E0D5] rounded-xl shadow-xl z-[1000] overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#252923] hover:bg-[#F8F5ED] flex items-start gap-2.5 border-b border-[#EEF3EF] last:border-b-0 transition cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#234B36] shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-relaxed">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Notifications (Success / Info / Warning) */}
      {locateMessage && (
        <div
          className={`p-3 px-3.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2.5 transition animate-in fade-in ${
            locateMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : locateMessage.type === 'warning'
              ? 'bg-amber-50 border border-amber-300 text-amber-900'
              : 'bg-[#FCFAF6] border border-[#E5E0D5] text-[#252923]'
          }`}
        >
          <div className="flex items-center gap-2">
            {locateMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : locateMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <Compass className="w-4 h-4 text-[#234B36] shrink-0" />
            )}
            <span className="leading-snug">{locateMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setLocateMessage(null)}
            className="p-1 rounded-md hover:bg-black/5 transition cursor-pointer shrink-0"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      )}

      {/* Quick Landmark & City Preset Badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
        <span className="text-[#73776F] font-bold shrink-0 flex items-center gap-1">
          <Compass className="w-3 h-3 text-[#234B36]" /> Quick Jump:
        </span>
        {QUICK_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => handleSelectPreset(preset)}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition shrink-0 cursor-pointer shadow-2xs ${
              preset.featured
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400'
                : 'bg-white border-[#E5E0D5] hover:border-[#234B36] text-[#252923] hover:bg-[#F8F5ED]'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Leaflet Map Canvas Container */}
      <div className="relative rounded-2xl overflow-hidden border border-[#E5E0D5] shadow-sm">
        <div ref={mapContainerRef} className="w-full h-80 z-0" />

        {/* Floating Instruction Banner */}
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#E5E0D5] shadow-md flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-bold text-[#252923]">
            {isReverseGeocoding ? (
              <span className="inline-flex items-center gap-1 text-[#234B36]">
                <Loader2 className="w-3 h-3 animate-spin" /> Resolving address in Ethiopia…
              </span>
            ) : (
              'Drag pin or click map to pinpoint property'
            )}
          </span>
        </div>

        {/* Live Detected Coordinates & Status Strip */}
        <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-[#E5E0D5] shadow-md flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-[#234B36] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                Selected Location:
              </span>
              <p className="text-xs font-bold text-[#252923] truncate">{addressSummary}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono bg-[#234B36]/10 text-[#234B36] font-bold px-2 py-0.5 rounded-md">
              {currentCoords[0].toFixed(4)}°, {currentCoords[1].toFixed(4)}°
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${currentCoords[0]},${currentCoords[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-[#234B36] hover:underline inline-flex items-center gap-0.5"
            >
              Verify in Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
