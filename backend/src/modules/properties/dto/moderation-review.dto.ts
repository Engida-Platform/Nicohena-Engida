import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReviewStatus,
  ReviewSubmissionType,
} from '../entities/listing-review.entity';

export class SubmitReviewDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectReviewDto {
  @IsString()
  @IsNotEmpty({ message: 'A meaningful rejection explanation is required.' })
  @MinLength(5, { message: 'Rejection explanation must be at least 5 characters.' })
  @MaxLength(500, { message: 'Rejection explanation cannot exceed 500 characters.' })
  rejectionReason: string;
}

export class HideListingDto {
  @IsString()
  @IsNotEmpty({ message: 'A reason is required to temporarily hide a listing.' })
  @MinLength(5, { message: 'A reason of at least 5 characters is required to temporarily hide a listing.' })
  @MaxLength(500, { message: 'A reason cannot exceed 500 characters.' })
  reason: string;
}

export class RestoreListingDto {
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters.' })
  reason?: string;
}

export class QueryReviewsDto {
  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;

  @IsEnum(ReviewSubmissionType)
  @IsOptional()
  submissionType?: ReviewSubmissionType;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
