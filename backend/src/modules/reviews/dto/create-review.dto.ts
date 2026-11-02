import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Rating score from 1 (lowest) to 5 (highest)',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({
    example: 'Wonderful stay! The host was super responsive and the location in Bole was ideal.',
    description: 'Detailed written review of property and host experience',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
