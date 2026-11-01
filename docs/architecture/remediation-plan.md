# ENGIDA Remediation Plan — Listings, Bookings & Payments

**Status:** Draft for review  
**Date:** 2026-11-01  
**Scope:** Fix all findings from the booking / payment / property-listing workflow analysis.  
**Owners:** Backend + Frontend + Finance/Operations  
**Target:** Security-safe payment flow, one authoritative price quote, explicit booking lifecycle, auditable finance operations.

---

## 1. Goals

1. **No booking can become `PAID` without a verified provider capture.**
2. **The guest sees the same price on the property page, checkout, booking, and payment.**
3. **Booking status and payment status are explicit, consistent, and auditable.**
4. **Host verification, cancellation, refunds, escrow release, and payouts follow one documented workflow.**
5. **Sandbox/test behavior cannot be used to bypass payment in production.**
6. **Dead/legacy code and misleading UI copy are removed.**

## 2. Non-goals

- Redesigning the visual design system.
- Adding new payment providers beyond Chapa/sandbox.
- Rebuilding the admin dashboard.
- Changing the AI service.
- Multi-currency settlement beyond what already exists.

---

## 3. Product decisions required

These decisions affect implementation. Recommended defaults are listed so work can start; confirm before Phase 2.

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | Booking model: instant book vs request-to-book | **Request-to-book by default; per-property `instantBook` opt-in** | Matches current host-confirm flow and avoids surprising hosts. Instant book can be enabled per listing. |
| D2 | Host verification | **New hosts start `UNVERIFIED`; existing hosts grandfathered as `VERIFIED`; admin review via existing endpoints** | Fixes the auto-verify hole without disrupting current hosts. |
| D3 | Revenue model | **One platform take rate. Use `finance.commission_rate_bps` (15%) as the source of truth. Remove the separate 12% guest service fee unless product explicitly wants both.** | Current UI adds 12% to the guest while finance deducts 15% from the host. Charging both may be unintended and must be decided before pricing work. |
| D4 | Cleaning fee | **Property-level `cleaningFee`, set by the host; default 0. Remove hardcoded ETB 750 / USD 65.** | Different properties have different cleaning costs; hardcoding is wrong. |
| D5 | Escrow release trigger | **`CHECKOUT + 24h` (configurable), with no open dispute** | Safer than check-in + 24h; matches the current “completed + delay” behavior most closely. Update docs/UI to match. |
| D6 | Cancellation flow | **Guest requests cancellation → admin approves/rejects → refund per policy. Host cancellation → immediate cancel + full refund. Unpaid bookings → immediate cancel.** | Uses the existing cancellation-request and refund infrastructure; protects both sides. |
| D7 | International payments / coupons | **Remove international methods from active checkout for now. Wire coupons into the quote service or remove the unused fields.** | Avoid dead UI and unused data. Coupons module already exists, so wiring is preferred. |
| D8 | Payout schedule | **Daily 02:00 Addis Ababa, automatic; admin can still trigger manually.** | Matches the existing `payoutSchedule` setting and removes the manual-only gap. |

---

## 4. Traceability — finding to task

| Finding | Task IDs |
|---|---|
| Client `paymentReference` can mark booking paid | SEC-01 |
| Sandbox webhook can be forged | SEC-02 |
| Payment session has no booking ownership check | SEC-03 |
| Webhook amount/currency not validated | SEC-04 |
| Multiple payment sessions / double-charge risk | SEC-05 |
| Hosts auto-verified on profile creation | HOST-01 |
| Property page price ≠ charged price | PRICE-01 |
| UI says “confirmed” while booking is `PENDING` | BOOK-02 |
| Payment method not persisted to booking | PAY-01 |
| No auto-confirm / instant book | BOOK-02 |
| Cancellation does not trigger refund | BOOK-03 |
| Escrow/payout timing mismatch; payout not scheduled | FIN-01, FIN-02 |
| VAT/withholding not posted to ledger | FIN-03 |
| Host reservation transitions bypass history/guest notification | BOOK-04 |
| Orphaned booking components | CLN-01 |
| Legacy Express routes / Prisma schema | CLN-02 |
| Dead international payment methods | CLN-03 |
| Coupon fields unused | PRICE-02 |
| Misleading UI copy | CLN-04 |

---

## 5. Phase 0 — Safety net (1–2 days)

### 0.1 Baseline tests and test database

- [ ] Add a dedicated Postgres test database setup using `docker-compose.yml`.
- [ ] Add `TEST_DATABASE_URL` and a test bootstrap that runs migrations.
- [ ] Add baseline API tests for the current happy path:
  - create booking
  - create payment session
  - sandbox webhook capture
  - host confirm/complete
  - listing draft → review → publish
- [ ] Add a security regression test file that currently **fails** for the known issues (so fixes are provable).

**Files:** `backend/test/`, `backend/src/**/*.spec.ts`, `docker-compose.yml`, `.env.example`.

**Exit criteria:** `npm test` and `npm run test:e2e` pass on a clean database.

### 0.2 Feature flags and environment validation

- [ ] Add flags:
  - `PAYMENTS_STRICT_VERIFICATION`
  - `SANDBOX_WEBHOOKS_ENABLED`
  - `HOST_VERIFICATION_REQUIRED`
  - `PRICING_QUOTE_V2`
  - `INSTANT_BOOK_ENABLED`
