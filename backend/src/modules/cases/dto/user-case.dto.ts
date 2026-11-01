import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CaseCategory, CaseType } from '../../admin/cases/entities/case.entity';

export class CreateUserCaseDto {
  @IsNotEmpty({ message: 'Subject is required' })
  @IsString()
  @MinLength(5, { message: 'Subject must be at least 5 characters' })
  @MaxLength(255, { message: 'Subject cannot exceed 255 characters' })
  subject: string;

  @IsNotEmpty({ message: 'Category is required' })
  @IsEnum(CaseCategory, { message: 'Invalid case category' })
  category: CaseCategory;

  @IsOptional()
  @IsEnum(CaseType, { message: 'Invalid case type' })
  type?: CaseType = CaseType.SUPPORT;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid booking ID format' })
  bookingId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid property ID format' })
  propertyId?: string;
}

export class AddUserCaseMessageDto {
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @IsString()
  @MinLength(1, { message: 'Message must have at least 1 character' })
  @MaxLength(5000, { message: 'Message cannot exceed 5000 characters' })
  body: string;
}

export class DecideCaseCompensationDto {
  @IsNotEmpty({ message: 'Decision action is required' })
  @IsEnum(['ACCEPT', 'REJECT'], { message: 'Action must be either ACCEPT or REJECT' })
  action: 'ACCEPT' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

