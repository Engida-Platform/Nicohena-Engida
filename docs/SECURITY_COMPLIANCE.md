# Engida Security & Compliance Guide

**Version**: 1.0.0  
**Last Updated**: January 2024

Complete security and compliance documentation for the Engida Ethiopian Property Marketplace platform covering authentication, authorization, data protection, GDPR compliance, and security best practices.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Security](#data-security)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [GDPR Compliance](#gdpr-compliance)
7. [Privacy Policy](#privacy-policy)
8. [Incident Response](#incident-response)
9. [Security Audit](#security-audit)
10. [Best Practices](#best-practices)

---

## Security Overview

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│  1. Network Security (HTTPS, Firewall, DDoS protection)    │
│  2. Application Security (Auth, Input validation, CSRF)    │
│  3. Data Security (Encryption, Hashing, Access control)    │
│  4. Infrastructure Security (Container, OS hardening)      │
│  5. Monitoring & Logging (Audit trails, Alerts)            │
└─────────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Defense in Depth** - Multiple layers of security
2. **Least Privilege** - Minimum necessary permissions
3. **Secure by Default** - Security built-in, not bolted-on
4. **Zero Trust** - Verify everything, trust nothing
5. **Transparency** - Clear communication about security

### Compliance Standards

- **GDPR** - General Data Protection Regulation
- **PCI DSS** - Payment Card Industry Data Security Standard (delegated to payment providers)
- **OWASP Top 10** - Industry security standards
- **ISO 27001** (Target) - Information security management

---

## Authentication & Authorization

### Authentication Methods

**1. Email & Password:**
```typescript
// Password hashing with bcrypt
const saltRounds = 12;
const passwordHash = await bcrypt.hash(password, saltRounds);

// Password verification
const isValid = await bcrypt.compare(password, user.passwordHash);
```

**Security Features:**
- Bcrypt with 12 salt rounds
- Minimum password requirements (enforced client & server-side)
- Rate limiting on login attempts
- Account lockout after failed attempts

**2. Google OAuth:**
```typescript
// OAuth flow with signed state
const state = signState({ nonce, redirectPath });
// Google verifies id_token
// Backend validates signature, audience, issuer, expiry
```

**Security Features:**
- State parameter with CSRF protection
- Nonce cookie binding
- Email verification required
- Verified Google accounts only
- Prevents account takeover

### JWT Token Security

**Access Token:**
```typescript
{
  sub: "user-uuid",       // User ID
  email: "user@example.com",
  role: "USER",
  iat: 1640995200,        // Issued at
  exp: 1640996100         // Expires (15 minutes)
}
```

**Configuration:**
```env
JWT_ACCESS_SECRET=<64-character-random-string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<different-64-character-string>
JWT_REFRESH_EXPIRATION=7d
```

**Security Features:**
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Refresh token rotation
- Token stored in HttpOnly cookies
- Automatic token refresh
- Revocation on logout

### Refresh Token Security

**Storage:**
```typescript
// Refresh token entity
{
  userId: string;
  tokenHash: string;        // Bcrypt hashed
  expiresAt: Date;
  isRevoked: boolean;
  replacedByToken: string;  // Token rotation tracking
  userAgent: string;        // Device tracking
  ipAddress: string;        // Location tracking
}
```

**Security Features:**
- Hashed before storage (bcrypt)
- One-time use (rotation)
- Revocation detection
- Device & IP tracking
- Automatic cleanup of expired tokens
- Revoke all sessions on suspicious activity

**Token Rotation:**
```typescript
// On refresh
1. Validate old refresh token
2. Generate new access + refresh tokens
3. Mark old refresh token as revoked
4. Return new tokens
5. If revoked token reused → revoke all user sessions
```

### Role-Based Access Control (RBAC)

**User Roles:**
```typescript
enum UserRole {
  USER = 'USER',    // Regular guest/host
  ADMIN = 'ADMIN'   // Administrator
}

enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BOOKING_MANAGER = 'BOOKING_MANAGER',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  PROPERTY_MODERATOR = 'PROPERTY_MODERATOR',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
}
```

**Permissions System:**
```typescript
enum Permission {
  // User management
  USERS_VIEW = 'USERS_VIEW',
  USERS_MANAGE = 'USERS_MANAGE',
  USERS_DELETE = 'USERS_DELETE',
  
  // Listing management
  LISTINGS_VIEW = 'LISTINGS_VIEW',
  LISTINGS_REVIEW = 'LISTINGS_REVIEW',
  LISTINGS_HIDE = 'LISTINGS_HIDE',
  LISTINGS_DELETE = 'LISTINGS_DELETE',
  
  // Booking management
  BOOKINGS_VIEW = 'BOOKINGS_VIEW',
  BOOKINGS_MANAGE = 'BOOKINGS_MANAGE',
  BOOKINGS_CANCEL = 'BOOKINGS_CANCEL',
  
  // Finance operations
  FINANCE_VIEW = 'FINANCE_VIEW',
  FINANCE_REFUNDS = 'FINANCE_REFUNDS',
  FINANCE_PAYOUTS = 'FINANCE_PAYOUTS',
  FINANCE_REPORTS = 'FINANCE_REPORTS',
  
  // Case management
  CASES_VIEW = 'CASES_VIEW',
  CASES_MANAGE = 'CASES_MANAGE',
  CASES_COMPENSATE = 'CASES_COMPENSATE',
  
  // Analytics & reports
  ANALYTICS_VIEW = 'ANALYTICS_VIEW',
  REPORTS_VIEW = 'REPORTS_VIEW',
  REPORTS_EXPORT = 'REPORTS_EXPORT',
  
  // System settings
  SETTINGS_VIEW = 'SETTINGS_VIEW',
  SETTINGS_MANAGE = 'SETTINGS_MANAGE',
}
```

**Permission Guards:**
```typescript
@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminBookingsController {
  
  @Get()
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async list() {
    // Only users with BOOKINGS_VIEW permission
  }
  
  @Post(':id/cancel')
  @RequirePermissions(Permission.BOOKINGS_CANCEL)
  async cancel(@Param('id') id: string) {
    // Only users with BOOKINGS_CANCEL permission
  }
}
```

### Session Management

**Session Security:**
- HttpOnly cookies for refresh tokens
- Secure flag in production (HTTPS only)
- SameSite=Strict for CSRF protection
- Session timeout after inactivity
- Multi-device session tracking

**Implementation:**
```typescript
// Set refresh token cookie
response.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/auth/refresh',
});
```

---

## Data Security

### Password Security

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Storage:**
```typescript
// Hashing with bcrypt (cost factor 12)
const saltRounds = 12;
const passwordHash = await bcrypt.hash(password, saltRounds);

// Never store plain text passwords
// Never log passwords
// Never send passwords in responses
```

**Password Reset:**
```typescript
// Generate secure reset token
const resetToken = crypto.randomBytes(32).toString('hex');
const resetTokenHash = await bcrypt.hash(resetToken, 10);

// Store hash, send token via email
// Token expires in 1 hour
// Single-use only
// Invalidate all sessions on password change
```

### Data Encryption

**Encryption at Rest:**
```typescript
// Sensitive fields encrypted in database
class User {
  @Column({ type: 'varchar', nullable: true })
  phone: string; // Encrypted
  
  @Column({ type: 'varchar', nullable: true })
  nationalId: string; // Encrypted for verification
}

// Payment details handled by payment providers
// No credit card data stored locally
```

**Encryption in Transit:**
- TLS 1.3 for all connections
- HTTPS enforced in production
- SSL certificates (Let's Encrypt)
- HSTS headers enabled

**Implementation:**
```typescript
// Helmet.js security headers
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

### Database Security

**Connection Security:**
```env
# Production database connection
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# SSL/TLS required in production
DATABASE_SSL=true
```

**Query Security:**
```typescript
// ✅ Good: Parameterized queries (TypeORM)
const properties = await this.propertyRepository.find({
  where: { city: userInput },
});

// ✅ Good: Query builder
const properties = await this.propertyRepository
  .createQueryBuilder('property')
  .where('property.city = :city', { city: userInput })
  .getMany();

// ❌ Bad: String concatenation (SQL injection risk)
const properties = await this.propertyRepository.query(
  `SELECT * FROM properties WHERE city = '${userInput}'`
);
```

**Access Control:**
```sql
-- Database user with limited permissions
CREATE USER engida_app WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO engida_app;

-- No DROP, ALTER, or TRUNCATE permissions
-- No access to other databases
```

### File Upload Security

**Image Upload:**
```typescript
// Validation
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxFileSize = 5 * 1024 * 1024; // 5MB

// File type validation
if (!allowedMimeTypes.includes(file.mimetype)) {
  throw new BadRequestException('Invalid file type');
}

// Size validation
if (file.size > maxFileSize) {
  throw new BadRequestException('File too large');
}

// Sanitize filename
const sanitizedFilename = file.originalname
  .replace(/[^a-zA-Z0-9.-]/g, '_')
  .toLowerCase();
```

**Cloudinary Security:**
```typescript
// Signed uploads
const signature = cloudinary.utils.api_sign_request(
  { timestamp, folder },
  cloudinaryApiSecret
);

// Image transformations
const url = cloudinary.url(publicId, {
  width: 800,
  height: 600,
  crop: 'limit',
  quality: 'auto',
  fetch_format: 'auto',
});
```

---

## API Security

### Input Validation

**DTO Validation:**
```typescript
import { IsString, IsEmail, MinLength, MaxLength, IsNumber, Min } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  title: string;

  @IsNumber()
  @Min(0)
  pricePerNight: number;

  @IsEmail()
  email: string;
}

// Automatic validation in controller
@Post()
async create(@Body() dto: CreatePropertyDto) {
  // DTO is validated before reaching here
}
```

**Sanitization:**
```typescript
// HTML sanitization
import * as sanitizeHtml from 'sanitize-html';

const clean = sanitizeHtml(userInput, {
  allowedTags: [],
  allowedAttributes: {},
});

// SQL injection prevention (TypeORM handles this)
// XSS prevention (React escapes by default)
```

### Rate Limiting

**Global Rate Limit:**
```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,      // 60 seconds
      limit: 100,   // 100 requests
    }),
  ],
})
export class AppModule {}
```

**Endpoint-Specific:**
```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  
  @Post('login')
  @Throttle(5, 60)  // 5 attempts per 60 seconds
  async login(@Body() dto: LoginDto) {
    // Login logic
  }
  
  @Post('register')
  @Throttle(3, 3600)  // 3 registrations per hour
  async register(@Body() dto: RegisterDto) {
    // Registration logic
  }
}
```

**IP-Based Rate Limiting:**
```typescript
// Custom rate limiter by IP
const loginAttempts = new Map<string, number>();

