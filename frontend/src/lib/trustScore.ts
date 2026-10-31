/**
 * ENGIDA Property Trust Score Utility
 * 
 * Complies with the ENGIDA Project Proposal (Section 3.2):
 * "Design and implement host verification and property listing workflows,
 *  including a property trust score to support guest decision-making."
 * 
 * Computes a deterministic 0-100 Trust Score based on:
 * 1. Host Identity Verification (35 pts)
 * 2. Location & Geographic Precision (25 pts)
 * 3. Verified Visual Evidence (20 pts)
 * 4. Transparent Specs & Amenities (20 pts)
 */

export interface TrustScoreBreakdownItem {
  earned: number;
  max: number;
  label: string;
  passed: boolean;
}

export interface TrustScoreDetails {
  score: number; // 0 to 100
  tier: 'HIGH' | 'MEDIUM' | 'BASIC';
  tierLabel: string;
  isVerified: boolean; // score >= 80
  breakdown: {
    hostIdentity: TrustScoreBreakdownItem;
    locationPrecision: TrustScoreBreakdownItem;
    visualQuality: TrustScoreBreakdownItem;
    specsAndAmenities: TrustScoreBreakdownItem;
  };
  tips: string[];
}

export function computePropertyTrustScore(params: {
  hostVerificationStatus?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  address?: string | null;
  coverImage?: string | null;
  images?: string[];
  bedrooms?: number | string;
  bathrooms?: number | string;
  areaSqm?: number | string;
  amenityIds?: string[];
}): TrustScoreDetails {
  let score = 0;
  const tips: string[] = [];

  // 1. Host Identity Verification (Max: 35 pts)
  const isHostVerified = params.hostVerificationStatus === 'VERIFIED';
  const isHostPending = params.hostVerificationStatus === 'PENDING';
  const hostPts = isHostVerified ? 35 : isHostPending ? 15 : 0;
  score += hostPts;
  if (!isHostVerified) {
    tips.push('Verify your Ethiopian National Fayda or Kebele ID (+35 pts)');
  }

  // 2. Location & Geographic Precision (Max: 25 pts)
  const lat = typeof params.latitude === 'number' ? params.latitude : parseFloat(String(params.latitude || 0));
  const lng = typeof params.longitude === 'number' ? params.longitude : parseFloat(String(params.longitude || 0));
  const hasCoords = !isNaN(lat) && !isNaN(lng) && lat >= 3.2 && lat <= 15.0 && lng >= 32.8 && lng <= 48.2;
  const hasAddress = Boolean(params.address && params.address.trim().length >= 4);
  const hasCity = Boolean(params.city && params.city.trim().length >= 2);

  let locationPts = 0;
  if (hasCoords) locationPts += 15;
  if (hasAddress && hasCity) locationPts += 10;
  score += locationPts;
  if (!hasCoords) {
    tips.push('Pinpoint exact building on the interactive map (+15 pts)');
  }

  // 3. Visual Quality & Photos (Max: 20 pts)
  const hasCover = Boolean(params.coverImage && params.coverImage.trim().length > 0);
  const photoCount = (params.images?.length || 0) + (hasCover ? 1 : 0);
  let visualPts = 0;
  if (hasCover) visualPts += 10;
  if (photoCount >= 4) visualPts += 10;
  else if (photoCount >= 2) visualPts += 5;
  score += visualPts;
  if (photoCount < 4) {
    tips.push('Upload 4 or more property photos (+10 pts)');
  }

  // 4. Specs, Area & Amenities (Max: 20 pts)
  const bedrooms = typeof params.bedrooms === 'number' ? params.bedrooms : parseInt(String(params.bedrooms || 0), 10);
  const bathrooms = typeof params.bathrooms === 'number' ? params.bathrooms : parseInt(String(params.bathrooms || 0), 10);
  const areaSqm = typeof params.areaSqm === 'number' ? params.areaSqm : parseFloat(String(params.areaSqm || 0));
  const hasSpecs = bedrooms > 0 && bathrooms > 0;
  const hasArea = areaSqm > 0;
  const hasAmenities = (params.amenityIds?.length || 0) >= 3;

  let specPts = 0;
  if (hasSpecs) specPts += 8;
  if (hasArea) specPts += 4;
  if (hasAmenities) specPts += 8;
  score += specPts;
  if (!hasAmenities) {
    tips.push('Select at least 3 amenities like backup generator, water tank, or WiFi (+8 pts)');
  }

  const boundedScore = Math.min(100, Math.max(0, score));
  const isVerified = boundedScore >= 80;
  const tier: 'HIGH' | 'MEDIUM' | 'BASIC' = boundedScore >= 80 ? 'HIGH' : boundedScore >= 60 ? 'MEDIUM' : 'BASIC';
  const tierLabel = boundedScore >= 80 ? 'Trust Verified' : boundedScore >= 60 ? 'Standard Quality' : 'Needs Verification';

  return {
    score: boundedScore,
    tier,
    tierLabel,
    isVerified,
    breakdown: {
      hostIdentity: { earned: hostPts, max: 35, label: 'Host Identity Verified', passed: isHostVerified },
      locationPrecision: { earned: locationPts, max: 25, label: 'Exact Map Coordinates & Address', passed: hasCoords && hasAddress },
      visualQuality: { earned: visualPts, max: 20, label: 'Verified Photo Gallery', passed: photoCount >= 4 },
      specsAndAmenities: { earned: specPts, max: 20, label: 'Transparent Specs & Infrastructure', passed: hasSpecs && hasAmenities },
    },
    tips,
  };
}

