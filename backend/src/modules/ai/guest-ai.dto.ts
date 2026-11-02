import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
  IsIn,
} from 'class-validator';

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

export class ConversationalSearchDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsArray()
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];

  @IsOptional()
  currentFilters?: ConversationalSearchFilters;
}

export class GuestRecommendationsDto {
  @IsOptional()
  @IsArray()
  viewedPropertyIds?: string[];

  @IsOptional()
  @IsString()
  preferredCity?: string;

  @IsOptional()
  @IsNumber()
  maxBudget?: number;

  @IsOptional()
  @IsArray()
  amenityPreferences?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class ComparePropertiesDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsUUID('4', { each: true })
  propertyIds: string[];

  @IsOptional()
  @IsString()
  checkInDate?: string;

  @IsOptional()
  @IsString()
  checkOutDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  guestsCount?: number;

  @IsOptional()
  @IsIn(['value', 'space', 'location', 'amenities'])
  priority?: 'value' | 'space' | 'location' | 'amenities';
}

export class BookingAssistantDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;
}