async function checkRateLimit(ip: string) {
  const attempts = loginAttempts.get(ip) || 0;
  
  if (attempts >= 5) {
    throw new TooManyRequestsException(
      'Too many login attempts. Try again in 15 minutes.'
    );
  }
  
  loginAttempts.set(ip, attempts + 1);
  
  // Reset after 15 minutes
  setTimeout(() => {
    loginAttempts.delete(ip);
  }, 15 * 60 * 1000);
}
```

### CORS Configuration

**Production CORS:**
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 3600,
});
```

**Development CORS:**
```typescript
app.enableCors({
  origin: true,  // Allow all in development
  credentials: true,
});
```

### CSRF Protection

**SameSite Cookies:**
```typescript
// Refresh token cookie with SameSite
response.cookie('refreshToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',  // CSRF protection
  path: '/auth/refresh',
});
```

**CSRF Tokens (for state-changing operations):**
```typescript
// Generate CSRF token
const csrfToken = crypto.randomBytes(32).toString('hex');

// Store in session
session.csrfToken = csrfToken;

// Validate on submission
if (request.body.csrfToken !== session.csrfToken) {
  throw new ForbiddenException('Invalid CSRF token');
}
```

### API Key Security

**Environment Variables:**
```env
# Never commit to version control
CLOUDINARY_API_SECRET=secret123
CHAPA_SECRET_KEY=sk_test_xxx
JWT_ACCESS_SECRET=xxx
JWT_REFRESH_SECRET=yyy
```

