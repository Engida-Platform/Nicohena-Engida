import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FaqCategory } from '../entities/faq-item.entity';

export class CreateFaqDto {
  @IsEnum(FaqCategory)
  category: FaqCategory;

  @IsString()
  @MaxLength(300)
  question: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  questionAmharic?: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsString()
  answerAmharic?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateFaqDto {
  @IsOptional()
  @IsEnum(FaqCategory)
  category?: FaqCategory;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  question?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  questionAmharic?: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsString()
  answerAmharic?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateContentBlockDto {
  @IsString()
  @MaxLength(100)
  slug: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaDescription?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateContentBlockDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaDescription?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
