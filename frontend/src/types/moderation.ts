import type { ReviewSubmissionType, ReviewStatus } from './host';

export interface ReviewQueueItem {
  id: string;
  propertyId: string;
  submissionType: ReviewSubmissionType;
  status: ReviewStatus;
  proposedChanges: Record<string, unknown> | null;
  submittedByHostId: string;
  submittedAt: string;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt?: string;
  updatedAt?: string;
  property?: {
    id: string;
    title: string;
    propertyType: string;
    listingType: string;
    pricePerNight?: number;
    salePrice?: number;
    city: string;
    address: string;
    coverImage?: string;
    status: string;
    adminHidden?: boolean;
    adminHiddenReason?: string;
  };
  submittedByHost?: {
    id: string;
    fullName: string;
    email: string;
  };
  reviewedByAdmin?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface AdminListingProperty {
  id?: string;
  title?: string;
  propertyType?: string;
  listingType?: string;
  pricePerNight?: number;
  salePrice?: number;
  city?: string;
  address?: string;
  status?: string;
  adminHidden?: boolean;
  adminHiddenReason?: string;
  adminHiddenAt?: string;
  coverImage?: string;
  maxGuests?: number;
  bedrooms?: number;
  description?: string;
  images?: string[];
  [key: string]: unknown;
}

export interface ReviewDetailResponse {
  review: ReviewQueueItem;
  property: AdminListingProperty;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diff: Record<string, { current: any; proposed: any }> | null;
}

