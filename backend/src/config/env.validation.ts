import { plainToInstance, Transform } from 'class-transformer';
import { IsString, IsNumber, MinLength, IsOptional, IsBoolean, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsNumber()
  PORT?: number = 3000;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsOptional()
  @IsString()
  AI_SERVICE_URL?: string = 'http://localhost:8000';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value !== undefined ? value === 'true' || value === true || value === 1 || value === '1' : true))
  PAYMENTS_STRICT_VERIFICATION?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value !== undefined ? value === 'true' || value === true || value === 1 || value === '1' : true))
  SANDBOX_WEBHOOKS_ENABLED?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value !== undefined ? value === 'true' || value === true || value === 1 || value === '1' : false))
  HOST_VERIFICATION_REQUIRED?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value !== undefined ? value === 'true' || value === true || value === 1 || value === '1' : true))
  PRICING_QUOTE_V2?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value !== undefined ? value === 'true' || value === true || value === 1 || value === '1' : true))
  INSTANT_BOOK_ENABLED?: boolean;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return { ...config, ...validatedConfig };
}