- [ ] Validate flags in `backend/src/config/env.validation.ts`.
- [ ] Add safe defaults for local/test and production:
  - strict verification: `true` everywhere except a deliberate migration window
  - sandbox webhooks: `false` in production
  - host verification: `true` in production
  - pricing quote v2: `true` after Phase 2
- [ ] Document flags in `.env.example`.

### 0.3 Migration and rollback rehearsal

- [ ] Back up the staging database.
- [ ] Rehearse all migrations in Phase 1–3 on a copy.
- [ ] Confirm each migration is reversible.
- [ ] Create an incident rollback checklist.

### 0.4 Observability baseline

- [ ] Add structured log fields for:
  - `paymentId`, `bookingId`, `provider`, `providerEventId`
  - `signatureVerified`, `amountMinor`, `currency`
- [ ] Add counters for:
  - webhook signature failures
  - amount/currency mismatches
  - duplicate capture attempts
  - bookings `PAID` without a successful payment
  - escrow holds stuck past eligibility
  - payout failures
- [ ] Add alert thresholds in the deployment platform.

---

## 6. Phase 1 — P0 payment security (4–6 days)

### SEC-01 — Remove client-side payment trust

**Problem:** `POST /bookings` accepts `paymentMethod` + `paymentReference` and sets `paymentStatus = PAID` if the method is online and a reference is supplied. No payment row or provider verification is required.

**Change:**
- [ ] Remove `paymentReference` from `CreateBookingDto` (with `forbidNonWhitelisted`, clients sending it get `400`).
- [ ] Remove the `isOnlinePaid` branch from `BookingsService.create()`.
- [ ] Booking creation rules:
  - online methods → `paymentStatus = PENDING`, `paidAt = null`
  - `CASH_ON_ARRIVAL` → `paymentStatus = ON_ARRIVAL`, `paidAt = null`
- [ ] Only `PaymentsCaptureService.processCaptureSuccess()` may set `paymentStatus = PAID`.
- [ ] Add an audit script to find existing suspicious bookings:
  - `payment_status = 'PAID'`
  - no matching `payments` row with `status = 'SUCCEEDED'`
  - or payment amount ≠ booking total
- [ ] Produce a report; do not auto-delete suspicious records.

**Files:**
- `backend/src/modules/bookings/dto/create-booking.dto.ts`
- `backend/src/modules/bookings/bookings.service.ts`
- `backend/scripts/audit-payment-bypass.ts` (new)
- `backend/src/modules/bookings/bookings.service.spec.ts`

**Tests:**
- [ ] Sending `paymentReference` returns `400`.
- [ ] Sending `paymentMethod: CHAPA` without a reference creates a `PENDING` booking, not `PAID`.
- [ ] A booking can only become `PAID` after a successful capture.
- [ ] Audit script finds a seeded suspicious booking.

**Acceptance:** No API path other than verified capture can set `PAID`.

---

### SEC-02 — Harden the sandbox webhook

**Problem:** `POST /payments/webhook/SANDBOX` is public. The sandbox provider accepts `x-sandbox-signature: test-signature-bypass`, `sandbox_signature: test-signature-bypass`, or `bypass_signature: true` regardless of environment. With live capture off by default, a guest can forge a successful payment.

**Change:**
- [ ] Remove `test-signature-bypass` and `bypass_signature` acceptance outside `NODE_ENV === 'test'`.
- [ ] Require a real HMAC signature for sandbox events in all non-test environments.
- [ ] Add `SandboxWebhookGuard`:
  - production: `404` or `403` for `/payments/webhook/SANDBOX`
  - non-production: allowed only when `SANDBOX_WEBHOOKS_ENABLED=true`
- [ ] Replace the public “simulate” path with an authenticated, non-production endpoint:
  - `POST /payments/sandbox/complete` (JWT + non-production guard)
  - it calls the capture service directly or signs an internal event
- [ ] Update `/checkout/sandbox` to call that endpoint instead of posting a forgeable webhook.
- [ ] Ensure the real Chapa webhook is unaffected.

**Files:**
- `backend/src/modules/finance/providers/sandbox-payment.provider.ts`
- `backend/src/modules/payments/payments.controller.ts`
- `backend/src/modules/payments/payments.service.ts`
- `frontend/src/app/checkout/sandbox/page.tsx`
- `backend/src/config/env.validation.ts`
- tests for sandbox and Chapa webhook paths

**Tests:**
- [ ] Production rejects `bypass_signature`, `test-signature-bypass`, and unsigned events.
- [ ] Valid HMAC is accepted.
- [ ] Sandbox endpoint is unavailable in production.
- [ ] Sandbox checkout flow still works locally.

**Acceptance:** A guest cannot mark a payment successful without a valid signed event or a real provider capture.

---

### SEC-03 — Enforce booking ownership on payment sessions

**Problem:** `createPaymentSession()` loads a booking by ID but never checks `booking.guestId === user.id`.

**Change:**
- [ ] Add ownership check:
  - guest must own the booking
  - admins may act on any booking
  - everyone else gets `403`
- [ ] Reject sessions for `CANCELLED` or `COMPLETED` bookings.
- [ ] Reuse the same guard in `/payments/initialize` and any other session entry point.

