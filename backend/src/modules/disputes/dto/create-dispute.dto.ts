import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export enum DisputeCategory {
  ACCESS_ISSUE = 'ACCESS_ISSUE',
  LISTING_MISREPRESENTATION = 'LISTING_MISREPRESENTATION',
  SAFETY_CLEANLINESS = 'SAFETY_CLEANLINESS',
  DAMAGE_CLAIM = 'DAMAGE_CLAIM',
  PAYMENT_DISPUTE = 'PAYMENT_DISPUTE',
  OTHER = 'OTHER',
}

export class CreateDisputeDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @IsEnum(DisputeCategory)
  category: DisputeCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  requestedCompensationETB?: number;
}

export class AddDisputeMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  message: string;
}