**Key Rotation:**
```bash
# Rotate secrets regularly (every 90 days)
# Generate new JWT secrets
openssl rand -base64 64

# Update environment variables
# Deploy with zero downtime
```

---

## Infrastructure Security

### Docker Security

**Non-Root User:**
```dockerfile
# Production Dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership
CHOWN nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Run application
CMD ["node", "dist/main"]
```

**Image Security:**
```bash
# Scan for vulnerabilities
docker scan engida-backend:latest

# Use official base images
FROM node:20-alpine  # Alpine for smaller attack surface

# Keep images updated
docker pull node:20-alpine
```

### Environment Variables

**Secure Storage:**
```bash
# ❌ Bad: Committed to repo
DATABASE_URL=postgresql://user:pass@localhost/db

# ✅ Good: Environment-specific
DATABASE_URL=${DATABASE_URL}

# ✅ Good: Secrets manager
DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id db-url)
```

**Access Control:**
```bash
# File permissions
chmod 600 .env
chown www-data:www-data .env

# Never log environment variables
# Never expose in error messages
```

### Firewall Configuration

**UFW (Ubuntu):**
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Deny all other incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw enable
```

**Security Groups (AWS):**
```yaml
SecurityGroup:
  Ingress:
    - Port: 80
      Source: 0.0.0.0/0
    - Port: 443
      Source: 0.0.0.0/0
    - Port: 22
      Source: AdminIP/32  # Restrict SSH