**Files:** `backend/src/modules/finance/services/payments-capture.service.ts`, `backend/src/modules/payments/payments.controller.ts`.

**Tests:**
- [ ] User A cannot create a session for User B’s booking.
- [ ] Admin can.
- [ ] Cancelled/completed booking returns `400`.

**Acceptance:** Only the booking guest or an admin can initiate payment.

---

### SEC-04 — Validate webhook amount and currency

**Problem:** Capture uses `payment.amountMinor` and ignores the provider-reported amount/currency.

**Change:**
- [ ] Extend `WebhookVerificationResult` with `amountMinor?` and `currency?`.
- [ ] Parse and return amount/currency in:
  - `ChapaPaymentProvider.verifyWebhook()`
  - `SandboxPaymentProvider.verifyWebhook()`
- [ ] In `processCaptureSuccess()`:
  - if amount is present and ≠ `payment.amountMinor` → mark event `FAILED`, alert, throw
  - if currency is present and ≠ `payment.currency` → same
  - if amount is missing and `PAYMENTS_STRICT_VERIFICATION=true` → reject
- [ ] Add a metric/log `payment_amount_mismatch`.

**Files:** `backend/src/modules/finance/providers/payment-provider.interface.ts`, both providers, `payments-capture.service.ts`.

**Tests:**
- [ ] Underpayment is rejected.
- [ ] Overpayment is rejected.
- [ ] Currency mismatch is rejected.
- [ ] Correct amount succeeds.

**Acceptance:** Capture never trusts a mismatched provider event.

---

### SEC-05 — One active session, one successful payment per booking

**Problem:** Multiple sessions can be created for one booking. A second successful provider charge can hit the unique commission snapshot and roll back, leaving a real double charge unrecorded.

**Change:**
- [ ] Add `expiresAt` to `Payment`; default TTL 30 minutes.
- [ ] Add a partial unique index:
  - one `INITIATED`/`PENDING` payment per booking
  - one `SUCCEEDED` payment per booking
- [ ] In `createPaymentSession()`:
  - lock the booking row (`pessimistic_write`)
  - if an active unexpired session exists, return it (store `checkoutUrl`/`sessionId` in `payment.metadata`)
  - if an expired session exists, mark it `EXPIRED` and create a new one
- [ ] Add a cleanup job that marks stale sessions `EXPIRED`.
- [ ] In capture:
  - lock the booking
  - if the booking is already `PAID` by another payment, mark the event `IGNORED`, alert, and do not capture
- [ ] Before adding the unique indexes, resolve existing duplicates with an audit script.

**Files:** `payments-capture.service.ts`, `payment.entity.ts`, new migration, `finance-jobs.service.ts`.

**Tests:**
- [ ] Concurrent session requests return one active session.
- [ ] Expired session can be replaced.
- [ ] Second capture is ignored and alerted.
- [ ] Unique indexes hold.

**Acceptance:** A booking cannot accumulate multiple active or successful payments.

---

## 7. Phase 2 — Booking & listing correctness (6–8 days)

### HOST-01 — Enforce real host verification

**Problem:** `createHostProfile()` sets `VERIFIED` immediately. The verification workflow and UI states are effectively dead.

**Change:**
- [ ] Change new profiles to `HostVerificationStatus.UNVERIFIED`.
- [ ] Keep existing `VERIFIED` hosts grandfathered; add an audit note.
- [ ] Ensure `requestVerification()` is reachable from the host onboarding UI.
- [ ] Block listing submission/publishing with a clear error until `VERIFIED` (when `HOST_VERIFICATION_REQUIRED=true`).
- [ ] Ensure booking creation already blocks unverified hosts (it does).
- [ ] Verify the admin UI exposes `/admin/host-verifications` list/approve/reject/revoke.
- [ ] Add notification on approval/rejection.

**Files:** `backend/src/modules/host/host.service.ts`, `host.controller.ts`, `frontend/src/app/become-a-host/page.tsx`, admin host-verification UI.

**Tests:**
- [ ] New host is `UNVERIFIED`.
- [ ] Unverified host cannot publish.
- [ ] Admin approval makes the host bookable.
- [ ] Revoke blocks new bookings.

**Acceptance:** New hosts go through review; existing hosts are unaffected.

---

### PRICE-01 — Single server-side pricing quote

**Problem:** Property page shows `nightly × nights + 750 cleaning + 12% service fee`; backend charges only `nightly × nights`. Payment uses the backend total.

**Change:**
- [ ] Add `cleaningFee` to `Property` (numeric, default 0) and to create/update listing DTOs.
- [ ] Add cleaning fee to the host listing wizard and live preview.
- [ ] Create `PricingService` with one `quote()` method:
  - inputs: property, room, check-in/out, guests, coupon
  - outputs: nights, nightly rate, subtotal, cleaning fee, service fee/commission, discount, tax, total, currency, breakdown
- [ ] Use `finance.commission_rate_bps` or the agreed D3 rate as the source of truth.
- [ ] Add `POST /bookings/quote` (authenticated) or `GET /properties/:id/quote`.
- [ ] Booking creation calls `PricingService.quote()` inside the same transaction and stores:
  - `totalPrice`
  - `priceBreakdown` (new JSONB column)
  - `quoteVersion`
