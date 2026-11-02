export interface ConversationalSearchFilters {
  city?: string;
  subCity?: string;
  neighborhood?: string;
  propertyType?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  bedrooms?: number;
  amenities?: string[];
  checkInDate?: string;
  checkOutDate?: string;
}

export interface EnrichedPropertyCard {
  id: string;
  title: string;
  description: string;
  city: string;
  subCity: string | null;
  neighborhood: string | null;
  propertyType: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  coverImage: string | null;
  images: string[];
  amenities: string[];
  averageRating: number;
  reviewCount: number;
  isAvailable: boolean;
  cancellationPolicy?: string;
}

export interface ConversationalSearchResponse {
  reply: string;
  parsedCriteria: ConversationalSearchFilters;
  properties: EnrichedPropertyCard[];
  total: number;
  suggestedFollowUps: string[];
}

export interface RecommendationItem {
  property: EnrichedPropertyCard;
  score: number;
  reason: string;
  matchTags: string[];
}

export interface RecommendationsResponse {
  recommendations: RecommendationItem[];
  profileSummary?: {
    preferredCity: string;
    preferredType: string;
    averageBudgetEtb: number;
  };
}

export interface ComparisonAttributeRow {
  attribute: string;
  category: string;
  values: string[];
}

export interface ComparisonTradeoff {
  propertyId: string;
  pros: string[];
  cons: string[];
}

export interface ComparisonAnalysis {
  bestOverall: {
    propertyId: string;
    title: string;
    rationale: string;
  };
  bestValue: {
    propertyId: string;
    title: string;
    rationale: string;
  };
  tradeoffs: ComparisonTradeoff[];
  recommendationSummary: string;
}

export interface PropertyComparisonResponse {
  properties: EnrichedPropertyCard[];
  matrix: ComparisonAttributeRow[];
  aiAnalysis: ComparisonAnalysis;
}

export interface BookingAssistantResponse {
  answer: string;
  category: 'PROPERTY' | 'RESERVATION' | 'PAYMENT' | 'POLICY' | 'GENERAL';
  dataContext?: any;
  actionSuggestions?: {
    label: string;
    href: string;
  }[];
}

