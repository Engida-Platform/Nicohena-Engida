import { IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OtpChannel {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export class SendOtpDto {
  @ApiProperty({
    example: '+251911234567',
    description: 'Target phone number or email address',
  })
  @IsNotEmpty({ message: 'Target email or phone is required' })
  @IsString()
  target: string;

  @ApiProperty({
    enum: OtpChannel,
    example: OtpChannel.PHONE,
    description: 'OTP delivery channel',
  })
  @IsNotEmpty({ message: 'Channel is required (EMAIL or PHONE)' })
  @IsEnum(OtpChannel, { message: 'Channel must be either EMAIL or PHONE' })
  channel: OtpChannel;

  @ApiPropertyOptional({
    example: 'VERIFICATION',
    description: 'Purpose of the OTP (e.g. VERIFICATION, PASSWORD_RESET)',
  })
  @IsOptional()
  @IsString()
  purpose?: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: '+251911234567',
    description: 'Target phone number or email address',
  })
  @IsNotEmpty({ message: 'Target email or phone is required' })
  @IsString()
  target: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP verification code',
  })
  @IsNotEmpty({ message: 'Verification code is required' })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only numbers' })
  code: string;

  @ApiPropertyOptional({
    example: 'VERIFICATION',
    description: 'Purpose of the OTP',
  })
  @IsOptional()
  @IsString()
  purpose?: string;
}