- [ ] Payment session continues to use `booking.totalPrice`; add an assertion that it matches the stored breakdown.
- [ ] Frontend property page and checkout consume the quote endpoint; remove duplicated math.
- [ ] Backfill existing bookings with a legacy breakdown (`subtotal = totalPrice`, fees 0).

**Files:**
- `backend/src/modules/properties/entities/property.entity.ts`
- `backend/src/modules/host/dto/create-host-listing.dto.ts`
- `backend/src/modules/bookings/dto/create-booking.dto.ts`
- `backend/src/modules/pricing/pricing.service.ts` (new)
- `backend/src/modules/bookings/bookings.service.ts`
- `frontend/src/app/properties/[id]/page.tsx`
- `frontend/src/app/checkout/[id]/page.tsx`
- `frontend/src/app/host/listings/new/page.tsx`
- migration for `properties.cleaning_fee` and `bookings.price_breakdown`

**Tests:**
- [ ] Quote matches booking total.
- [ ] Quote matches payment amount.
- [ ] Cleaning fee is property-specific.
- [ ] Rounding is consistent in minor units.
- [ ] Legacy booking backfill renders correctly.

**Acceptance:** One quote endpoint is the only source of price truth.

---

### PRICE-02 — Wire or remove coupons

**Problem:** `Booking` has `couponCode`, and a coupons module exists, but booking creation never applies coupons.

**Change (recommended: wire):**
- [ ] Add `couponCode` to quote and booking DTOs.
- [ ] Validate coupon through the existing coupon service.
- [ ] Apply discount in `PricingService`.
- [ ] Create `CouponRedemption` inside the booking transaction.
- [ ] Increment `redemptionsCount` atomically.
- [ ] Handle concurrent redemption with a unique constraint/transaction.
- [ ] Show the discount line in the quote and checkout.

**Alternative:** remove coupon fields and UI if coupons are not a current product requirement.

**Tests:** valid, expired, minimum-spend, per-user-limit, max-discount, concurrent redemption.

**Acceptance:** Coupons either work end-to-end or no dead fields remain.

---

### PAY-01 — Persist the selected payment method

**Problem:** Active checkout creates the booking with default `CASH_ON_ARRIVAL`, then pays online. Capture sets `PAID` but never updates `booking.paymentMethod`.

**Change:**
- [ ] On `createPaymentSession()`, set `booking.paymentMethod = dto.paymentMethod` and `paymentStatus = PENDING` (if not already paid).
- [ ] On capture, set `booking.paymentMethod = payment.method` again.
- [ ] Backfill existing `PAID` bookings from their latest successful payment.
- [ ] Show the method on guest/host booking views.

**Files:** `payments-capture.service.ts`, `bookings.service.ts`, migration/backfill script.

**Tests:**
- [ ] Online payment updates the booking method.
- [ ] Cash bookings remain `ON_ARRIVAL`.
- [ ] Host reservation view shows the correct method.

**Acceptance:** `booking.paymentMethod` always matches the actual payment.

---

### BOOK-02 — Make confirmation semantics explicit

**Problem:** Payment success UI says “confirmed”, but the booking remains `PENDING` until the host confirms. There is no instant-book path.

**Change:**
- [ ] Add `instantBook` to `Property` (default from `bookings.instant_book_default`, otherwise `false`).
- [ ] Expose it in the host listing DTO/wizard and public property response.
- [ ] If `instantBook = true`, capture transitions `PENDING → CONFIRMED` atomically (or immediately after capture) with history + notifications.
- [ ] If `instantBook = false`, keep `PENDING` and show “Request sent — awaiting host confirmation”.
- [ ] Update the success page to render the actual booking status.
- [ ] Optional: add a request-expiry job (e.g. 24h) that cancels stale `PENDING` requests and notifies both parties.

**Files:** `property.entity.ts`, `host` DTOs, `payments-capture.service.ts`, `bookings.service.ts`, `frontend/src/app/checkout/[id]/success/page.tsx`, host listing wizard.

**Tests:**
- [ ] Instant-book property → `CONFIRMED` after capture.
- [ ] Request-to-book property → stays `PENDING`.
- [ ] Success page copy matches status.
- [ ] History and notifications are written in both cases.

**Acceptance:** No UI claim contradicts the booking state.

---

### BOOK-03 — Wire cancellation to policy and refunds

**Problem:** Guest cancellation only sets `CANCELLED`; it does not create a cancellation request, evaluate policy, or propose a refund.

**Change:**
- [ ] Add guest endpoint `POST /bookings/:id/cancellation-requests` with a reason.
- [ ] On request:
  - compute `previewCancellationPolicy()`
  - store `CancellationRequest` with requested refund amount
  - keep the booking active until admin decision (recommended)
- [ ] On admin approve:
  - set booking `CANCELLED`
  - create `Refund` in `PENDING_APPROVAL` for the policy amount (if paid)
  - notify guest/host
  - require a different admin for refund approval (four-eyes)
- [ ] On admin reject:
  - keep booking active
  - notify guest with reason
- [ ] Host cancellation: immediate `CANCELLED` + full refund request.
- [ ] Unpaid cancellation: immediate `CANCELLED`, no refund.
- [ ] Add a guest UI state for “Cancellation requested”.
- [ ] Ensure availability is released/updated consistently.

