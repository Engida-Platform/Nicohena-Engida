import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Hot reload active: Public domain BACKEND_URL configured
async function bootstrap() {
  const isDebug = process.env.DEBUG === 'true' || process.env.VERBOSE_LOGS === 'true';

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: isDebug ? ['log', 'error', 'warn', 'debug', 'verbose'] : ['error', 'warn'],
  });

  const configService = app.get(ConfigService);

  // Security Headers (relaxed CSP in development or configured for Swagger UI)
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? {
              directives: {
                defaultSrc: [`'self'`],
                styleSrc: [`'self'`, `'unsafe-inline'`],
                imgSrc: [`'self'`, 'data:', 'https:', 'validator.swagger.io'],
                scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
              },
            }
          : false,
    }),
  );

  // Cookie Parser
  app.use(cookieParser());

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Engida API')
    .setDescription(
      'Complete REST API reference for the Engida property marketplace platform in Ethiopia.\n\n' +
        'Authentication: JWT Bearer Token for protected endpoints, HttpOnly cookie for refresh tokens.\n' +
        'Supports Guest bookings, Host management, Telebirr/CBE Birr/Chapa payments, AI assistance, and Admin operations.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token (Bearer <token>)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth('refreshToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refreshToken',
      description: 'HttpOnly refresh token cookie',
    })
    .addTag('Authentication', 'User registration, login, logout, Google OAuth, and OTP verification')
    .addTag('Properties', 'Public property search, detailed listings, and room management')
    .addTag('Amenities', 'Property amenities, categories, and tags')
    .addTag('Host Management', 'Host onboarding, property listing management, and calendar')
    .addTag('Bookings', 'Guest reservations, availability checks, and booking lifecycle')
    .addTag('Payments', 'Telebirr, CBE Birr, and Chapa payments, verification, and escrow')
    .addTag('Reviews', 'Guest property reviews and ratings')
    .addTag('AI Services', 'AI search, dynamic pricing recommendations, and guest concierge')
    .addTag('Catalog', 'Public and admin property categories, destinations, and amenities')
    .addTag('Content', 'CMS content blocks, banners, and FAQs')
    .addTag('Messages & Notifications', 'In-app guest-host messaging and system notifications')
    .addTag('Cases & Reports', 'Dispute cases and violation reporting')
    .addTag('Admin - Dashboard & Analytics', 'Executive overview, platform KPIs, and business intelligence')
    .addTag('Admin - Listings & Moderation', 'Listing approval, rejection, and compliance moderation')
    .addTag('Admin - Bookings', 'Booking administration, cancellations, and status overrides')
    .addTag('Admin - Finance & Payouts', 'Escrow ledger, host payouts, and payment operations')
    .addTag('Admin - Users & Roles', 'User directory, RBAC roles, and staff management')
    .addTag('Admin - Cases & Disputes', 'Dispute resolution, case triage, and evidence inspection')
    .addTag('Admin - Reviews', 'Review moderation and dispute management')
    .addTag('Admin - Settings', 'Platform runtime configuration, feature flags, and localization')
    .addTag('Admin - System & Audit', 'Audit logs, system health, and database utilities')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
    },
    customSiteTitle: 'Engida API Documentation',
  });

  // CORS Configuration
  // Only explicitly allowed origins may send credentialed requests.
  const allowedOrigins = configService
    .get<string>('FRONTEND_URL', 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isLocalOrigin = (origin: string) =>
    /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

  // Allow local private network IP addresses (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  const isPrivateNetworkOrigin = (origin: string) =>
    /^http:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
      origin,
    );

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // Allow localhost on any port
      if (isLocalOrigin(origin)) {
        return callback(null, true);
      }
      // Allow local private network IP addresses (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
      if (isPrivateNetworkOrigin(origin)) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Reject unknown origins instead of allowing credentialed cross-origin calls.
      return callback(
        new ForbiddenException(`Origin ${origin} is not allowed by CORS`),
        false,
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Range', 'x-refresh-token', 'X-Refresh-Token'],
    exposedHeaders: ['Content-Range', 'X-Total-Count', 'Content-Disposition'],
  });

  const port = Number(configService.get('PORT')) || 3000;
  await app.listen(port);

  const env = configService.get<string>('NODE_ENV', 'development');

  console.log(`
\x1b[32m✔ Engida Backend is running\x1b[0m
  \x1b[36m➜\x1b[0m \x1b[1mLocal:\x1b[0m        http://localhost:${port}
  \x1b[36m➜\x1b[0m \x1b[1mHealth:\x1b[0m       http://localhost:${port}/health
  \x1b[36m➜\x1b[0m \x1b[1mSwagger Docs:\x1b[0m http://localhost:${port}/api/docs
  \x1b[36m➜\x1b[0m \x1b[1mEnvironment:\x1b[0m  ${env}
`);
}
bootstrap();

