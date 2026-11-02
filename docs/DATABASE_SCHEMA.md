# Engida Database Schema Documentation

**Database**: PostgreSQL 14+  
**ORM**: TypeORM 0.3.x  
**Migration Strategy**: Code-first with migrations

---

## Table of Contents

1. [Overview](#overview)
2. [Core Entities](#core-entities)
3. [Property Management](#property-management)
4. [Booking System](#booking-system)
5. [Finance & Payments](#finance--payments)
6. [Reviews & Ratings](#reviews--ratings)
7. [Admin & Moderation](#admin--moderation)
8. [Content & Catalog](#content--catalog)
9. [Indexes & Performance](#indexes--performance)
10. [Relationships](#relationships)
11. [Migration History](#migration-history)

---

## Overview

### Database Design Principles

1. **Normalization**: 3NF with strategic denormalization for performance
2. **UUID Primary Keys**: For security and distributed systems
3. **Soft Deletes**: Where audit trails are required
4. **JSONB**: For flexible metadata storage
5. **Enum Types**: For type-safe status fields
6. **Timestamps**: All entities have `created_at` and `updated_at`
7. **Indexes**: Strategic indexes on frequently queried columns

### Naming Conventions

- **Tables**: `snake_case`, plural (e.g., `users`, `properties`)
- **Columns**: `snake_case` (e.g., `created_at`, `host_id`)
- **Foreign Keys**: `{entity}_id` (e.g., `user_id`, `property_id`)
- **Junction Tables**: `{entity1}_{entity2}` (e.g., `property_amenities`)

---

## Core Entities

### users

Central user entity for authentication and user management.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  auth_provider VARCHAR(20) DEFAULT 'LOCAL',
  provider_id VARCHAR(255),
  role VARCHAR(20) DEFAULT 'USER',
  admin_role VARCHAR(50),
  phone VARCHAR(50),
  title VARCHAR(150),
  bio TEXT,
  avatar VARCHAR(500),
  office_location VARCHAR(150),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_id);
```

**Columns:**
- `id` - UUID primary key
- `name` - User's full name
- `email` - Unique email address (lowercase)
- `password_hash` - Bcrypt hashed password (nullable for OAuth users)
- `auth_provider` - Authentication source: `LOCAL`, `GOOGLE`
- `provider_id` - OAuth provider's user ID
- `role` - User role: `USER`, `ADMIN`
- `admin_role` - Admin permissions: `SUPER_ADMIN`, `BOOKING_MANAGER`, `SUPPORT_AGENT`, `PROPERTY_MODERATOR`, `FINANCE_MANAGER`
- `phone` - Contact phone number
- `is_active` - Account status flag

**Relationships:**
- One-to-Many: `refresh_tokens`
- One-to-One: `host_profile`
- One-to-Many: `properties` (as host)
- One-to-Many: `bookings` (as guest)
- One-to-Many: `reviews` (as reviewer)

---

### refresh_tokens

JWT refresh token storage for authentication.

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(500) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

**Security Features:**
- Token rotation on use
- Expiration tracking
- IP and user agent logging
- Revocation support

---

### host_profiles

Host-specific profile information and payout settings.

```sql
CREATE TABLE host_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(255),
  bio TEXT,
  phone VARCHAR(50),
  verification_status VARCHAR(20) DEFAULT 'UNVERIFIED',
  
  -- Payout Configuration
  payout_provider VARCHAR(50),
  payout_account_name VARCHAR(255),
  payout_account_number VARCHAR(255),
  payout_phone VARCHAR(50),
  payout_bank_branch VARCHAR(255),
  payout_swift_bic VARCHAR(50),
  payout_email VARCHAR(255),
  payout_currency VARCHAR(10) DEFAULT 'ETB',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_host_profiles_user_id ON host_profiles(user_id);
```

**Verification Status:**
- `UNVERIFIED` - Host not yet verified
- `PENDING` - Verification request submitted
- `VERIFIED` - Identity verified by admin
- `REJECTED` - Verification rejected

**Payout Providers:**
- `TELEBIRR` - Ethiopian mobile money
- `CBE`, `AWASH`, `DASHEN`, `ABYSSINIA` - Ethiopian banks
- `CHAPA` - Ethiopian payment gateway
- `PAYPAL`, `WISE` - International providers
- `INTERNATIONAL_SWIFT` - Bank transfer

---

## Property Management

### properties

Core property/listing entity.

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  property_type VARCHAR(50) DEFAULT 'HOUSE',
  listing_type VARCHAR(20) DEFAULT 'RENTAL',
  status VARCHAR(20) DEFAULT 'PUBLISHED',
  
  -- Location
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) DEFAULT 'Ethiopia',
  region VARCHAR(100),
  zone VARCHAR(100),
  sub_city VARCHAR(100),
  woreda VARCHAR(100),
  neighborhood VARCHAR(150),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Pricing
  price_per_night DECIMAL(10, 2) DEFAULT 0,
  cleaning_fee DECIMAL(12, 2) DEFAULT 0,
  sale_price DECIMAL(14, 2),
  instant_book BOOLEAN DEFAULT false,
  
  -- Capacity
  max_guests INT DEFAULT 1,
  bedrooms INT DEFAULT 1,
  bathrooms INT DEFAULT 1,
  area_sqm INT DEFAULT 0,
  parking_spaces INT DEFAULT 0,
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  
  -- Media
  cover_image VARCHAR(500),
  images TEXT[] DEFAULT '{}',
  
  -- Admin Moderation
  admin_hidden BOOLEAN DEFAULT false,
  admin_hidden_reason TEXT,
  admin_hidden_at TIMESTAMP WITH TIME ZONE,
  admin_hidden_by_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_properties_host_id ON properties(host_id);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_listing_type ON properties(listing_type);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_sub_city ON properties(sub_city);
CREATE INDEX idx_properties_admin_hidden ON properties(admin_hidden);
CREATE INDEX idx_properties_location ON properties USING GIST (
  ll_to_earth(latitude::float, longitude::float)
);
```

**Property Types:**
- `HOUSE`, `APARTMENT`, `VILLA`, `BEDROOM`, `STUDIO`

**Listing Types:**
- `RENTAL` - Short-term rental
- `SALE` - Property for sale

**Status:**
- `DRAFT` - Being created by host
- `PUBLISHED` - Live and bookable
- `PAUSED` - Temporarily unavailable
- `SOLD` - Marked as sold
- `ARCHIVED` - Removed from listings

---

### rooms

Individual rooms within a property.

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  room_type VARCHAR(50) DEFAULT 'BEDROOM',
  bed_type VARCHAR(50),
  bed_count INT DEFAULT 1,
  private_bathroom BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rooms_property_id ON rooms(property_id);
```

**Room Types:**
- `BEDROOM`, `LIVING_ROOM`, `KITCHEN`, `BATHROOM`, `COMMON_SPACE`

**Bed Types:**
- `SINGLE`, `TWIN`, `DOUBLE`, `QUEEN`, `KING`, `BUNK`, `SOFA_BED`

---

### amenities

Available amenities/features.

```sql
CREATE TABLE amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) DEFAULT 'BASIC',
  icon VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_amenities_category ON amenities(category);
CREATE INDEX idx_amenities_active ON amenities(is_active);
```

**Categories:**
- `BASIC`, `SAFETY`, `ENTERTAINMENT`, `OUTDOOR`, `ACCESSIBILITY`, `KITCHEN`, `PARKING`

---

### property_amenities

Many-to-many junction table.

```sql
CREATE TABLE property_amenities (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

CREATE INDEX idx_property_amenities_property ON property_amenities(property_id);
CREATE INDEX idx_property_amenities_amenity ON property_amenities(amenity_id);
```

---

### availability_blocks

Blocked dates when property is unavailable.

```sql
CREATE TABLE availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_availability_blocks_property ON availability_blocks(property_id);
CREATE INDEX idx_availability_blocks_dates ON availability_blocks(start_date, end_date);
```

---

### listing_reviews

Moderation workflow for listing submissions.

```sql
CREATE TABLE listing_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  submission_type VARCHAR(20) NOT NULL, -- INITIAL_PUBLISH, EDIT_PROPOSAL
  status VARCHAR(20) DEFAULT 'PENDING',
  proposed_changes JSONB,
  notes TEXT,
  rejection_reason TEXT,
  
  reviewed_by_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_listing_reviews_property ON listing_reviews(property_id);
CREATE INDEX idx_listing_reviews_status ON listing_reviews(status);
```

**Status:**
- `PENDING` - Awaiting review
- `APPROVED` - Changes approved
- `REJECTED` - Changes rejected
- `WITHDRAWN` - Host withdrew submission

---

## Booking System

### bookings

Booking/reservation records.

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(32) UNIQUE NOT NULL,
  
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guest_count INT DEFAULT 1,
  
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  
  cancellation_policy VARCHAR(20) DEFAULT 'MODERATE',
  cancelled_by_id UUID,
  cancelled_by_type VARCHAR(20),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  -- Payment Info
  payment_method VARCHAR(50) DEFAULT 'CASH_ON_ARRIVAL',
  payment_status VARCHAR(50) DEFAULT 'PENDING',
  payment_reference VARCHAR(100),
  payment_currency VARCHAR(10) DEFAULT 'ETB',
  paid_at TIMESTAMP WITH TIME ZONE,
  is_legacy_cash BOOLEAN DEFAULT false,
  payment_reconciliation_status VARCHAR(32) DEFAULT 'UNVERIFIED',
  
  -- Pricing Details
  coupon_code VARCHAR(50),
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  price_breakdown JSONB,
  quote_version VARCHAR(20),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_reference ON bookings(reference);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
```

**Booking Status:**
- `PENDING` - Awaiting confirmation
- `CONFIRMED` - Host confirmed
- `CANCELLED` - Booking cancelled
- `COMPLETED` - Stay completed

**Payment Status:**
- `PENDING` - Payment not yet received
- `PAID` - Payment completed
- `ON_ARRIVAL` - Pay on arrival
- `REFUNDED` - Payment refunded
- `FAILED` - Payment failed

**Cancellation Policy:**
- `FLEXIBLE`, `MODERATE`, `STRICT`, `NON_REFUNDABLE`

---

### booking_status_history

Audit trail of booking status changes.

```sql
CREATE TABLE booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by_id UUID REFERENCES users(id),
  changed_by_type VARCHAR(20), -- GUEST, HOST, ADMIN, SYSTEM
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_booking_status_history_booking ON booking_status_history(booking_id);
CREATE INDEX idx_booking_status_history_created ON booking_status_history(created_at);
```

---

### cancellation_requests

Cancellation requests requiring approval.

```sql
CREATE TABLE cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  requested_by_id UUID NOT NULL REFERENCES users(id),
  requester_type VARCHAR(20) NOT NULL, -- GUEST, HOST
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  
  -- Refund Calculation
  full_amount DECIMAL(10, 2),
  refund_amount DECIMAL(10, 2),
  penalty_amount DECIMAL(10, 2),
  policy_applied VARCHAR(20),
  
  -- Admin Review
  reviewed_by_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  override_policy BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cancellation_requests_booking ON cancellation_requests(booking_id);
CREATE INDEX idx_cancellation_requests_status ON cancellation_requests(status);
```

**Status:**
- `PENDING` - Awaiting approval
- `APPROVED` - Approved and processed
- `REJECTED` - Request rejected
- `CANCELLED` - Request cancelled by requester

---

## Finance & Payments

### payments

Payment transaction records.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  
  amount_minor BIGINT NOT NULL, -- Amount in minor units (cents)
  currency VARCHAR(10) DEFAULT 'ETB',
  
  provider VARCHAR(50) NOT NULL, -- CHAPA, TELEBIRR, etc.
  provider_reference VARCHAR(255),
  provider_status VARCHAR(50),
  
  status VARCHAR(20) DEFAULT 'PENDING',
  payment_method VARCHAR(50),
  
  payer_email VARCHAR(255),
  payer_phone VARCHAR(50),
  payer_name VARCHAR(255),
  
  metadata JSONB,
  
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_provider_ref ON payments(provider, provider_reference);
CREATE INDEX idx_payments_status ON payments(status);
```

**Payment Status:**
- `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `REFUNDED`, `CANCELLED`

---

### provider_events

Webhook events from payment providers.

```sql
CREATE TABLE provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255),
  
  payment_id UUID REFERENCES payments(id),
  
  payload JSONB NOT NULL,
  signature VARCHAR(500),
  verified BOOLEAN DEFAULT false,
  
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_provider_events_provider ON provider_events(provider);
CREATE INDEX idx_provider_events_payment ON provider_events(payment_id);
CREATE INDEX idx_provider_events_processed ON provider_events(processed);
```

---

### refunds

Refund records.

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  booking_id UUID REFERENCES bookings(id),
  
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'ETB',
  
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PROPOSED',
  
  provider VARCHAR(50),
  provider_reference VARCHAR(255),
  provider_status VARCHAR(50),
  
  proposed_by_id UUID REFERENCES users(id),
  approved_by_id UUID REFERENCES users(id),
  
  proposed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_booking ON refunds(booking_id);
CREATE INDEX idx_refunds_status ON refunds(status);
```

**Refund Status:**
- `PROPOSED`, `APPROVED`, `REJECTED`, `PENDING`, `COMPLETED`, `FAILED`

---

### payout_accounts

Host payout account configurations.

```sql
CREATE TABLE payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  account_type VARCHAR(50) NOT NULL, -- BANK_ACCOUNT, MOBILE_MONEY
  provider VARCHAR(50) NOT NULL,
  
  account_name VARCHAR(255) NOT NULL,
  account_number_encrypted VARCHAR(500) NOT NULL,
  account_number_last4 VARCHAR(10),
  
  bank_name VARCHAR(255),
  bank_code VARCHAR(50),
  swift_code VARCHAR(50),
  branch VARCHAR(255),
  
  phone VARCHAR(50),
  email VARCHAR(255),
  
  currency VARCHAR(10) DEFAULT 'ETB',
  
  is_verified BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  verified_by_id UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payout_accounts_host ON payout_accounts(host_id);
CREATE INDEX idx_payout_accounts_verified ON payout_accounts(is_verified);
```

---

### payouts

Payout disbursement records.

```sql
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES users(id),
  payout_account_id UUID REFERENCES payout_accounts(id),
  
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'ETB',
  
  status VARCHAR(20) DEFAULT 'DRAFTED',
  
  provider VARCHAR(50),
  provider_reference VARCHAR(255),
  provider_status VARCHAR(50),
  
  period_start DATE,
  period_end DATE,
  
  drafted_by_id UUID REFERENCES users(id),
  approved_by_id UUID REFERENCES users(id),
  rejected_by_id UUID REFERENCES users(id),
  
  drafted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  
  rejection_reason TEXT,
  approval_notes TEXT,
  
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payouts_host ON payouts(host_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_period ON payouts(period_start, period_end);
```

**Payout Status:**
- `DRAFTED`, `APPROVED`, `REJECTED`, `PENDING`, `COMPLETED`, `FAILED`

---

### payout_items

Line items in a payout batch.

```sql
CREATE TABLE payout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  
  item_type VARCHAR(50) NOT NULL, -- BOOKING_EARNINGS, ADJUSTMENT
  description TEXT,
  
  gross_amount_minor BIGINT NOT NULL,
  platform_fee_minor BIGINT DEFAULT 0,
  tax_minor BIGINT DEFAULT 0,
  net_amount_minor BIGINT NOT NULL,
  
  currency VARCHAR(10) DEFAULT 'ETB',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payout_items_payout ON payout_items(payout_id);
CREATE INDEX idx_payout_items_booking ON payout_items(booking_id);
```

---

### escrow_holds

Temporary holds on funds.

```sql
CREATE TABLE escrow_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  payment_id UUID REFERENCES payments(id),
  
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'ETB',
  
  status VARCHAR(20) DEFAULT 'ACTIVE',
  reason VARCHAR(255),
  
  release_date DATE,
  
  released_at TIMESTAMP WITH TIME ZONE,
  released_by_id UUID REFERENCES users(id),
  
  frozen_at TIMESTAMP WITH TIME ZONE,
  frozen_by_id UUID REFERENCES users(id),
  frozen_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_escrow_holds_booking ON escrow_holds(booking_id);
CREATE INDEX idx_escrow_holds_status ON escrow_holds(status);
CREATE INDEX idx_escrow_holds_release_date ON escrow_holds(release_date);
```

**Escrow Status:**
- `ACTIVE`, `RELEASED`, `FROZEN`, `EXPIRED`

---

### ledger_accounts

Double-entry ledger accounts.

```sql
CREATE TABLE ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, REVENUE, EXPENSE
  parent_account_id UUID REFERENCES ledger_accounts(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ledger_accounts_type ON ledger_accounts(account_type);
CREATE INDEX idx_ledger_accounts_code ON ledger_accounts(account_code);
```

---

### ledger_transactions

Ledger transactions.

```sql
CREATE TABLE ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  reference VARCHAR(100),
  description TEXT,
  
  booking_id UUID REFERENCES bookings(id),
  payment_id UUID REFERENCES payments(id),
  payout_id UUID REFERENCES payouts(id),
  
  posted_by_id UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ledger_transactions_date ON ledger_transactions(transaction_date);
CREATE INDEX idx_ledger_transactions_booking ON ledger_transactions(booking_id);
```

---

### ledger_entries

Ledger transaction entries (debits/credits).

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  
  entry_type VARCHAR(10) NOT NULL, -- DEBIT, CREDIT
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(10) DEFAULT 'ETB',
  
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ledger_entries_transaction ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_id);
```

---

## Reviews & Ratings

### reviews

Guest reviews of properties.

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Detailed Ratings
  cleanliness_rating INT CHECK (cleanliness_rating BETWEEN 1 AND 5),
  communication_rating INT CHECK (communication_rating BETWEEN 1 AND 5),
  accuracy_rating INT CHECK (accuracy_rating BETWEEN 1 AND 5),
  location_rating INT CHECK (location_rating BETWEEN 1 AND 5),
  value_rating INT CHECK (value_rating BETWEEN 1 AND 5),
  
  -- Moderation
  is_visible BOOLEAN DEFAULT true,
  hidden_at TIMESTAMP WITH TIME ZONE,
  hidden_by_id UUID REFERENCES users(id),
  hidden_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_review_per_guest_property UNIQUE (reviewer_id, property_id)
);

CREATE INDEX idx_reviews_property ON reviews(property_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_visible ON reviews(is_visible);
```

---

## Admin & Moderation

### audit_logs

System-wide audit trail.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(120) NOT NULL,
  
  actor_id UUID REFERENCES users(id),
  actor_name VARCHAR(255),
  
  entity_type VARCHAR(80),
  entity_id VARCHAR(120),
  
  metadata JSONB,
  
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

---

### cases

Customer support cases.

```sql
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(32) UNIQUE NOT NULL,
  
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'MEDIUM',
  severity VARCHAR(20) DEFAULT 'MODERATE',
  status VARCHAR(20) DEFAULT 'OPEN',
  
  subject VARCHAR(500) NOT NULL,
  description TEXT,
  
  reporter_id UUID REFERENCES users(id),
  assigned_to_id UUID REFERENCES users(id),
  
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  
  sla_deadline TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cases_reporter ON cases(reporter_id);
CREATE INDEX idx_cases_assigned ON cases(assigned_to_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_priority ON cases(priority);
CREATE INDEX idx_cases_sla ON cases(sla_deadline);
```

**Case Types:**
- `COMPLAINT`, `INQUIRY`, `REFUND_REQUEST`, `TECHNICAL_ISSUE`, `ACCOUNT_ISSUE`, `BOOKING_ISSUE`, `PAYMENT_ISSUE`, `PROPERTY_ISSUE`

**Case Priorities:**
- `LOW`, `MEDIUM`, `HIGH`, `URGENT`

**Case Status:**
- `OPEN`, `IN_PROGRESS`, `WAITING_CUSTOMER`, `RESOLVED`, `CLOSED`

---

### case_messages

Case conversation threads.

```sql
CREATE TABLE case_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  sender_id UUID REFERENCES users(id),
  sender_type VARCHAR(20), -- AGENT, CUSTOMER, SYSTEM
  
  content TEXT NOT NULL,
  visibility VARCHAR(20) DEFAULT 'PUBLIC', -- PUBLIC, INTERNAL
  
  channel VARCHAR(20), -- WEB, EMAIL, SMS
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_messages_case ON case_messages(case_id);
CREATE INDEX idx_case_messages_created ON case_messages(created_at);
```

---

### case_notes

Internal case notes (staff only).

```sql
CREATE TABLE case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_notes_case ON case_notes(case_id);
```

---

### case_attachments

File attachments for cases.

```sql
CREATE TABLE case_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES users(id),
  
  file_name VARCHAR(255) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  storage_key VARCHAR(500) NOT NULL,
  
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_attachments_case ON case_attachments(case_id);
```

---

### reports

User-submitted reports (fraud, policy violations, etc.).

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  reported_entity_type VARCHAR(50) NOT NULL, -- PROPERTY, USER, REVIEW, BOOKING
  reported_entity_id UUID NOT NULL,
  
  reporter_id UUID REFERENCES users(id),
  
  type VARCHAR(50) NOT NULL, -- INAPPROPRIATE_LISTING, FRAUD, HARASSMENT, etc.
  reason VARCHAR(500),
  description TEXT,
  evidence_urls TEXT[],
  
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, REVIEWED, ACTION_TAKEN, DISMISSED
  
  reviewed_by_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  action_taken VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_entity ON reports(reported_entity_type, reported_entity_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_status ON reports(status);
```

---

## Content & Catalog

### property_categories

Property categorization taxonomy.

```sql
CREATE TABLE property_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_property_categories_active ON property_categories(is_active);
```

---

### destinations

Featured destinations/cities.

```sql
CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) UNIQUE NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  featured BOOLEAN DEFAULT false,
  image_url VARCHAR(500),
  property_count INT DEFAULT 0,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_destinations_featured ON destinations(featured);
CREATE INDEX idx_destinations_slug ON destinations(slug);
```

---

### faq_items

Frequently asked questions.

```sql
CREATE TABLE faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_faq_items_category ON faq_items(category);
CREATE INDEX idx_faq_items_published ON faq_items(is_published);
```

**Categories:**
- `GENERAL`, `BOOKING`, `PAYMENT`, `HOST`, `CANCELLATION`, `SAFETY`

---

### content_blocks

CMS content blocks.

```sql
CREATE TABLE content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(150) UNIQUE NOT NULL,
  title VARCHAR(255),
  content TEXT,
  content_type VARCHAR(50) DEFAULT 'HTML', -- HTML, MARKDOWN
  is_published BOOLEAN DEFAULT false,
  
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_blocks_slug ON content_blocks(slug);
CREATE INDEX idx_content_blocks_published ON content_blocks(is_published);
```

---

### coupons

Promotional coupons and discount codes.

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  discount_type VARCHAR(20) NOT NULL, -- PERCENTAGE, FIXED_AMOUNT
  discount_value DECIMAL(10, 2) NOT NULL,
  
  min_booking_amount DECIMAL(10, 2),
  max_discount_amount DECIMAL(10, 2),
  
  valid_from DATE,
  valid_until DATE,
  
  usage_limit INT,
  usage_count INT DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  
  created_by_id UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupons_valid_dates ON coupons(valid_from, valid_until);
```

---

### coupon_redemptions

Coupon usage tracking.

```sql
CREATE TABLE coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  user_id UUID REFERENCES users(id),
  
  discount_amount DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_user ON coupon_redemptions(user_id);
```

---

### system_settings

Application configuration settings.

```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  category VARCHAR(50),
  description TEXT,
  data_type VARCHAR(20) DEFAULT 'STRING', -- STRING, NUMBER, BOOLEAN, JSON
  is_public BOOLEAN DEFAULT false,
  
  updated_by_id UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_public ON system_settings(is_public);
```

**Categories:**
- `GENERAL`, `FINANCE`, `BOOKING`, `PAYMENT`, `MODERATION`, `NOTIFICATION`

---

## Indexes & Performance

### Geographic Queries

```sql
-- PostGIS extension for location-based queries
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Geospatial index for properties
CREATE INDEX idx_properties_location ON properties USING GIST (
  ll_to_earth(latitude::float, longitude::float)
);
```

### Full-Text Search

```sql
-- Full-text search on properties
CREATE INDEX idx_properties_search ON properties USING GIN (
  to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' ||
    COALESCE(city, '')
  )
);
```

### Composite Indexes

```sql
-- Booking date ranges
CREATE INDEX idx_bookings_property_dates ON bookings(property_id, check_in_date, check_out_date);

-- Active published properties
CREATE INDEX idx_properties_active ON properties(status, is_available, admin_hidden) 
WHERE status = 'PUBLISHED';

-- Pending reviews
CREATE INDEX idx_listing_reviews_pending ON listing_reviews(status, created_at)
WHERE status = 'PENDING';
```

---

## Relationships

### Entity Relationship Diagram

```
User
├── 1:1 HostProfile
├── 1:N RefreshTokens
├── 1:N Properties (as host)
├── 1:N Bookings (as guest)
├── 1:N Reviews (as reviewer)
├── 1:N Cases (as reporter)
├── 1:N PayoutAccounts
└── 1:N AuditLogs

Property
├── N:1 User (host)
├── 1:N Rooms
├── N:N Amenities
├── 1:N Bookings
├── 1:N Reviews
├── 1:N AvailabilityBlocks
└── 1:N ListingReviews

Booking
├── N:1 Property
├── N:1 User (guest)
├── 1:N BookingStatusHistory
├── 1:N CancellationRequests
├── 1:N Payments
├── 1:N EscrowHolds
└── 1:1 Review

Payment
├── N:1 Booking
├── 1:N ProviderEvents
├── 1:N Refunds
└── N:1 LedgerTransaction

Payout
├── N:1 User (host)
├── N:1 PayoutAccount
└── 1:N PayoutItems

Case
├── N:1 User (reporter)
├── N:1 User (assigned)
├── 1:N CaseMessages
├── 1:N CaseNotes
└── 1:N CaseAttachments
```

---

## Migration History

### Phase 1: Foundation (Migrations 1741000000000 - 1745000000000)
- Initial schema: users, host_profiles, properties, bookings, reviews
- Host domain and verification workflow
- Property details and room management
- Guest count tracking
- Unique review constraint

### Phase 2: Host Features (Migrations 1746000000000 - 1749000000000)
- Payout settings and banking configuration
- Booking payment options
- Listing review moderation system
- Google authentication support
- Host notifications

### Phase 3: Admin & Governance (Migrations 1750000000000 - 1752000000000)
- RBAC (Role-Based Access Control)
- Audit logging system
- Review moderation and reports
- Enhanced booking lifecycle
- Customer support cases

### Phase 4: Finance & Content (Migrations 1753000000000 - 1755000000000)
- Complete finance system (escrow, ledger, reconciliation)
- Payment processing with provider webhooks
- Refund and payout workflows
- Catalog management (categories, destinations)
- Content management (FAQs, blocks)
- System settings framework

### Phase 5: Security & Pricing (Migration 1756000000000)
- Payment security enhancements
- Pricing lifecycle management
- Quote versioning
- Payment reconciliation

---

## Database Maintenance

### Backup Strategy

```sql
-- Daily full backup
pg_dump engida_production > backup_$(date +%Y%m%d).sql

-- Weekly archive
pg_dump -Fc engida_production > backup_weekly_$(date +%Y%m%d).dump
```

### Cleanup Tasks

```sql
-- Remove expired refresh tokens
DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '7 days';

-- Archive old audit logs (keep last 2 years)
CREATE TABLE audit_logs_archive AS 
SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';

-- Update property counters
UPDATE destinations d
SET property_count = (
  SELECT COUNT(*) FROM properties p 
  WHERE p.city = d.name AND p.status = 'PUBLISHED'
);
```

### Performance Monitoring

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Table sizes
SELECT tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Security Considerations

1. **Sensitive Data**
   - Passwords: Bcrypted (cost factor 10)
   - Payment details: Encrypted at rest
   - PII: Minimal storage, encrypted where necessary

2. **Access Control**
   - Row-level security for multi-tenant data
   - Admin role-based permissions
   - Audit trail for all sensitive operations

3. **Data Retention**
   - Soft deletes for critical entities
   - Archive old records per GDPR
   - Anonymize user data on request

4. **Connection Security**
   - SSL/TLS required for connections
   - Connection pooling with PgBouncer
   - Read replicas for reporting

---

**Last Updated:** January 2024  
**Schema Version:** 1.0.0  
**Database:** PostgreSQL 14+