**Files:** `bookings.controller.ts`, `bookings.service.ts`, `cancellation-request.entity.ts`, `cancellation-policy.service.ts`, `refunds.service.ts`, admin bookings controller/service, guest dashboard.

**Tests:**
- [ ] Flexible/moderate/strict policy amounts.
- [ ] Paid vs unpaid bookings.
- [ ] Host cancellation refunds 100%.
- [ ] Rejected request keeps the booking.
- [ ] Double cancellation is idempotent.

**Acceptance:** Every paid cancellation produces a policy-correct refund request.

---

### BOOK-04 — One booking state service

**Problem:** `BookingsService.updateStatus()` writes history and notifies both parties; `HostService.changeReservationStatus()` duplicates the transition logic but skips history and guest notifications.

**Change:**
- [ ] Extract `BookingStateService` (or reuse `BookingsService.updateStatus`) with:
  - authorization (guest/host/admin)
  - transition validation
  - completion-date check
  - optimistic update
  - status history
  - notifications to both parties
  - side effects (cancellation/refund/instant confirm)
- [ ] Make host reservation actions call it.
- [ ] Remove duplicate transition maps.
- [ ] Add audit records for admin actions.

**Files:** `backend/src/modules/bookings/bookings.service.ts`, `backend/src/modules/host/host.service.ts`, new `booking-state.service.ts`.

**Tests:**
- [ ] Host confirm writes history and notifies guest.
- [ ] Host complete writes history and notifies guest.
- [ ] Host cancel writes history and notifies guest.
- [ ] Invalid transitions are rejected consistently.

**Acceptance:** All booking transitions have the same audit/notification behavior.

---

## 8. Phase 3 — Finance hardening (4–6 days)

### FIN-01 — Align escrow release with the policy

**Problem:** `releaseEligibleAt = capture + 24h`, but release also requires `COMPLETED`. Auto-release is off by default. UI/docs imply a different trigger.

**Change:**
- [ ] Implement `escrowReleaseTrigger` values:
  - `CHECKOUT_PLUS_24H` (recommended default)
  - `CHECK_IN_PLUS_24H`
  - `COMPLETED_PLUS_24H`
- [ ] Compute eligibility from booking dates, not only capture time.
- [ ] Keep the no-open-dispute check.
- [ ] Set `autoReleaseEnabled = true` in production after UAT.
- [ ] Add a stuck-escrow alert for holds eligible > 24h.
- [ ] Update the finance runbook and UI copy.

**Files:** `escrow.service.ts`, `finance-settings.service.ts`, `docs/runbooks/finance-ops.md`.

**Tests:** each trigger mode, dispute freeze, cancelled booking, already-refunded hold.

**Acceptance:** Release timing matches the configured and documented policy.

---

### FIN-02 — Schedule daily payouts

**Problem:** `runDailyPayoutJob()` exists but is not scheduled. Only escrow release runs periodically.

**Change:**
- [ ] Add a scheduler in `FinanceJobsService`:
  - every 60 seconds, check `Africa/Addis_Ababa` time
  - if `payoutSchedule = DAILY_0200_ADDIS` and now ≥ 02:00 and no successful `daily_payout` run today → run the job
  - advisory lock + `JobRun` prevent duplicates
- [ ] Alternatively add `@nestjs/schedule` and a cron with `timeZone: 'Africa/Addis_Ababa'`.
- [ ] Keep the admin manual trigger.
- [ ] Add job-run visibility/alerts.

**Files:** `finance-jobs.service.ts`, `job-run.entity.ts`, admin finance UI.

**Tests:** scheduler triggers once per day; manual trigger still works; lock prevents double runs.

**Acceptance:** Payout batches generate automatically at the configured time.

---

### FIN-03 — Post VAT and withholding correctly

**Problem:** Capture creates a VAT `TaxLine` but the ledger credits the full commission to revenue. Withholding is configured but never applied.

**Change:**
- [ ] Add ledger accounts:
  - `2100 VAT_PAYABLE`
  - `2110 WITHHOLDING_PAYABLE`
- [ ] At release, split the commission:
  - credit `4010 PLATFORM_COMMISSION_REVENUE` = commission − VAT
  - credit `2100 VAT_PAYABLE` = VAT
  - credit `2110 WITHHOLDING_PAYABLE` = withholding (if configured)
  - credit host payable = gross − commission − withholding
- [ ] Ensure debits = credits.
- [ ] Reconcile `tax_lines` to ledger entries.
- [ ] Get finance/accounting sign-off on the treatment.

**Files:** `escrow.service.ts`, `ledger.service.ts`, `tax-line.entity.ts`, `finance-settings.service.ts`, ledger tests.

**Tests:** VAT-only, withholding-only, both, zero rates; invariant check passes.

**Acceptance:** Ledger and tax lines agree; invariant check is green.

---

### FIN-04 — Reconciliation and monitoring jobs

**Problem:** Reconciliation and invariant jobs exist but are not consistently scheduled; finance failures may go unnoticed.

**Change:**
- [ ] Schedule nightly `runInvariantCheckJob()`.
- [ ] Schedule daily reconciliation.
- [ ] Alert on:
  - ledger imbalance
  - booking paid without successful payment
  - duplicate capture attempts
  - stuck escrow
  - payout/refund failures