```

### SSL/TLS Configuration

**Let's Encrypt:**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d engida.com -d www.engida.com

# Auto-renewal
sudo certbot renew --dry-run
```

**Nginx SSL Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name engida.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/engida.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/engida.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name engida.com;
    return 301 https://$server_name$request_uri;
}
```

---

## GDPR Compliance

### Data Protection Principles

1. **Lawfulness, Fairness, Transparency**
   - Clear privacy policy
   - Explicit consent
   - Transparent data usage

2. **Purpose Limitation**
   - Data collected for specific purposes
   - No secondary use without consent

3. **Data Minimization**
   - Collect only necessary data
   - Delete when no longer needed

4. **Accuracy**
   - Keep data up to date
   - Allow users to correct data

5. **Storage Limitation**
   - Retain only as long as necessary
   - Automatic deletion policies

6. **Integrity & Confidentiality**
   - Encryption
   - Access controls
   - Security measures

7. **Accountability**
   - Document compliance
   - Regular audits
   - DPO appointed

### User Rights

**1. Right to Access:**
```typescript
@Get('data-export')
@UseGuards(JwtAuthGuard)
async exportUserData(@GetUser() user: User) {
  return {
    personalData: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
    },
    bookings: await this.bookingsService.findByUser(user.id),
    properties: await this.propertiesService.findByHost(user.id),
    reviews: await this.reviewsService.findByUser(user.id),
  };
}
```

**2. Right to Rectification:**
```typescript
@Patch('profile')
@UseGuards(JwtAuthGuard)
async updateProfile(
  @GetUser() user: User,
  @Body() dto: UpdateProfileDto
) {
  return this.usersService.updateProfile(user.id, dto);
}
```

**3. Right to Erasure (Right to be Forgotten):**
```typescript
@Delete('account')
@UseGuards(JwtAuthGuard)
async deleteAccount(@GetUser() user: User) {
  // Check for active bookings
  const activeBookings = await this.bookingsService.findActive(user.id);
  
  if (activeBookings.length > 0) {
    throw new BadRequestException(
      'Cannot delete account with active bookings'
    );
  }
  
  // Anonymize data instead of deleting (for financial records)
  await this.usersService.anonymizeUser(user.id);
  
  // Delete personal data
  await this.usersService.deletePersonalData(user.id);
  
  return { message: 'Account deleted successfully' };
}
```

**4. Right to Data Portability:**
```typescript
@Get('data-export/json')
@UseGuards(JwtAuthGuard)
async exportDataJson(@GetUser() user: User, @Res() response: Response) {
  const data = await this.usersService.exportAllUserData(user.id);
  
  response.setHeader('Content-Type', 'application/json');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="engida-data-${user.id}.json"`
  );
  
  return response.send(JSON.stringify(data, null, 2));
}
```

**5. Right to Object:**
```typescript
@Patch('marketing-preferences')
@UseGuards(JwtAuthGuard)
async updateMarketingPreferences(
  @GetUser() user: User,
  @Body() dto: MarketingPreferencesDto
) {
  return this.usersService.updatePreferences(user.id, {
    marketingEmails: dto.marketingEmails,
    analyticsTracking: dto.analyticsTracking,
  });
}
```

### Consent Management

**Cookie Consent:**
```typescript
interface CookieConsent {
  necessary: boolean;     // Always true (required)
  analytics: boolean;     // Google Analytics
  marketing: boolean;     // Marketing cookies
  preferences: boolean;   // User preferences
}

// Store consent
localStorage.setItem('cookieConsent', JSON.stringify(consent));

// Check consent before loading third-party scripts
if (consent.analytics) {
  loadGoogleAnalytics();
}
```

**Data Processing Consent:**
```typescript
@Post('register')
async register(@Body() dto: RegisterDto) {
  if (!dto.termsAccepted) {
    throw new BadRequestException('You must accept terms and conditions');
  }
  
  if (!dto.privacyAccepted) {
    throw new BadRequestException('You must accept privacy policy');
  }
  
  // Create user with consent timestamp
  const user = await this.usersService.create({
    ...dto,
    termsAcceptedAt: new Date(),
    privacyAcceptedAt: new Date(),
  });
  
  return user;
}
```

### Data Retention

**Retention Periods:**
```typescript
// User accounts: Until deletion request
// Bookings: 7 years (tax requirements)
// Payment records: 7 years (financial regulations)
// Logs: 90 days
// Audit trails: 5 years

// Automatic cleanup job
@Cron('0 0 * * *')  // Daily at midnight
async cleanupOldData() {
  // Delete old logs
  await this.logsService.deleteOlderThan(90); // days
  
  // Anonymize old bookings
  await this.bookingsService.anonymizeOlderThan(7); // years
  
  // Delete expired tokens
  await this.authService.deleteExpiredTokens();
}
```

---

## Privacy Policy

### Privacy Policy Checklist

- [ ] What data we collect
- [ ] Why we collect it
- [ ] How we use it
- [ ] Who we share it with
- [ ] How long we keep it
- [ ] User rights (GDPR)
- [ ] Cookie policy
- [ ] Contact information
- [ ] Last updated date

### Data Collection

**Personal Data:**
- Name
- Email address
- Phone number
- Profile picture (optional)

**Property Data:**
- Property details
- Location
- Images
- Pricing

**Usage Data:**
- IP address
- Browser type
- Pages visited
- Time spent

**Cookies:**
- Authentication cookies (necessary)
- Analytics cookies (with consent)
- Preference cookies (with consent)

---

## Incident Response

### Incident Response Plan

**1. Detection:**
- Monitor logs for suspicious activity
- Set up alerts for security events
- User reports

**2. Assessment:**
- Determine scope of incident
- Identify affected systems
- Assess data exposure

**3. Containment:**
- Isolate affected systems
- Revoke compromised credentials
- Block malicious IPs

**4. Eradication:**
- Remove malware/backdoors
- Patch vulnerabilities
- Update security measures

**5. Recovery:**
- Restore from backups
- Verify system integrity
- Monitor for re-infection

**6. Lessons Learned:**
- Document incident
- Update procedures
- Implement preventive measures

### Security Incident Types

**1. Data Breach:**
```typescript
async handleDataBreach() {
  // 1. Contain breach
  await this.revokeAllSessions();
  
  // 2. Assess impact
  const affectedUsers = await this.identifyAffectedUsers();
  
  // 3. Notify users (within 72 hours - GDPR)
  await this.notifyAffectedUsers(affectedUsers);
  
  // 4. Report to authorities
  await this.reportToDataProtectionAuthority();
  
  // 5. Implement fixes
  await this.patchVulnerability();
}
```

**2. Account Compromise:**
```typescript
async handleAccountCompromise(userId: string) {
  // 1. Revoke all sessions
  await this.authService.revokeAllUserSessions(userId);
  
  // 2. Force password reset
  await this.authService.requirePasswordReset(userId);
  
  // 3. Notify user
  await this.notificationService.sendSecurityAlert(userId);
  
  // 4. Review recent activity
  const suspiciousActivity = await this.auditActivity(userId);
  
  // 5. Revert unauthorized changes
  await this.revertSuspiciousChanges(suspiciousActivity);
}
```

### Contact Information

**Security Team:**
- Email: security@engida.com
- PGP Key: Available on website
- Response Time: 24 hours

**Data Protection Officer:**
- Email: dpo@engida.com
- Phone: +251-xxx-xxx-xxx

---

## Security Audit

### Regular Security Checks

**Daily:**
- [ ] Monitor error logs
- [ ] Check failed login attempts
- [ ] Review suspicious activity

**Weekly:**
- [ ] Review user reports
- [ ] Check for outdated dependencies
- [ ] Verify backup integrity

**Monthly:**
- [ ] Security patch updates
- [ ] Access control review
- [ ] Penetration testing (automated)

**Quarterly:**
- [ ] Full security audit
- [ ] Dependency audit
- [ ] GDPR compliance review
- [ ] Incident response drill

**Annually:**
- [ ] External security audit
- [ ] Penetration testing (manual)
- [ ] Policy review
- [ ] Staff security training

### Security Checklist

**Authentication:**
- [x] Passwords hashed with bcrypt
- [x] JWT tokens with short expiration
- [x] Refresh token rotation
- [x] OAuth with CSRF protection
- [x] Rate limiting on auth endpoints
- [x] Session management

**Authorization:**
- [x] RBAC implemented
- [x] Permission-based access control
- [x] Least privilege principle
- [x] Admin role separation

**Data Security:**
- [x] Encryption at rest
- [x] Encryption in transit (TLS)
- [x] Input validation
- [x] SQL injection prevention
- [x] XSS prevention
- [x] CSRF protection

**Infrastructure:**
- [x] Firewall configured
- [x] SSL/TLS enabled
- [x] Security headers
- [x] CORS configured
- [x] Non-root Docker user
- [x] Environment variable security

**Monitoring:**
- [x] Audit logging
- [x] Error tracking
- [x] Security alerts
- [x] Failed login monitoring

---

## Best Practices

### Development

**1. Never commit secrets:**
```bash
# Use .gitignore
.env
.env.*
secrets/

# Scan for leaked secrets
git-secrets --scan
```

**2. Use environment variables:**
```typescript
// ✅ Good
const apiKey = process.env.API_KEY;

// ❌ Bad
const apiKey = 'hardcoded_key_123';
```

**3. Validate all input:**
```typescript
// ✅ Good
@Post()
async create(@Body() dto: CreateDto) {
  // DTO validated automatically
}

// ❌ Bad
@Post()
async create(@Body() data: any) {
  // No validation
}
```

**4. Use parameterized queries:**
```typescript
// ✅ Good
.where('property.city = :city', { city: userInput })

// ❌ Bad
.where(`property.city = '${userInput}'`)
```

**5. Handle errors securely:**
```typescript
// ✅ Good
catch (error) {
  this.logger.error('Error details', error);
  throw new InternalServerErrorException('An error occurred');
}

// ❌ Bad
catch (error) {
  throw new InternalServerErrorException(error.message);
  // Exposes internal details
}
```

### Production

**1. Use HTTPS:**
```nginx
# Redirect all HTTP to HTTPS
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

**2. Set security headers:**
```typescript
app.use(helmet({
  contentSecurityPolicy: true,
  hsts: true,
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' },
}));
```

**3. Enable rate limiting:**
```typescript
@UseGuards(ThrottlerGuard)
```

**4. Monitor logs:**
```bash
# Set up log monitoring
pm2 logs
journalctl -u engida-backend -f
```

**5. Regular updates:**
```bash
# Update dependencies
npm audit
npm update

# Update system
sudo apt update && sudo apt upgrade
```

---

## Security Resources

### Tools

- **OWASP ZAP** - Security testing
- **npm audit** - Dependency scanning
- **Snyk** - Vulnerability scanning
- **SonarQube** - Code quality & security
- **Burp Suite** - Web security testing

### Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GDPR Official Text](https://gdpr-info.eu/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

### Training

- OWASP Security Training
- Secure Coding Practices
- GDPR Compliance Training
- Incident Response Training

---

## Conclusion

Security is an ongoing process, not a one-time implementation. Regular audits, updates, and monitoring are essential to maintain a secure platform. All team members should be trained in security best practices and incident response procedures.

**Key Takeaways:**
- Defense in depth with multiple security layers
- Regular security audits and updates
- GDPR compliance for user data protection
- Incident response plan in place
- Continuous monitoring and improvement

---

**Document Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintained By**: Engida Security Team  
**Next Review**: April 2024
