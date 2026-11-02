# Engida API Documentation

**Version**: 1.0.0  
**Base URL**: `http://localhost:3000` (Development) | `https://api.engida.com` (Production)

Complete REST API reference for the Engida property marketplace platform.

---

## Table of Contents

- [Authentication](#authentication)
- [Properties](#properties)
- [Host Management](#host-management)
- [Bookings](#bookings)
- [Payments](#payments)
- [Reviews](#reviews)
- [AI Services](#ai-services)
- [Catalog](#catalog)
- [Content](#content)
- [Admin APIs](#admin-apis)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

### Overview
Engida uses JWT-based authentication with access tokens and HttpOnly refresh tokens.

**Access Token**: Short-lived (15 minutes), sent in Authorization header  
**Refresh Token**: Long-lived (7 days), stored as HttpOnly cookie

### Headers
```
Authorization: Bearer <access_token>
```

### Endpoints

#### POST /auth/register
Register new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "GUEST",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### POST /auth/login
Authenticate and receive tokens.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK` + Sets `refreshToken` cookie
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "GUEST"
  }
}
```

---

#### POST /auth/refresh
Refresh access token.

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### POST /auth/logout
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

#### GET /auth/me
Get current user profile.

**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "GUEST",
  "adminRole": null,
  "permissions": [],
  "avatar": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "hostProfile": null
}
```

---

#### Google OAuth Flow

**GET /auth/google**  
Initiates Google OAuth flow. Query param: `next` (optional redirect path)

**GET /auth/google/callback**  
OAuth callback (internal use)

---

#### OTP Verification

**POST /auth/otp/send**
```json
{
  "phone": "+251911234567",
  "purpose": "VERIFICATION"
}
```

**POST /auth/otp/verify**
```json
{
  "phone": "+251911234567",
  "code": "123456"
}
```

**GET /auth/otp/status**  
Check OTP service availability

---

## Properties

### GET /properties
Search properties (public).

**Query Parameters:**
- `search` - Search term
- `category` - Property category
- `city` - City filter
- `minPrice`, `maxPrice` - Price range
- `bedrooms`, `bathrooms` - Room counts
- `amenities` - Comma-separated amenity IDs
- `page`, `limit` - Pagination

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Luxury Penthouse in Bole",
      "type": "RENTAL",
      "category": "APARTMENT",
      "pricePerNight": 150,
      "currency": "ETB",
      "bedrooms": 3,
      "bathrooms": 2,
      "maxGuests": 6,
      "address": {
        "city": "Addis Ababa",
        "region": "Addis Ababa"
      },
      "coverImage": "https://...",
      "rating": 4.8,
      "reviewCount": 42
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### GET /properties/:id
Get property details (public).

**Response:** `200 OK` - Complete property object with rooms, amenities, host info, reviews summary

---

### GET /properties/:id/related
Get similar properties.

---

### GET /properties/my/listings
**Auth Required:** Yes

Get current user's property listings.

---

### PUT /properties/:id
**Auth Required:** Yes (Owner/Admin)

Update property. For published listings, major changes trigger moderation review.

---

### POST /properties/:id/cover-image
**Auth Required:** Yes  
**Content-Type:** `multipart/form-data`

Upload cover image (max 10MB).

---

### POST /properties/:id/images
**Auth Required:** Yes  
**Content-Type:** `multipart/form-data`

Upload gallery images (up to 10, max 10MB each).

---

### DELETE /properties/:id/images
**Auth Required:** Yes

Remove gallery image.

**Request:**
```json
{
  "imageUrl": "https://..."
}
```

---

### POST /properties/:id/rooms
**Auth Required:** Yes

Add room to property.

**Request:**
```json
{
  "name": "Master Bedroom",
  "roomType": "BEDROOM",
  "bedType": "QUEEN",
  "bedCount": 1,
  "privateBathroom": true
}
```

---

### GET /properties/:id/availability-blocks
Get blocked dates (public).

---

### POST /properties/:id/availability-blocks
**Auth Required:** Yes

Block dates from bookings.

---

### DELETE /properties/:id/availability-blocks/:blockId
**Auth Required:** Yes

Remove availability block.

---

## Host Management

Complete host workflow including profile management, listings, reservations, earnings, and payouts.

### Profile Management

**GET /host/profile** - Get host profile  
**POST /host/profile** - Create host profile (become a host)  
**PUT /host/profile** - Update host profile  
**POST /host/profile/request-verification** - Request identity verification  
**GET /host/verification/audit** - View verification audit trail

### Listings

**GET /host/listings** - List own listings  
**POST /host/listings** - Create new listing (starts as DRAFT)  
**GET /host/listings/:id** - Get listing details  
**PUT /host/listings/:id** - Update listing  
**POST /host/listings/:id/submit-review** - Submit for admin review  
**POST /host/listings/:id/withdraw-review** - Withdraw review submission  
**GET /host/listings/:id/reviews** - View review status  
**PATCH /host/listings/:id/publish** - Publish listing  
**PATCH /host/listings/:id/pause** - Pause listing  
**PATCH /host/listings/:id/archive** - Archive listing  
**PATCH /host/listings/:id/mark-sold** - Mark as sold (SALE type only)

### Listing Rooms

**POST /host/listings/:id/rooms** - Add room  
**PATCH /host/listings/:id/rooms/:roomId** - Update room  
**DELETE /host/listings/:id/rooms/:roomId** - Remove room

### Availability

**GET /host/listings/:id/availability** - Get availability  
**POST /host/listings/:id/availability** - Add block  
**DELETE /host/listings/:id/availability/:blockId** - Remove block

### Reservations

**GET /host/reservations** - List reservations  
**PATCH /host/reservations/:id/confirm** - Confirm reservation  
**PATCH /host/reservations/:id/complete** - Mark completed  
**PATCH /host/reservations/:id/cancel** - Cancel reservation

### Dashboard & Analytics

**GET /host/dashboard** - Dashboard summary  
**GET /host/earnings/summary** - Earnings aggregation  
**GET /host/earnings/transactions** - Transaction history

### Reviews

**GET /host/reviews/summary** - Review statistics  
**GET /host/reviews** - List reviews

### Payouts

**GET /host/payouts** - List payouts  
**GET /host/payouts/:id** - Payout details  
**GET /host/payouts/:id/statement** - Download statement  
**GET /host/payout-accounts** - List payout accounts  
**POST /host/payout-accounts** - Add payout account  
**PATCH /host/payout-accounts/:id** - Update account

---

## Bookings

### POST /bookings/quote
Get server-side price quote (public).

**Request:**
```json
{
  "propertyId": "uuid",
  "checkIn": "2024-12-20",
  "checkOut": "2024-12-25",
  "guests": 4
}
```

**Response:** `200 OK`
```json
{
  "nights": 5,
  "basePrice": 100,
  "subtotal": 500,
  "serviceFee": 50,
  "cleaningFee": 25,
  "taxes": 28.75,
  "totalPrice": 603.75,
  "currency": "ETB"
}
```

---

### POST /bookings
**Auth Required:** Yes

Create booking.

**Request:**
```json
{
  "propertyId": "uuid",
  "checkIn": "2024-12-20",
  "checkOut": "2024-12-25",
  "guests": 4,
  "message": "Looking forward to staying!"
}
```

---

### GET /bookings/my-bookings
**Auth Required:** Yes

Get user's bookings as guest.

---

### GET /bookings/host-reservations
**Auth Required:** Yes

Get reservations for hosted properties.

---

### GET /bookings/:id
**Auth Required:** Yes

Get booking details.

---

### PATCH /bookings/:id/status
**Auth Required:** Yes (Host/Admin)

Update booking status.

---

### POST /bookings/:id/cancellation-requests
**Auth Required:** Yes (Guest)

Request cancellation with policy evaluation.

**Request:**
```json
{
  "reason": "Change of plans"
}
```

**Response:**
```json
{
  "cancellationRequestId": "uuid",
  "status": "PENDING_ADMIN_APPROVAL",
  "refundAmount": 450,
  "penalty": 153.75,
  "policy": "MODERATE"
}
```

---

## Payments

### GET /payments/methods
Get supported payment methods.

**Response:**
```json
{
  "methods": [
    {
      "id": "CHAPA",
      "name": "Chapa",
      "currencies": ["ETB", "USD"],
      "types": ["CARD", "MOBILE"]
    },
    {
      "id": "TELEBIRR",
      "name": "TeleBirr",
      "currencies": ["ETB"]
    }
  ]
}
```

---

### POST /payments/sessions
**Auth Required:** Yes

Create payment session (Phase 3).

**Request:**
```json
{
  "bookingId": "uuid",
  "paymentMethod": "CHAPA",
  "currency": "ETB",
  "returnUrl": "https://example.com/confirm"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "checkoutUrl": "https://chapa.co/checkout/...",
  "expiresAt": "2024-01-01T01:00:00.000Z"
}
```

---

### GET /payments/sessions/:id
**Auth Required:** Yes

Check payment session status.

---

### POST /payments/webhook/:provider
Provider webhook endpoint (not for client use).

---

## Reviews

### GET /properties/:propertyId/reviews
Get property reviews (public).

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Amazing stay!",
      "guest": {
        "name": "Jane Doe",
        "avatar": "https://..."
      },
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "summary": {
    "averageRating": 4.8,
    "totalReviews": 42,
    "distribution": {
      "5": 30,
      "4": 10,
      "3": 2,
      "2": 0,
      "1": 0
    }
  }
}
```

---

### POST /properties/:propertyId/reviews
**Auth Required:** Yes (must have completed booking)

Submit review.

**Request:**
```json
{
  "rating": 5,
  "comment": "Amazing property!",
  "cleanliness": 5,
  "communication": 5,
  "accuracy": 5,
  "location": 5,
  "value": 5
}
```

---

### GET /properties/:propertyId/reviews/mine
**Auth Required:** Yes

Check if user has reviewed.

---

## AI Services

### POST /ai/predict-price
**Auth Required:** Yes

Get AI price prediction.

**Request:**
```json
{
  "city": "Addis Ababa",
  "category": "APARTMENT",
  "bedrooms": 2,
  "bathrooms": 1,
  "squareMeters": 80,
  "amenities": ["WIFI", "PARKING"]
}
```

**Response:**
```json
{
  "predictedPrice": 120,
  "confidence": 0.85,
  "priceRange": {
    "min": 100,
    "max": 140
  },
  "currency": "ETB"
}
```

---

### POST /ai/generate-listing-content
**Auth Required:** Yes

Generate AI listing content.

---

### POST /ai/recommendations
**Auth Required:** Yes

Get personalized recommendations.

---

### POST /ai/recommendations/feedback
**Auth Required:** Yes

Record recommendation feedback.

---

### GET /ai/health
Check AI service health.

---

## Catalog

### Public Endpoints

**GET /catalog/destinations** - List destinations (query: `featured`)  
**GET /catalog/categories** - List categories

### Admin Endpoints
**Permission:** `CATALOG_MANAGE`

**Categories:**
- GET /admin/catalog/categories
- POST /admin/catalog/categories
- PATCH /admin/catalog/categories/:id
- DELETE /admin/catalog/categories/:id

**Destinations:**
- GET /admin/catalog/destinations
- POST /admin/catalog/destinations
- PATCH /admin/catalog/destinations/:id
- DELETE /admin/catalog/destinations/:id

**Amenities:**
- GET /admin/catalog/amenities/categories
- GET /admin/catalog/amenities
- POST /admin/catalog/amenities
- PATCH /admin/catalog/amenities/:id
- DELETE /admin/catalog/amenities/:id

---

## Content

### Public Endpoints

**GET /content/faqs** - Get FAQs (query: `category`)  
**GET /content/blocks/:slug** - Get content block

### Admin Endpoints
**Permission:** `CONTENT_MANAGE`

**FAQs:**
- GET /admin/content/faqs/categories
- GET /admin/content/faqs
- POST /admin/content/faqs
- PATCH /admin/content/faqs/:id
- DELETE /admin/content/faqs/:id

**Content Blocks:**
- GET /admin/content/blocks
- GET /admin/content/blocks/:slug
- POST /admin/content/blocks
- PATCH /admin/content/blocks/:id
- DELETE /admin/content/blocks/:id

---

## Admin APIs

All admin endpoints require:
1. JWT authentication
2. Admin role
3. Specific permission

### Admin - Users
**Base:** `/admin`

- GET /admin/users - List users (**Permission:** `USERS_VIEW`)
- POST /admin/admins - Create admin (**Permission:** `ADMINS_MANAGE`)
- GET /admin/users/export.csv - Export CSV
- GET /admin/users/:id - User details
- PATCH /admin/users/:id/status - Update status (**Permission:** `USERS_MANAGE`)
- PATCH /admin/users/:id/admin-role - Update admin role (**Permission:** `ADMINS_MANAGE`)

### Admin - Listings & Moderation

**Listing Reviews:**
- GET /admin/reviews - Review queue (**Permission:** `LISTINGS_REVIEW`)
- GET /admin/reviews/stats - Queue stats
- GET /admin/reviews/:id - Review details
- POST /admin/reviews/:id/approve - Approve
- POST /admin/reviews/:id/reject - Reject

**Listing Management:**
- POST /admin/listings/:id/hide - Hide listing (**Permission:** `LISTINGS_HIDE`)
- GET /admin/listings/:id - Admin view
- POST /admin/listings/:id/restore - Restore listing
- GET /admin/listings/export.csv - Export

**Host Verification:**
- GET /admin/host-verifications - List requests (**Permission:** `HOSTS_VIEW`)
- POST /admin/host-verifications/:id/approve - Approve (**Permission:** `HOSTS_VERIFY`)
- POST /admin/host-verifications/:id/reject - Reject
- POST /admin/host-verifications/:id/revoke - Revoke
- GET /admin/host-verifications/:id/audit-trail - Audit trail

### Admin - Bookings
**Base:** `/admin/bookings`  
**Permission:** `BOOKINGS_VIEW` / `BOOKINGS_MANAGE`

- GET /admin/bookings - List bookings
- GET /admin/bookings/export.csv - Export
- GET /admin/bookings/availability - Check availability
- GET /admin/bookings/:id - Details
- GET /admin/bookings/:id/cancellation-preview - Preview refund
- POST /admin/bookings/:id/status - Update status
- POST /admin/bookings/:id/cancellation-requests - Record cancellation
- POST /admin/bookings/:id/cancellation-requests/:requestId/approve - Approve
- POST /admin/bookings/:id/cancellation-requests/:requestId/reject - Reject
- POST /admin/bookings/:id/availability-blocks - Create block
- DELETE /admin/bookings/availability-blocks/:blockId - Remove block

### Admin - Finance
**Base:** `/admin/finance`  
**Permissions:** `FINANCE_VIEW`, `FINANCE_REFUNDS`, `FINANCE_PAYOUTS`, `FINANCE_RECONCILE`, `FINANCE_CONFIG`

**Overview:**
- GET /admin/finance/summary - Financial summary

**Payments:**
- GET /admin/finance/payments
- GET /admin/finance/payments/:id

**Refunds:**
- GET /admin/finance/refunds
- GET /admin/finance/refunds/:id
- POST /admin/finance/refunds - Propose refund
- POST /admin/finance/refunds/:id/approve
- POST /admin/finance/refunds/:id/reject
- POST /admin/finance/refunds/:id/execute
- POST /admin/finance/refunds/:id/retry

**Payouts:**
- GET /admin/finance/payouts
- GET /admin/finance/payouts/:id
- POST /admin/finance/payouts/batch/generate
- POST /admin/finance/payouts/:id/approve
- POST /admin/finance/payouts/:id/reject
- POST /admin/finance/payouts/:id/execute
- POST /admin/finance/payouts/:id/retry

**Payout Accounts:**
- GET /admin/finance/payout-accounts
- POST /admin/finance/payout-accounts/:id/verify
- POST /admin/finance/payout-accounts/:id/reject

**Ledger:**
- GET /admin/finance/ledger/transactions
- GET /admin/finance/ledger/accounts

**Escrow:**
- GET /admin/finance/escrow-holds
- POST /admin/finance/escrow-holds/:id/release
- POST /admin/finance/escrow-holds/:id/freeze
- POST /admin/finance/escrow-holds/:id/unfreeze

**Reconciliation:**
- GET /admin/finance/reconciliation/issues
- POST /admin/finance/reconciliation/settlement-report
- POST /admin/finance/reconciliation/issues/:id/resolve

**Settings:**
- GET /admin/finance/settings
- PATCH /admin/finance/settings/:key

**Export:**
- GET /admin/finance/exports/:type.csv

### Admin - Cases
**Base:** `/admin/cases`  
**Permission:** `CASES_VIEW` / `CASES_MANAGE` / `CASES_COMPENSATE`

- GET /admin/cases - List cases
- GET /admin/cases/export.csv
- GET /admin/cases/assignees
- GET /admin/cases/canned-responses
- GET /admin/cases/metadata
- POST /admin/cases/canned-responses
- PATCH /admin/cases/canned-responses/:id
- POST /admin/cases/sla/sweep
- GET /admin/cases/:id
- POST /admin/cases - Create case
- PATCH /admin/cases/:id
- POST /admin/cases/:id/assign
- POST /admin/cases/:id/status
- POST /admin/cases/:id/messages
- POST /admin/cases/:id/inbound-replies
- POST /admin/cases/:id/notes
- POST /admin/cases/:id/attachments
- GET /admin/cases/:id/attachments/:attachmentId
- POST /admin/cases/:id/compensation
- POST /admin/cases/:id/compensation/approve
- POST /admin/cases/:id/compensation/reject

### Admin - Reports
**Base:** `/admin/reports`  
**Permission:** `REPORTS_VIEW` / `REPORTS_RESOLVE`

- GET /admin/reports
- GET /admin/reports/:id
- PATCH /admin/reports/:id/status

### Admin - Reviews
**Base:** `/admin/guest-reviews`  
**Permission:** `REVIEWS_VIEW` / `REVIEWS_MODERATE`

- GET /admin/guest-reviews
- GET /admin/guest-reviews/:id
- POST /admin/guest-reviews/:id/hide
- POST /admin/guest-reviews/:id/restore

### Admin - Analytics
**Base:** `/admin/analytics`  
**Permission:** `ANALYTICS_VIEW`

- GET /admin/analytics/overview
- GET /admin/analytics/export

### Admin - Audit Logs
**Base:** `/admin/audit-logs`  
**Permission:** `AUDIT_VIEW`

- GET /admin/audit-logs/facets
- GET /admin/audit-logs

### Admin - Settings
**Base:** `/admin/settings`  
**Permission:** `SETTINGS_VIEW` / `SETTINGS_MANAGE`

- GET /admin/settings
- PATCH /admin/settings

### Admin - Dashboard
**Base:** `/admin/dashboard`  
**Permission:** `DASHBOARD_VIEW`

- GET /admin/dashboard/summary/fast
- GET /admin/dashboard/summary

---

## Error Handling

### Standard Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes

- `200` - OK
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `410` - Gone (deprecated endpoint)
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

### Common Error Codes

- `AUTH_INVALID_CREDENTIALS` - Invalid email/password
- `AUTH_TOKEN_EXPIRED` - Access token expired
- `AUTH_REFRESH_TOKEN_INVALID` - Refresh token invalid
- `PERMISSION_DENIED` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Input validation failed
- `BOOKING_CONFLICT` - Dates already booked
- `PAYMENT_FAILED` - Payment processing failed
- `PROPERTY_NOT_AVAILABLE` - Property not available for booking

---

## Rate Limiting

**Default Limits:**
- Authentication endpoints: 5 requests / minute
- General API: 100 requests / minute
- Search endpoints: 30 requests / minute
- File uploads: 10 requests / hour

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640995200
```

**Rate Limit Response:** `429 Too Many Requests`
```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "retryAfter": 42
}
```

---

## Pagination

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response Meta:**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasMore": true
  }
}
```

---

## Webhooks

### Payment Webhooks

**Endpoint:** `POST /payments/webhook/:provider`

Providers: `CHAPA`, `TELEBIRR`

**Security:** Signature verification required

**Payload Example:**
```json
{
  "event": "payment.success",
  "tx_ref": "booking-uuid",
  "status": "success",
  "amount": 603.75,
  "currency": "ETB",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## File Uploads

**Supported Formats:**
- Images: JPG, PNG, WebP
- Documents: PDF (case attachments)

**Size Limits:**
- Property images: 10MB per file
- Case attachments: 10MB per file

**Content-Type:** `multipart/form-data`

---

## Best Practices

1. **Always use HTTPS** in production
2. **Store refresh tokens** securely (HttpOnly cookies)
3. **Implement retry logic** with exponential backoff
4. **Cache responses** where appropriate
5. **Validate on client** before API calls
6. **Handle errors gracefully** with user-friendly messages
7. **Use pagination** for large datasets
8. **Implement request timeouts** (30s recommended)
9. **Log API errors** for debugging
10. **Monitor rate limits** and implement backoff

---

## SDK & Code Examples

### JavaScript/TypeScript

```typescript
// Configure API client
const apiClient = axios.create({
  baseURL: 'https://api.engida.com',
  timeout: 30000,
  withCredentials: true, // For refresh token cookies
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const { data } = await axios.post('/auth/refresh');
        localStorage.setItem('accessToken', data.accessToken);
        error.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient.request(error.config);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Example: Search properties
const searchProperties = async (params) => {
  try {
    const response = await apiClient.get('/properties', { params });
    return response.data;
  } catch (error) {
    console.error('Search failed:', error.response?.data);
    throw error;
  }
};

// Example: Create booking
const createBooking = async (bookingData) => {
  try {
    const response = await apiClient.post('/bookings', bookingData);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      throw new Error('Property not available for selected dates');
    }
    throw error;
  }
};
```

---

## Support

**API Issues:** api-support@engida.com  
**Documentation:** https://docs.engida.com  
**Status Page:** https://status.engida.com

---

**Last Updated:** January 2024  
**API Version:** 1.0.0