- [ ] Add an admin finance health panel if missing.

**Files:** `finance-jobs.service.ts`, `reconciliation.service.ts`, `ledger.service.ts`, admin finance UI.

**Acceptance:** Finance anomalies are detected and surfaced automatically.

---

## 9. Phase 4 — Cleanup, UX, and documentation (2–3 days)

### CLN-01 — Remove or update orphaned booking components

- [ ] Confirm `PropertyBookingWidget` and `BookingCheckoutModal` have no imports.
- [ ] Delete them, or refactor them to use the new quote/checkout flow if they are intended for future use.
- [ ] Remove related dead types/helpers.

**Files:** `frontend/src/components/booking/BookingCheckoutModal.tsx`, `frontend/src/components/property-details/PropertyBookingWidget.tsx`.

### CLN-02 — Remove legacy Express/Prisma code

- [ ] Audit imports of `backend/src/routes/*`, `backend/src/lib/prisma.ts`, and `backend/prisma/schema.prisma`.
- [ ] Delete if unused.
- [ ] Keep any seed scripts that are still used; update their imports.
- [ ] Update `README.md` and `docs/architecture/SYSTEM-OVERVIEW.md`.

### CLN-03 — Remove dead international payment methods

- [ ] Remove PayPal/Wise/international card from the active checkout UI.
- [ ] Either remove them from `PaymentMethod` or mark them disabled behind a feature flag.
- [ ] Keep the backend enum only if a future provider integration is planned.

### CLN-04 — Fix misleading UI copy

- [ ] “You won’t be charged yet” → “You’ll be redirected to secure checkout” (or remove).
- [ ] “Reservation confirmed” → conditional on `booking.status`.
- [ ] “24 hours after check-in” → match the configured escrow trigger.
- [ ] “Host will confirm within 2 hours” → “Host typically responds within 2 hours” or add an SLA.
- [ ] “Includes taxes and platform service fee” → show the actual breakdown from the quote.

### CLN-05 — Documentation

- [ ] Add state diagrams for listing, booking, payment, escrow, payout.
- [ ] Update `docs/runbooks/finance-ops.md` with the new triggers, schedules, and refund flow.
- [ ] Document the quote endpoint and price breakdown.
- [ ] Document sandbox behavior and production restrictions.
- [ ] Add an API changelog for removed/renamed DTO fields.

---

## 10. Database migrations

Use expand/contract. Do not combine schema changes and destructive backfills in one deploy.

### 10.1 New columns

| Table | Column | Type | Notes |
|---|---|---|---|
| `properties` | `cleaning_fee` | numeric(12,2) | default 0 |
| `properties` | `instant_book` | boolean | default from setting |
| `bookings` | `price_breakdown` | jsonb | nullable initially |
| `bookings` | `quote_version` | varchar(20) | nullable initially |
| `payments` | `expires_at` | timestamptz | nullable initially |

### 10.2 Indexes

```sql
-- One active session per booking
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_payments_active_booking
ON payments (booking_id)
WHERE status IN ('INITIATED', 'PENDING');

-- One successful payment per booking
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_payments_success_booking
ON payments (booking_id)
WHERE status = 'SUCCEEDED';
```

Before creating these, run an audit and resolve duplicates:
- expire stale active sessions
- identify duplicate successful payments
- keep the legitimate capture, mark duplicates for manual review

