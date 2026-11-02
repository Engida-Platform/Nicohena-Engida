# ENGIDA — Comprehensive Project Documentation

> **ENGIDA** (እንግዳ — *"Guest"* in Amharic) — A curated architectural stays and property marketplace for Ethiopia: house rentals, house sales, verified hosts, and AI-powered intelligence.
>
> *Documentation date: November 2026 · Repository: `Engida` monorepo · Status: Production-oriented, foundation complete*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Explanation](#2-project-explanation)
3. [Problem Statement](#3-problem-statement)
4. [Objectives](#4-objectives)
5. [Project Scope](#5-project-scope)
6. [System Architecture](#6-system-architecture)
7. [Feature Set](#7-feature-set)
8. [Requirements](#8-requirements)
9. [Database Overview](#9-database-overview)
10. [Technologies Used](#10-technologies-used)
11. [Design System & User Experience](#11-design-system--user-experience)
12. [Security Architecture](#12-security-architecture)
13. [AI & Machine Learning](#13-ai--machine-learning)
14. [Testing & Quality Assurance](#14-testing--quality-assurance)
15. [Infrastructure & Deployment](#15-infrastructure--deployment)
16. [Development Workflow](#16-development-workflow)
17. [Current Status & Roadmap](#17-current-status--roadmap)
18. [Conclusion](#18-conclusion)
19. [Recommendations](#19-recommendations)
20. [Appendices](#20-appendices)

---

## 1. Executive Summary

ENGIDA is a production-oriented **property rental and real estate marketplace** built specifically for Ethiopia. It connects **property seekers** (travelers, guests, renters, buyers) with **property vendors** (hosts, guesthouse operators, property owners), facilitating transparent, efficient, and trustworthy real estate transactions.

What distinguishes ENGIDA from informal channels (social media listings, classified boards) is the combination of:

- **Curated, verified listings** with transparent specs and moderation workflows,
- **Verified host identity** with audit-trailed approval processes,
- **AI-driven intelligence** — price prediction, fraud detection, semantic search, recommendations, and image analysis — provided by a dedicated Python microservice,
- **A complete operational backbone** — bookings, finance/escrow ledger, payouts, coupons, cases/support, admin RBAC, and audit logging.

The platform is built as a **three-service monorepo** (Next.js frontend, NestJS backend, FastAPI AI service) with PostgreSQL persistence, Docker-based local orchestration, and a documentation culture (`docs/`, per-service READMEs).

---

## 2. Project Explanation

### 2.1 What ENGIDA Is

ENGIDA means **"Guest"** in Amharic (እንግዳ) — reflecting the Ethiopian tradition of welcoming guests with warmth and dignity. The platform applies this cultural principle to digital accommodation discovery: every interaction is designed to be transparent, welcoming, and trustworthy.

### 2.2 Positioning

> *"The premier curated architectural stays and property marketplace tailored for Ethiopia."*

Unlike chaotic social media listings or generic classified boards, ENGIDA pairs **curated architectural standards** and **localized hospitality intelligence** with streamlined reservation flows and verified host profiles.

### 2.3 Target Users

| User Type | Description | Core Needs |
|---|---|---|
| **Travelers & Guests** | Local professionals, the Ethiopian diaspora visiting home, international tourists, and digital nomads | Reliable, verified, inspiring accommodations in Addis Ababa, Bishoftu, Hawassa, Bahir Dar, Lalibela and beyond; mobile-first browsing over cellular networks |
| **Hosts & Property Vendors** | Individual property owners, boutique guesthouse operators, real estate hosts | Listing management, reservation request handling, pricing guidance, guest communications, payout management, analytics |
| **Administrators** | Platform operators | Listing moderation, host verification, booking oversight, finance reconciliation, case management, content control, system settings |

### 2.4 Operating Context

- **Devices & connectivity:** High-volume mobile web traffic over cellular networks in Ethiopia; desktop workstations for hosts and travel planners. Hence mobile-first performance and scannable UI are mandatory, not optional.
- **Localization:** Bilingual readiness (English and Amharic); multi-currency awareness (ETB and USD), with a `useDefaultCurrency` hook in the frontend and finance formatting utilities.
- **Local geography:** Neighborhoods and landmarks feature in data (Bole, Kazanchis, Old Airport, Bishoftu lakes, Lake Hawassa), including curated showcase properties: **Bole Penthouse, Kuriftu Bishoftu, Entoto Mountain Lodge, Lake Hawassa Sanctuary**.
- **A distinct cultural touch:** A dedicated Ethiopian calendar utility (`lib/ethiopianCalendar.ts`) exists in the frontend — local time-keeping is treated as a first-class concern.

### 2.5 Transaction Model

Guests discover and evaluate properties, then submit **reservation requests** that connect them directly with hosts. The backend also implements a substantial **finance module** — escrow holds, double-entry ledger accounts, refunds, payouts, commission snapshots, tax lines, reconciliation — giving the platform a custodial-grade accounting backbone. Payment provider integration and full customer-facing escrow activation remain on the roadmap.

---

## 3. Problem Statement

Property discovery and real estate transactions in Ethiopia are fragmented, informal, and largely offline or mediated through unsuitable channels. This creates systemic problems that ENGIDA is designed to solve.

### 3.1 The Trust Gap

There is no reliable mechanism for a guest to verify that a listing is real, that the photos are current and accurate, or that the person on the other side is a legitimate host. Existing marketplaces/improvised channels (social media groups, generic classified boards, word-of-mouth brokers):

- post listings with **no verification** of host identity or property existence,
- offer **no auditing or accountability** when transactions go wrong,
- expose guests and hosts to **fraud** with no detection capability.

### 3.2 Poor Information Quality

Listings frequently lack reliable specifications — exact location, amenities, true capacity, real pricing — or misrepresent them. Consequences:

- wasted site visits and disputes between parties,
- guests cannot meaningfully **compare** options,
- hosts have no structured format to present what makes their property valuable.

### 3.3 No Data-Driven Price Reference

Neither guests nor hosts have an objective benchmark for what a property is worth per night (or for sale) in a given area and quality tier. Hosts either underprice (lose revenue) or overprice (lose bookings). There is no Ethiopian equivalent of dynamic pricing intelligence.

### 3.4 Weak Digital Experience

- Most existing channels are **not mobile-optimized** for Ethiopia's cellular-first traffic.
- **Amharic/English** bilingual support and **ETB/USD** currency handling are rarely addressed.
- Search is text-poor: no map-based exploration, no semantic or natural-language search, no comparison tooling.

### 3.5 The Opportunity

The result is a market where the demand (diaspora, tourists, professionals) cannot reliably find trustworthy accommodation, and quality supply cannot credibly distinguish itself. ENGIDA fills this structural gap with a **curated marketplace** combining verification, transparency, editorial-grade presentation, and local intelligence.

---

## 4. Objectives

### 4.1 Primary Objectives

1. **Establish trust as the core product feature** — verified listings, verified host identity badges, moderation with audit trails, and review moderation endpoints.
2. **Deliver a streamlined reservation experience** — search → evaluate → request → host confirmation → booking lifecycle with status history and cancellation requests.
3. **Infuse AI intelligence into every decision point** — fair price prediction for hosts, personalized recommendations for guests, fraud detection for administrators.
4. **Build a world-class Ethiopian digital experience** — mobile-first performance on cellular networks, WCAG 2.1 AA accessibility, bilingual and multi-currency readiness.
5. **Provide operational completeness** — finance/ledger, payouts, coupons, cases, reports, notifications, and admin tooling so the platform can be *run*, not just visited.

### 4.2 Product Principles (from `PRODUCT.md`)

1. **Hospitality with Dignity** — every interaction reflects the Ethiopian tradition of welcoming guests with warmth, transparency, and care.
2. **Visual Truth & Clarity** — photography and property details lead; no hidden fees; accurate amenities; unambiguous policies.
3. **Frictionless Scannability** — location, capacity, nightly price, and rating must be readable at a glance on any viewport.
4. **Out-of-Distribution Craft** — rejection of generic templates in favor of a cohesive, warm architectural identity with purposeful micro-interactions.

### 4.3 Engineering Objectives

- **Separation of concerns** — each of the three services owns a clear domain; the AI service never makes business decisions (the backend does).
- **Type safety at every boundary** — TypeScript on both web services, Pydantic validation in the AI service, class-validator DTOs in the backend.
- **Independent scalability** — services can be scaled and deployed separately.
- **Provider-agnostic AI** — the AI service abstracts LLM/ML providers behind its own gateway (`app/llm/provider.py`).

---

## 5. Project Scope

### 5.1 In Scope (Implemented / In Progress)

| Domain | Details |
|---|---|
| Authentication & identity | Email/password + Google OAuth; JWT access/refresh with rotation-capable `RefreshToken` entity; account linking with takeover safeguards |
| Property listings | Creation, editing, photo upload (Cloudinary), amenities, availability blocks, rooms, detail enrichment, moderation review queue |
| Bookings & reservations | Request lifecycle, status history, guest counts, payment options, cancellation requests |
| Finance & payments | Payments, escrow holds, ledger accounts/transactions/entries, refunds, payout accounts & payouts, tax lines, commission snapshots, financial adjustments, reconciliation issues, job runs |
| Communication | Guest–host messaging (conversations/messages), platform notifications, transactional emails (Nodemailer), canned responses |
| Reviews & trust | Guest reviews with unique-per-guest-property constraint, listing reviews, moderation, reports |
| Host tools | Host profiles, verification requests, payout settings, host notifications, host portal |
| Admin | RBAC + audit logs, moderation queues, verification approvals, booking oversight, case management, coupons, content blocks/FAQs, system settings, reports |
| AI (via AI service) | Pricing intelligence (model + logs), recommendations, fraud/risk scoring, vision (image quality, classification, duplicates), semantic search, LLM assistant |
| Commerce extras | Coupons and redemptions, catalog entities (property categories, destinations), content management |

### 5.2 Out of Scope (Current Constraints)

- Fully activated custodial escrow payment processing with a live payment provider (infrastructure exists; user-facing activation pending).
- Native mobile applications (responsive web only for now).
- Public content delivery networks / large-scale ML training infrastructure beyond local pipelines.

---

## 6. System Architecture

### 6.1 High-Level Structure

```
                    ┌─────────────────────────────────┐
                    │   Frontend — Next.js 16 :3001   │
                    │  App Router · React 19 · TS 5   │
                    │   Tailwind 4 · Leaflet maps     │
                    └───────────────┬─────────────────┘
                                    │ REST (NEXT_PUBLIC_API_URL)
                    ┌───────────────▼─────────────────┐
                    │   Backend API — NestJS 11 :3000 │
                    │  Auth · Listings · Bookings     │
                    │  Finance · Admin · AI proxy     │
                    └──────┬──────────────────┬───────┘
                           │                  │ HTTP/REST
            ┌──────────────▼───┐    ┌──────────▼──────────────┐
            │  PostgreSQL      │    │  AI Service — FastAPI   │
            │  (TypeORM,       │    │  :8000 · pricing · risk │
            │   48+ entities)  │    │  vision · recommender   │
            └──────────────────┘    │  LLM gateway            │
                                    └─────────────────────────┘
```

- Frontend → Backend: the public REST API (Swagger/OpenAPI documented).
- Backend → AI Service: intelligence calls; the backend remains the sole decision-maker.
- Backend is also the OAuth client for Google sign-in — the app never sees the client secret.

### 6.2 Backend Internal Organization (`backend/src`)

| Path | Responsibility |
|---|---|
| `auth/` (decorators, DTOs, entities, guards, strategies) | JWT + Google OAuth authentication, refresh tokens |
| `users/` | User accounts and profiles |
| `modules/properties` (+ `listing-moderation`) | Property, Room, AvailabilityBlock; review-queue moderation of listings and edit proposals |
| `modules/amenities` | Amenity catalog for listings |
| `modules/bookings` | Booking lifecycle, status history, cancellations |
| `modules/finance` | Payments, escrow, double-entry ledger, refunds, payouts, taxes, commissions, reconciliation jobs |
| `modules/payments` | Payment provider integration |
| `modules/host` | Host onboarding, verification, payout settings, host notifications |
| `modules/reviews` | Guest reviews and listing reviews |
| `modules/messages` | Conversations and messages |
| `modules/notifications` | In-app notifications |
| `modules/cases` | Support/dispute cases with messages, notes, attachments, events, canned responses |
| `modules/reports` | Reporting on listings/users |
| `modules/admin/` | RBAC, audit, bookings, cases, settings (`SystemSetting`) |
| `modules/ai` | Outbound integration to the FastAPI AI service |
| `modules/coupons` | Coupons and redemptions |
| `modules/catalog` | Property categories and destinations |
| `modules/content` | FAQs, content blocks |
| `modules/cloudinary` | Image upload pipeline |
| `routes/` | Express-style routes: avatar, bookings, favorites, messages, notifications, payments, profile, properties, reviews |
| `database/` | TypeORM data source, 18 migrations, seeders (incl. `seed-ethiopian-listings.js`) |
| `health/` | Health check endpoint |
| `config/` | Env validation (`env.validation.ts`) |
| `middleware/`, `lib/` | Cross-cutting concerns |

### 6.3 Frontend Internal Organization (`frontend/src`)

| Path | Responsibility |
|---|---|
| `app/` | App Router pages: `/` home, `/properties`, `/stays`, `/login`, `/register`, `/become-a-host`, `/host`, `/dashboard`, `/messages`, `/notifications`, `/support`, `/checkout`, `/admin` |
| `components/admin` | Admin panel UI |
| `components/assistant` | AI assistant surface |
| `components/auth` | Auth forms incl. Google sign-in |
| `components/compare` | Property comparison tooling |
| `components/host` | Host portal and onboarding |
| `components/home`, `components/search` | Discovery and search UI |
| `components/maps` | Leaflet-based map views |
| `components/reports` | Reporting UI |
| `hooks/` | `useAdminPermissions`, `useDefaultCurrency` |
| `lib/` | `api.ts` (API client), `google-auth.ts`, `finance-format.ts`, `ethiopianCalendar.ts`, `trustScore.ts`, `navigation.ts`, `notifications.ts`, `utils/` |

---

## 7. Feature Set

### 7.1 For Property Seekers (Guests)

- Browse rental and sale listings, including curated showcase properties.
- Advanced search with filters, map-based exploration (Leaflet), and AI-powered recommendations.
- Semantic / natural-language search (AI service `search` endpoints with embeddings).
- Property comparison (`components/compare`).
- Save favorites; view detailed property information with transparent specs, amenities, availability.
- Submit reservation requests; message hosts directly.
- Leave reviews (enforced unique per guest per property); report inappropriate listings.
- Manage favorites, profile, avatar; receive notifications.

### 7.2 For Hosts (Property Vendors)

- Multi-step host onboarding (`/become-a-host` → host portal), optionally with Google sign-in (2-step: account resolution + profile details).
- Create listings for rent or sale with photos (Cloudinary-backed), amenities, and details.
- Submit listings for moderation review; withdraw pending submissions; track review status/history.
- Request host identity verification with document workflow and audit trail.
- AI-powered price suggestions.
- Manage reservation requests, availability, guest communications.
- Payout settings and payout tracking.
- Dashboard analytics.

### 7.3 For Administrators

- Role-based access control (RBAC) and full audit logging.
- Listing moderation: review queue for new listings and edit proposals, approve/reject, hide/restore, moderation history.
- Host verification: review pending requests, approve/reject, revoke, document metadata audit.
- Booking oversight and finance reconciliation tooling (reconciliation issues, job runs).
- Case management (disputes/support) with messages, notes, attachments, canned responses.
- Coupons, content blocks, FAQs, destinations and categories catalog management.
- System settings (runtime configuration via `SystemSetting` entity).
- Reports and analytics dashboards.

### 7.4 AI Capabilities (Platform-Wide)

- Personalized property recommendations (candidate generation → scoring → ranking).
- Intelligent price prediction with evaluation and auditing (`PriceRecommendationLog`).
- Fraud detection and risk scoring (rules engine + feature engineering).
- Property image analysis: quality assessment, classification, duplicate detection.
- Natural language search and semantic matching.
- An LLM-based assistant (conversational AI surface in the frontend).

---

## 8. Requirements

### 8.1 Functional Requirements

#### 8.1.1 Authentication & Account Management

| ID | Requirement |
|---|---|
| FR-AUTH-1 | System SHALL allow sign-up/sign-in with email and password (bcrypt hashing). |
| FR-AUTH-2 | System SHALL support Google Sign-In (OAuth 2.0) with signed `state` + nonce cookie CSRF protection, backend-side token exchange, verified-email-only acceptance, and signed callback redirect. |
| FR-AUTH-3 | Access tokens SHALL never appear in URLs; refresh tokens SHALL be stored in HttpOnly cookies. |
| FR-AUTH-4 | Google identity SHALL NOT auto-link to an existing local password account (takeover prevention); linking requires an active authenticated session. |
| FR-AUTH-5 | Optional workspace restriction via `GOOGLE_ALLOWED_HOSTED_DOMAIN`. |
| FR-AUTH-6 | If Google credentials are absent, the sign-in button degrades gracefully and email/password remains fully functional. |

#### 8.1.2 Properties & Listings

| ID | Requirement |
|---|---|
| FR-PROP-1 | Hosts SHALL create/edit listings with photos, location, amenities, rooms, capacity, availability blocks, and pricing (nightly/sale). |
| FR-PROP-2 | Listings SHALL pass through a moderation review queue before publication; admin can approve, reject, hide, or restore. |
| FR-PROP-3 | Guests SHALL browse/search listings with filters and map view; key criteria must be visible at a glance. |
| FR-PROP-4 | Property images SHALL be processed for quality and duplicate detection (AI vision). |

#### 8.1.3 Bookings & Transactions

| ID | Requirement |
|---|---|
| FR-BKG-1 | Guests SHALL submit reservation requests connected directly to hosts. |
| FR-BKG-2 | Booking lifecycle SHALL record full status history and support cancellation requests. |
| FR-BKG-3 | Bookings SHALL support guest counts and payment options (per `BookingGuestCount` / `BookingPaymentOptions` migrations). |
| FR-BKG-4 | Finance module SHALL support payments, escrow holds, ledger accounting (double-entry), refunds, payouts to hosts, tax lines, and commission snapshots. |
| FR-BKG-5 | Coupons SHALL be applicable and redemption SHALL be tracked. |

#### 8.1.4 Trust, Reviews & Disputes

| ID | Requirement |
|---|---|
| FR-TRS-1 | System SHALL enforce unique review per guest per property. |
| FR-TRS-2 | Reviews and listing reviews SHALL be subject to moderation. |
| FR-TRS-3 | Users SHALL be able to report inappropriate listings/users; cases SHALL be tracked end-to-end with messages, notes, attachments, and events. |
| FR-TRS-4 | Hosts SHALL have verification badges derived from verified identity status. |

#### 8.1.5 Communication & Notifications

| ID | Requirement |
|---|---|
| FR-COM-1 | Guests and hosts SHALL exchange messages within conversations. |
| FR-COM-2 | Platform SHALL send in-app notifications (incl. host notifications for moderation/payment events) and transactional emails (Nodemailer). |

#### 8.1.6 AI Services

| ID | Requirement |
|---|---|
| FR-AI-1 | AI service SHALL expose pricing prediction, recommendations, risk/fraud scoring, image analysis, semantic search, and assistant endpoints (v1 API). |
| FR-AI-2 | LLM integration SHALL be provider-agnostic (pluggable providers). |
| FR-AI-3 | AI SHALL advise; the backend SHALL retain all business decisions. |
| FR-AI-4 | Price recommendations SHALL be logged for auditing (`PriceRecommendationLog`). |

#### 8.1.7 Administration

| ID | Requirement |
|---|---|
| FR-ADM-1 | Admin actions SHALL be RBAC-protected and written to an audit log. |
| FR-ADM-2 | Admins SHALL manage moderation, verification, bookings, cases, coupons, content, catalog, settings, and reports. |

### 8.2 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Fast rendering and loading over mobile cellular networks; rate limiting tuned for seamless SPA browsing (up to 300 req/min, 60s window). |
| **Security** | Helmet security headers; bcrypt password hashing; JWT access + refresh secrets required (startup fails without them); global throttling; strict DTO validation; CORS allow-listing. |
| **Accessibility** | WCAG 2.1 AA contrast on warm-sand backgrounds; ≥44×44px interactive touch targets; semantic heading hierarchy; keyboard-navigable dialogs, search and menus. |
| **Reliability** | Versioned TypeORM migrations (18 to date) with run/revert support; database synchronize disabled by default in Docker; automated test suites. |
| **Maintainability** | Modular NestJS architecture; type-hinted Python with docstrings; ESLint 9 + Prettier; black/flake8/mypy in the AI service; conventional commits. |
| **Configurability** | Environment-driven configuration with strict validation (`env.validation.ts`); root + per-service `.env` files; Docker Compose forwarding. |
| **Multi-platform readiness** | Mobile-first responsive layouts for cellular-heavy Ethiopian traffic; desktop parity for host/admin workflows. |

### 8.3 Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- Docker & Docker Compose (recommended) or a local PostgreSQL instance

---

## 9. Database Overview

- **Engine:** PostgreSQL, accessed via **TypeORM 0.3** with a connection factory that accepts either a `DATABASE_URL` or discrete host/port credentials.
- **Persistence policy:** `DATABASE_SYNCHRONIZE` disabled by default; schema changes propagate exclusively via **versioned migrations**.
- **Migration history (18, oldest → newest):** HostDomainFoundation → RemoveDemoListings → PropertyDetails → BookingGuestCount → UniqueReviewPerGuestProperty → HostPayoutSettings → BookingPaymentOptions → ListingReviewModeration + UserGoogleAuth → HostNotifications → AdminRbacAudit → ReviewModerationReports → BookingsAndCases → FinanceAndEscrow → CatalogGrowthAndContent + PricingIntelligenceAndFeedback → SystemSettingsAndPhase5 → PaymentSecurityAndPricingLifecycle.
- **Seed data:** `npm run seed:properties` loads curated Ethiopian listings (including the showcase set).

### Entity Domains (48 registered entities)

| Domain | Entities |
|---|---|
| Identity & access | `User`, `HostProfile`, `RefreshToken` |
| Property | `Property`, `Room`, `AvailabilityBlock`, `Amenity`, `PropertyCategory`, `Destination` |
| Booking | `Booking`, `BookingStatusHistory`, `CancellationRequest` |
| Trust | `Review`, `ListingReview`, `Report`, `AuditLog`, `PriceRecommendationLog` |
| Finance & payments | `Payment`, `ProviderEvent`, `EscrowHold`, `LedgerAccount`, `LedgerTransaction`, `LedgerEntry`, `Refund`, `RefundEvent`, `PayoutAccount`, `Payout`, `PayoutItem`, `PayoutEvent`, `TaxLine`, `CommissionSnapshot`, `FinancialAdjustment`, `ReconciliationIssue`, `JobRun`, `FinanceSetting` |
| Marketing & commerce | `Coupon`, `CouponRedemption` |
| Communication | `Conversation`, `Message`, `Notification` |
| Support & operations | `Case`, `CaseMessage`, `CaseNote`, `CaseAttachment`, `CaseEvent`, `CannedResponse` |
| Content & config | `FaqItem`, `ContentBlock`, `SystemSetting` |

Full details: [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md).

---

## 10. Technologies Used

### 10.1 Frontend — `frontend/` (port 3001)

| Technology | Version | Purpose |
|---|---|---|
| Next.js (App Router) | 16.3.1 | Web framework, page routing, SSR/streaming |
| React | 19.2.8 | UI library |
| TypeScript | ^5 | Static typing |
| Tailwind CSS | ^4 (PostCSS) | Styling; implements the "Warm Architectural Modernism" design tokens |
| Leaflet | ^1.9.4 | Interactive property maps |
| lucide-react | ^1.37 | Iconography |
| ESLint (+ next config) | ^9 | Linting |

### 10.2 Backend — `backend/` (port 3000)

| Technology | Version | Purpose |
|---|---|---|
| NestJS (@nestjs/common, core, platform-express) | ^11 | API framework and module system |
| TypeScript | ^5.7 | Static typing |
| TypeORM | ^0.3.28 | ORM (entities, migrations, repository pattern) |
| `pg` (node-postgres) | ^8.23 | PostgreSQL driver |
| mysql2 | ^3.16 | Alternate driver available for migration runs against MySQL-compatible flows |
| @nestjs/config + class-validator/transformer | — | Environment validation and DTO validation |
| @nestjs/jwt, passport, passport-jwt | ^11 / ^0.7 / ^4 | JWT authentication strategy |
| google-auth-library | ^10.9 | Google OAuth id_token verification |
| bcrypt | ^6 | Password hashing |
| Cloudinary | ^2.11 | Image storage & transformation |
| Nodemailer | ^10.2 | Transactional email |
| @nestjs/swagger + swagger-ui-express | ^11 / ^5 | OpenAPI/Swagger docs |
| @nestjs/throttler | ^6.4 | Rate limiting (300 req/min per IP default) |
| Helmet, cookie-parser | ^8 / ^1.4 | Security headers, cookie handling |
| reflect-metadata, rxjs | — | NestJS runtime dependencies |
| Jest, ts-jest, Supertest | ^30 / ^29 / ^7 | Unit and e2e testing |
| ESLint 9, Prettier, typescript-eslint | — | Code quality |

### 10.3 AI Service — `ai-service/` (port 8000)

| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.115.0 | REST API framework |
| Uvicorn (standard) | 0.32.0 | ASGI server |
| Pydantic / pydantic-settings | 2.9 / 2.6 | Schema validation & settings |
| httpx | 0.27 | Async HTTP client (backend integration via `engida_client`) |
| python-multipart | 0.0.12 | Form upload handling |
| pytest, pytest-asyncio, pytest-cov | 8.3 / 0.24 / 5.0 | Testing |
| black, flake8, mypy | 24.8 / 7.1 / 1.11 | Formatting, linting, static typing |
| *Planned:* numpy, pandas, scikit-learn, torch, transformers, sentence-transformers, langchain, openai | — | Full ML stack once models leave heuristic/experimental stage |

### 10.4 Infrastructure & Tooling

| Technology | Purpose |
|---|---|
| Docker & Docker Compose | Three-service local orchestration on a `bridge` network (`engida-network`), bind mounts for live reload |
| PostgreSQL | Primary relational database (default local port 5432; Docker default via `host.docker.internal:5433`) |
| Git | Conventional Commits, `main`/`develop`/`feature/*`/`fix/*` branching |
| npm root scripts | `dev:backend`, `dev:frontend`, `build:*`, `install:*` orchestration |

---

## 11. Design System & User Experience

- **System name:** *Engida Architectural Modernism* — warm Mediterranean/desert-modernist hospitality aesthetic.
- **Palette:** warm sand canvas `#faf5ee`, deep slate text `#3a302a`, terracotta rust interactive `#b3541e`/`#c2652a`, ochre highlights, muted stone secondary `#78706a`.
- **Typography:** editorial serif headings (**EB Garamond**) paired with high-legibility geometric sans (**Manrope**); 3rem display headings with tight letter-spacing, 1rem body.
- **Radii & spacing:** scale from 0.25rem (xs) to 9999px (full pill shapes) — see `DESIGN.md` for exact token tables.
- **Accessibility:** WCAG 2.1 AA contrast, ≥44px touch targets, semantic headings, keyboard-navigable components.
- **Design inspiration:** Stitch concept "HavenStay — Property Rental Home" (reference documented in `PRODUCT.md`).

---

## 12. Security Architecture

| Layer | Measures |
|---|---|
| Transport & headers | Helmet defaults; CORS restricted to known origins (`ALLOWED_ORIGINS`, `FRONTEND_URL`) |
| Credentials | bcrypt hashing; JWT access + refresh secrets enforced via env validation; refresh tokens persisted server-side (`RefreshToken` entity) enabling revocation |
| OAuth | Backend is the OAuth client; `state` signed and bound to nonce cookie (callback forgery/replay rejected); only verified Google emails; no auto-linking of local-password accounts; access token never in URLs |
| Rate limiting | Global throttling (default 300 req/60s, configurable), protecting auth-sensitive and AI endpoints |
| Input validation | class-validator/class-transformer DTOs (backend), Pydantic (AI service) |
| Auditability | Admin RBAC + `AuditLog` entity; moderation/verification actions carry document metadata audit trails |
| Payments | `PaymentSecurityAndPricingLifecycle` migration signals hardened payment + pricing lifecycle handling |
| Data lifecycle | Migrations support safe evolution; audit trails preserved across operations |

---

## 13. AI & Machine Learning

The AI service (`ai-service/`) is a **standalone intelligence microservice**. It talks to the backend over REST (via `integrations/engida_client.py`), stays provider-agnostic, and never makes business decisions.

### 13.1 Intelligence Domains

| Domain | Implementation modules | Purpose |
|---|---|---|
| **Pricing intelligence** | `pricing/` (predictor, evaluator, feature engineering, model loader) + `scripts/train_pricing.py`, `evaluate_pricing.py`, `prepare_data.py` | Fair nightly-rate predictions; evaluation pipeline; predictions logged & auditable on the backend |
| **Recommendations** | `recommendation/` (candidate generator, feature builder, scorer, ranker) | Personalized property suggestions — generate → score → rank pipeline |
| **Fraud & risk** | `fraud/` (detector, rules, risk scorer, feature engineering) + `risk_service` | Suspicious listing/user identification for admin action |
| **Vision** | `vision/` (image quality, property classifier, duplicate detector) | Image quality gates, classification, duplicate photo detection during listing creation |
| **Semantic search** | `embeddings/` (embedding service, similarity) + `search_service` | Natural-language search and semantic matching |
| **Assistant (LLM)** | `llm/` (client, provider, prompts, response parser) + `services/assistant_service` + `orchestrator/ai_orchestrator` | Conversational assistant; provider-agnostic LLM gateway with prompt engineering |

### 13.2 Data Pipeline

`data/raw → data/processed → data/features → data/datasets` with prepare/train/evaluate scripts, supporting a proper ML workflow (training, evaluation, model loading into the prediction runtime).

### 13.3 API Surface (v1)

`/api/v1` groups: `assistant`, `listings`, `pricing`, `recommendations`, `risk`, `search`, plus service `health`. Interactive docs at `/docs` (Swagger) and `/redoc`.

---

## 14. Testing & Quality Assurance

| Service | Tooling | Notes |
|---|---|---|
| Backend | Jest + ts-jest + Supertest | Unit (`*.spec.ts`) and e2e (`jest-e2e.json`); coverage via `npm run test:cov` |
| Frontend | ESLint (next config) | No component test suite yet (roadmap item) |
| AI service | pytest + pytest-asyncio + pytest-cov | `unit/` (fraud, pricing, recommendation, services) and `integration/api` suites; `pytest.ini` configured； |

Commands:

```bash
cd backend  && npm test && npm run lint          # backend tests + lint
cd ai-service && pytest && black app/ tests/    # AI tests + format
cd frontend && npm run lint                      # frontend lint
```

---

## 15. Infrastructure & Deployment

- **Local orchestration:** `docker-compose up` starts `frontend` (:3001), `backend` (:3000), and `ai-service` (:8000) with bridge networking; backend reaches the database through `host.docker.internal` (`DOCKER_DATABASE_URL`).
- **Required secrets:** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` at startup — compose refuses to boot the backend without them; `THROTTLE_*` tunable; Google OAuth variables optional.
- **Per-service containers** ship their own `Dockerfile`/`Dockerfile.dev` for dev and (planned) production parity.
- **Full guide:** [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md); runbooks under `docs/runbooks/`.

Environment template (root `.env.example`):

```env
DATABASE_URL=postgresql://engida:engida@localhost:5432/engida
PORT=3000
JWT_ACCESS_SECRET=replace-with-a-unique-random-secret-of-at-least-32-characters
AI_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

---

## 16. Development Workflow

- **Branches:** `main` (production-ready), `develop` (integration), `feature/*`, `fix/*`.
- **Commits:** conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- **Workspace scripts (root `package.json`):** `npm run dev:backend`, `dev:frontend`, `build:backend`, `build:frontend`, `install:backend`, `install:frontend`.
- **Database changes:** never edit schema via synchronize; generate migrations (`npm run migration:generate`), review, then run (`migration:run`); revertable via `migration:revert`.
- **Next.js note:** the frontend runs Next.js 16 — a version with breaking API/convention changes from prior experience. Consult `frontend/node_modules/next/dist/docs/` before writing Next.js code.

---

## 17. Current Status & Roadmap

### 17.1 Completed

- ✅ Monorepo structure with three independently containerizable services
- ✅ Full authentication (email/password + hardened Google OAuth) with refresh-token persistence
- ✅ 18 database migrations establishing the complete domain model (48 entities)
- ✅ Host onboarding & host portal; curated Ethiopian listing seed data
- ✅ Moderation, verification, cases, reports, coupons, content, destinations, settings (admin-side core)
- ✅ Finance/escrow/ledger/payout groundwork
- ✅ AI service with pricing, recommendation, fraud/risk, vision, search, assistant modules and test suites
- ✅ Docker-based development orchestration and documentation structure

### 17.2 Outstanding (tracked in `ADMIN_FEATURES_ANALYSIS.md` and elsewhere)

- [ ] Guest-side trust surfaces: verification badges on listings, "verified hosts only" filter, trust score display (`trustScore.ts` exists — needs exposure)
- [ ] Host-side gaps: detailed rejection reasons, listing appeals, resubmission flows, moderation-status notifications
- [ ] Guest reporting flow connecting to the reports module
- [ ] AI recommendation integration into live search results
- [ ] Frontend test suite
- [ ] Live payment provider & escrow customer-facing activation
- [ ] Amharic localization & ETB/USD currency switching rollout

---

## 18. Conclusion

ENGIDA is a structurally ambitious and unusually complete marketplace for a foundation-stage product. Its differentiator is not any single feature but the **coherence between product intent and engineering execution**: the "hospitality with dignity" brand promise is backed by concrete mechanisms — moderation queues with audit trails, host identity verification with document workflows, unique review constraints, refund/payout ledgers, and AI-assisted price fairness. The three-service architecture cleanly separates presentation, transactions, and intelligence, while type safety at every boundary (TypeScript ×2, Pydantic) keeps the seams honest. The finance module's escrow, ledger, tax, and reconciliation entities show the platform is preparing for real transaction volume rather than stopping at inquiry brokering. Security posture is strong for its stage — enforced JWT secrets, hardened OAuth, rate limiting, RBAC with audit logging. Remaining work is primarily *exposure and completion*: surfacing trust signals to guests, closing host-side moderation gaps, activating payments, integrating AI recommendations into live search, and adding frontend test coverage. The foundation is solid enough that these are incremental rather than architectural tasks.

---

## 19. Recommendations

| Priority | Recommendation | Rationale |
|---|---|---|
| 🔴 High | **Activate guest-facing trust signals** — verification badges on listings/profiles, "verified hosts only" filter, trust score display. Trust is the product promise; it is currently backend-complete but frontend-invisible. | `ADMIN_FEATURES_ANALYSIS.md` flags these as missing on the guest side |
| 🔴 High | **Complete payment provider integration** — connect a local provider (e.g., Telebirr, Chapa) or card processor to the existing payment/ledger/payout entities. The hardest part (finance architecture) exists; wiring a provider finishes the loop. | `payments` module + `PaymentSecurityAndPricingLifecycle` migration in place; PRODUCT.md notes escrow not yet active |
| 🟠 Medium | **Close the host-moderation gap** — expose detailed rejection reasons, appeal/resubmit flows, and moderation status notifications. Reduces host frustration and admin re-review load. | Explicitly listed as missing in admin analysis |
| 🟠 Medium | **Integrate AI ranking into live search** — recommendations, pricing suggestions, and semantic search exist in the AI service; embed them into frontend search results and host listing forms. | Delivers the platform's core differentiator to end users |
| 🟠 Medium | **Add frontend test coverage** — Playwright/Cypress E2E for critical flows (auth, listing creation, reservation) plus component tests. Claims of production-readiness need a test story on the UI side. | Frontend currently lint-only |
| 🟡 Medium | **CI/CD pipeline** — run lint + tests + migration checks on PRs (Jest, pytest, ESLint, black/flake8/mypy); auto-deploy from `develop`/`main`. Prevents regressions across 3 services. | Currently manual tooling only |
| 🟡 Medium | **Ship Amharic localization & currency switching** — user-preferred language detection and ETB defaults. Core local relevance; `useDefaultCurrency` hook exists. | PRODUCT.md positioning |
| 🟡 Medium | **Observability** — structured logging, Sentry-style error tracking, health dashboards/alerting across services. Multi-service systems fail quietly without it. | Three independently deployable services |
| 🟢 Low | **Managed PostgreSQL + Redis caching** before public launch; move seeds to fixtures that work across environments. | docker-compose binds to a host database, fine for dev only |
| 🟢 Low | **Guest journey automation** — post-checkout review requests, rebooking prompts, wishlist digests. Drives marketplace liquidity. | Reviews/notifications infrastructure ready |

---

## 20. Appendices

### A. Repository Layout

```
Engida/
├── frontend/              # Next.js 16 web application (:3001)
│   └── src/app/           # Pages: /, /properties, /stays, /host, /admin, ...
├── backend/               # NestJS 11 REST API (:3000)
│   └── src/
│       ├── auth/          # JWT + Google OAuth
│       ├── users/         # Users
│       ├── modules/       # 16+ domain modules (properties, bookings, finance, admin…)
│       ├── routes/        # Express routes (avatars, favorites, payments…)
│       └── database/      # 18 migrations + seeders
├── ai-service/            # FastAPI AI microservice (:8000)
│   └── app/               # pricing, recommendation, fraud, vision, embeddings, llm
├── docs/                  # ARCHITECTURE, DATABASE_SCHEMA, API_DOCUMENTATION,
│   │                      # DEPLOYMENT_GUIDE, DEVELOPMENT_WORKFLOW, SECURITY_COMPLIANCE,
│   │                      # FRONTEND_COMPONENTS + runbooks/ + designs/
│   ├── architecture/      # SYSTEM-OVERVIEW, remediation-plan
│   └── ai/                # AI-ARCHITECTURE
├── db/                    # Local database assets
├── DESIGN.md              # Design tokens (colors, type, spacing, radii)
├── PRODUCT.md             # Product definition & principles
├── ADMIN_FEATURES_ANALYSIS.md
├── docker-compose.yml     # Local orchestration
└── .env.example           # Environment template
```

### B. Documentation Map

| File | Content |
|---|---|
| `README.md` | Setup, run instructions, Google OAuth integration guide |
| `PRODUCT.md` | Users, positioning, product principles, accessibility commitments |
| `DESIGN.md` | Full design-token tables |
| `docs/ARCHITECTURE.md`, `docs/architecture/SYSTEM-OVERVIEW.md` | System architecture |
| `docs/DATABASE_SCHEMA.md` | Schema reference |
| `docs/API_DOCUMENTATION.md` | REST API reference |
| `docs/DEPLOYMENT_GUIDE.md` | Deployment steps |
| `docs/SECURITY_COMPLIANCE.md` | Security posture |
| `docs/FRONTEND_COMPONENTS.md` | Component inventory |
| `docs/ai/AI-ARCHITECTURE.md` | AI service architecture |
| Per-service `README.md` | Service-specific setup & conventions |

### C. Quick Start

```bash
docker-compose up          # Start frontend (:3001), backend (:3000), AI (:8000)

# Or manual per-service:
cd backend  && npm i && cp ../.env.example .env && npm run start:dev
cd frontend && npm i && npm run dev
cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
```

---

*Built with ❤️ for Ethiopia. This document reflects repository state as of November 2026; consult inline docs (`docs/`, per-service READMEs) for the latest details.*
