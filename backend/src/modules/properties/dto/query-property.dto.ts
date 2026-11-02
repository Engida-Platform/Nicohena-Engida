import { IsOptional, IsString, IsEnum, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType, ListingType } from '../entities/property.entity';

export class QueryPropertyDto {
  @ApiPropertyOptional({ example: 'Addis Ababa', description: 'Filter listings by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Bole', description: 'Filter listings by sub-city / district' })
  @IsOptional()
  @IsString()
  subCity?: string;

  @ApiPropertyOptional({ enum: PropertyType, example: PropertyType.APARTMENT, description: 'Property category/type' })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({ example: 'eco-lodge', description: 'Filter by dynamic category slug or ID' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'hawassa', description: 'Filter by dynamic destination slug or ID' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ enum: ListingType, example: ListingType.RENTAL, description: 'Listing type (RENTAL or SALE)' })
  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @ApiPropertyOptional({ example: 50, description: 'Minimum price per night/unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ example: 500, description: 'Maximum price per night/unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 2, description: 'Minimum number of bedrooms' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 4, description: 'Minimum guest capacity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guests?: number;

  @ApiPropertyOptional({ example: 'penthouse', description: 'Full-text search keyword' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Pagination page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Pagination page size' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Field to sort listings by' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'DESC', description: 'Sort direction' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