> **Migration note:** `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. Use a TypeORM migration with `transaction = false`, or create the indexes non-concurrently during a maintenance window. Test both paths on staging before production.

### 10.3 Backfills

- [ ] `bookings.price_breakdown` for existing rows:
  `{ "subtotal": totalPrice, "cleaningFee": 0, "serviceFee": 0, "discount": 0, "total": totalPrice, "legacy": true }`
- [ ] `bookings.payment_method` from the latest successful `payments.method` for `PAID` bookings.
- [ ] Host profiles: leave existing `VERIFIED`; new default is `UNVERIFIED` at the application layer.
- [ ] Suspicious `PAID` bookings: report, do not silently mutate.

### 10.4 Migration files

Suggested names (timestamps are placeholders; use the current epoch):

- `1756000000000-PaymentSecurityHardening.ts`
- `1756000001000-PricingQuoteV2.ts`
- `1756000002000-BookingLifecycleV2.ts`
- `1756000003000-FinanceLedgerTax.ts`

Each migration must have a working `down()`.

---

## 11. Test plan

### 11.1 Unit tests

- [ ] `PricingService`: nights, cleaning, service fee, discount, rounding, currency.
- [ ] Booking state machine: every allowed/blocked transition.
- [ ] Cancellation policy: flexible/moderate/strict, boundary hours.
- [ ] Webhook verification: valid/invalid signatures, amount/currency mismatch.
- [ ] Escrow release: trigger modes, dispute freeze, refunded hold.
- [ ] Ledger: VAT/withholding splits, debits = credits.
- [ ] Payout scheduler: once-per-day behavior.

### 11.2 Integration/API tests

- [ ] `POST /bookings` cannot set `PAID`.
- [ ] `POST /payments/sessions` enforces ownership and one active session.
- [ ] Sandbox bypass rejected in production.
- [ ] Capture rejects amount/currency mismatch.
- [ ] Instant-book capture confirms; request-to-book stays pending.
- [ ] Host confirm/complete/cancel writes history and notifies guest.
- [ ] Guest cancellation creates a policy-correct refund request.
- [ ] Host cancellation creates a full refund.
- [ ] Escrow release and payout produce a balanced ledger.

### 11.3 Security tests

- [ ] Forged sandbox webhook in production.
- [ ] Payment session for another user’s booking.
- [ ] Booking with arbitrary `paymentReference`.
- [ ] Underpayment/overpayment.
- [ ] Duplicate capture for one booking.
- [ ] Unverified host publish/booking.

### 11.4 E2E / manual

- [ ] Host: create listing → submit → admin approve → public visibility.
- [ ] Guest: search → property → dates → checkout → sandbox pay → success.
- [ ] Host: confirm → complete.
- [ ] Finance: escrow release → payout batch → approve → execute.
- [ ] Guest: cancellation request → admin approve → refund.

If feasible, add Playwright for the three critical flows. Otherwise, keep a written manual QA checklist in this document.

---

## 12. Rollout plan

### 12.1 Environments

1. Local
2. Staging (production-like data volume)
3. Production

### 12.2 Order

1. Deploy Phase 0 migrations and flags (all off).
2. Deploy Phase 1 backend with `PAYMENTS_STRICT_VERIFICATION=true`.
3. Enable strict mode in staging; run security tests.
4. Enable in production; monitor 24–48h.
5. Deploy Phase 2 with `PRICING_QUOTE_V2=false`; enable per environment.
6. Enable host verification for new hosts only.
7. Enable instant book per property (start with a pilot set).
8. Deploy Phase 3 finance changes; enable auto-release and payout schedule after UAT.
9. Deploy Phase 4 cleanup.

### 12.3 Feature-flag defaults

| Flag | Local | Staging | Production |
|---|---|---|---|
| `PAYMENTS_STRICT_VERIFICATION` | true | true | true |
| `SANDBOX_WEBHOOKS_ENABLED` | true | true | false |
| `HOST_VERIFICATION_REQUIRED` | false | true | true |
| `PRICING_QUOTE_V2` | true | true | true after UAT |
| `INSTANT_BOOK_ENABLED` | true | true | per-property pilot |
| `autoReleaseEnabled` | false | true | true after UAT |

### 12.4 Rollback

- Turn off the relevant feature flag.
- Revert the deploy; keep additive columns for one release.
- Do not drop columns/indexes in the same release as the code change.
- Keep the audit report for any suspicious `PAID` bookings.

---

## 13. Monitoring and alerts

| Signal | Threshold | Action |
|---|---|---|
| Webhook signature failures | > 5/min | page on-call |
| Amount/currency mismatch | any | page finance + engineering |
| Booking `PAID` without successful payment | any | page engineering |
| Duplicate capture attempt | any | page finance |
| Escrow hold eligible > 24h | any | notify finance |
| Payout job failure | any | notify finance |
| Refund pending > 48h | any | notify finance |
| Ledger invariant failure | any | page engineering + finance |

Add dashboards for:
- payment funnel (session → capture → escrow → release → payout)
- booking funnel (pending → confirmed → completed)
- cancellation/refund queue
- host verification queue

---

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Chapa webhook may not include amount | Use Chapa verify API server-side; fail closed if amount unavailable in strict mode |
| Host verification reduces supply | Grandfather existing hosts; communicate; provide fast admin review SLA |
| Pricing change affects conversion | Pilot with a subset; monitor conversion and support tickets |
| Auto-confirm changes host obligations | Product/legal review; per-property opt-in |
| VAT/withholding treatment is wrong | Finance/accounting sign-off; ledger invariant tests |
| Migration locks large tables | Use `CONCURRENTLY` for indexes; expand/contract |
| Removing legacy code breaks scripts | Audit imports first; keep seeds if used |
| Sandbox disabled breaks local dev | Keep sandbox enabled locally with signed events; document |

---

## 15. Effort and sequencing

### 15.1 Estimate

| Phase | Estimate |
|---|---|
| Phase 0 — Safety net | 1–2 days |
| Phase 1 — P0 payment security | 4–6 days |
| Phase 2 — Booking/listing correctness | 6–8 days |
| Phase 3 — Finance hardening | 4–6 days |
| Phase 4 — Cleanup/UX/docs | 2–3 days |
| QA + staged rollout | 3–5 days |
| **Total** | **20–30 engineer-days** |

For one engineer: ~4–6 weeks.  
With one backend + one frontend engineer in parallel: ~2–3 weeks plus QA.

### 15.2 Critical path

```
SEC-01 → SEC-02 → SEC-03/SEC-04 → SEC-05
      → PRICE-01 → PAY-01 → BOOK-02 → BOOK-03
      → FIN-01 → FIN-02 → FIN-03 → FIN-04
```

### 15.3 Parallelizable

- HOST-01 (backend + admin UI)
- CLN-01/02/03/04 (cleanup/UI copy)
- Documentation
- Test harness setup

---

## 16. Definition of done

- [ ] A booking cannot become `PAID` except through a verified capture.
- [ ] Sandbox bypass is impossible in production.
- [ ] Payment sessions are ownership-checked and single-active.
- [ ] Webhook amount/currency is validated.
- [ ] New hosts are verified through admin review.
- [ ] Property page quote = booking total = payment amount.
- [ ] Payment method is persisted on the booking.
- [ ] Instant book vs request-to-book is explicit in the API and UI.
- [ ] Cancellation produces a policy-correct refund request.
- [ ] All booking transitions write history and notify both parties.
- [ ] Escrow release and payout schedule match the documented policy.
- [ ] VAT/withholding ledger entries balance.
- [ ] Orphaned components and legacy routes are removed.
- [ ] Misleading UI copy is corrected.
- [ ] Security regression tests pass.
- [ ] Staging UAT sign-off by product + finance.
- [ ] Runbook and architecture docs updated.

---

## Appendix A — Target state machines

### Listing

```
DRAFT ──submit──► REVIEW_PENDING ──approve──► PUBLISHED
  │                    │                         │
  │                    └──reject──► DRAFT        ├──pause──► PAUSED
  │                                              │            │
  └──────────────────────────────────────────────┴──archive──► ARCHIVED
                                                       (sale only) ──► SOLD
```

### Booking

```
PENDING ──host confirm──► CONFIRMED ──host complete──► COMPLETED
   │                          │
   ├──guest/host cancel───────┴──► CANCELLED
   │
   └──instant book capture──► CONFIRMED
```

### Payment

```
INITIATED ──provider success──► SUCCEEDED
    │
    ├──provider failure──► FAILED
    ├──timeout───────────► EXPIRED
    └──guest abandons────► CANCELLED
```

### Escrow

```
HELD ──release──► RELEASED
  │
  ├──partial refund──► PARTIALLY_REFUNDED
  ├──full refund─────► REFUNDED
  └──dispute─────────► FROZEN ──resolve──► HELD
```

### Payout

```
DRAFT ──approve──► APPROVED ──execute──► PROCESSING ──success──► PAID
  │                    │                       │
  └──reject──► REJECTED└──reject──► REJECTED   └──failure──► FAILED ──retry──► PROCESSING
```

---

## Appendix B — Endpoint changes

### New/changed guest endpoints

| Method | Path | Change |
|---|---|---|
| POST | `/bookings` | `paymentReference` removed; online methods create `PENDING`, never `PAID` |
| POST | `/bookings/quote` | New; returns server price breakdown |
| POST | `/bookings/:id/cancellation-requests` | New; creates a policy-evaluated cancellation request |
| POST | `/payments/sessions` | Ownership check, single active session, expiry |
| POST | `/payments/sandbox/complete` | New; authenticated non-production sandbox completion |
| GET | `/payments/sessions/:id` | Unchanged owner check |

### Changed host/admin endpoints

| Method | Path | Change |
|---|---|---|
| POST | `/host/profile` | New profile is `UNVERIFIED` |
| POST | `/host/profile/request-verification` | Reachable and documented |
| PATCH | `/host/reservations/:id/*` | Uses the shared booking state service; history + guest notifications |
| POST | `/admin/host-verifications/:id/approve` | Existing; now actually required for new hosts |
| POST | `/admin/finance/payouts/batch` | Still available; also scheduled |
| POST | `/admin/bookings/:id/cancellation-requests/:requestId/approve` | Creates refund request on approval |

### Removed/deprecated

| Path | Reason |
|---|---|
| `backend/src/routes/*` | Legacy Express, not mounted |
| `backend/prisma/schema.prisma` | Legacy Prisma schema, not used by Nest runtime |
| `POST /payments/webhook/SANDBOX` (production) | Forgeable sandbox path; replaced by authenticated sandbox completion |

---

## Appendix C — Audit queries

### Suspicious paid bookings

```sql
SELECT b.id, b.reference, b.total_price, b.payment_reference, b.paid_at
FROM bookings b
WHERE b.payment_status = 'PAID'
  AND NOT EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.booking_id = b.id
      AND p.status = 'SUCCEEDED'
      AND p.amount_minor = (b.total_price * 100)::bigint
  );
```

### Duplicate successful payments per booking

```sql
SELECT booking_id, COUNT(*) AS successes
FROM payments
WHERE status = 'SUCCEEDED'
GROUP BY booking_id
HAVING COUNT(*) > 1;
```

### Duplicate active sessions per booking

```sql
SELECT booking_id, COUNT(*) AS active_sessions
FROM payments
WHERE status IN ('INITIATED', 'PENDING')
GROUP BY booking_id
HAVING COUNT(*) > 1;
```

### Stuck escrow holds

```sql
SELECT id, booking_id, amount_minor, release_eligible_at
FROM escrow_holds
WHERE status = 'HELD'
  AND release_eligible_at < now() - interval '24 hours';
```

---

## Appendix D — Open questions

1. Is the 12% guest service fee in addition to the 15% host commission, or is one replacing the other? (D3)
2. Should `instantBook` default to on or off for new listings? (D1)
3. Should existing hosts be grandfathered as `VERIFIED`, or re-reviewed? (D2)
4. Is the escrow trigger check-in + 24h or checkout + 24h? (D5)
5. Should cancellation approval and refund approval require different admins? (D6)
6. Are coupons and international payments in scope for this release? (D7)
7. Who signs off on VAT/withholding accounting? (FIN-03)
