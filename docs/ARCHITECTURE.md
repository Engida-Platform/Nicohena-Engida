# Engida System Architecture

**Version**: 1.0.0  
**Last Updated**: January 2024

Complete technical architecture documentation for the Engida Ethiopian Property Marketplace platform.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Technology Stack](#technology-stack)
4. [System Components](#system-components)
5. [Service Communication](#service-communication)
6. [Data Architecture](#data-architecture)
7. [Security Architecture](#security-architecture)
8. [Module Architecture](#module-architecture)
9. [Design Patterns](#design-patterns)
10. [Scalability & Performance](#scalability--performance)

---

## System Overview

### High-Level Architecture

Engida follows a **microservices-inspired modular monolith** architecture with three primary services:

```
┌─────────────────────────────────────────────────────────────┐
│                        ENGIDA PLATFORM                       │
├─────────────────┬──────────────────────┬────────────────────┤
│   Frontend      │      Backend         │    AI Service      │
│   (Next.js)     │      (NestJS)        │    (FastAPI)       │
│   Port 3001     │      Port 3000       │    Port 8000       │
└────────┬────────┴──────────┬───────────┴─────────┬──────────┘
         │                   │                     │
         │                   │                     │
         └──────HTTP/REST────┤──────HTTP/REST─────┘
                             │
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │   Database      │
                    └─────────────────┘
```

### Service Responsibilities

**Frontend (Next.js 16)**
- Server-side rendering (SSR)
- Client-side interactivity
- SEO optimization
- Static asset serving
- Image optimization

**Backend (NestJS 11)**
- Business logic orchestration
- API gateway
- Authentication & authorization
- Database operations
- External service coordination
- Admin operations

**AI Service (FastAPI)**
- Price prediction
- Property recommendations
- Content generation
- Market analytics

**Database (PostgreSQL 14+)**
- Relational data storage
- ACID transactions
- Full-text search
- Geospatial queries
- JSON document storage

---

## Architecture Principles

### 1. Separation of Concerns
Each service has distinct responsibilities with clear boundaries.

### 2. Loose Coupling
Services communicate via well-defined REST APIs with no direct database access between services.

### 3. High Cohesion
Related functionality grouped together in domain-driven modules.

### 4. Scalability by Design
Services can scale independently with stateless architecture.

### 5. Security First
Multiple security layers with defense in depth.

### 6. Observability
Built-in monitoring, logging, and audit trails.

---

## Technology Stack

### Frontend Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 16 |
| Library | React | 19 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Maps | Leaflet | 1.9+ |

### Backend Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | NestJS | 11 |
| Language | TypeScript | 5 |
| Runtime | Node.js | 20+ |
| ORM | TypeORM | 0.3 |
| Authentication | Passport JWT | Latest |
| Image Storage | Cloudinary | Latest |

### AI Service Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | FastAPI | Latest |
| Language | Python | 3.11+ |
| Validation | Pydantic | Latest |
| Server | Uvicorn | Latest |

### Database & Infrastructure

| Component | Technology | Version |
|-----------|-----------|---------|
| Database | PostgreSQL | 14+ |
| Container | Docker | Latest |
| Orchestration | Docker Compose | Latest |

---

## System Components

### Backend Module Architecture

The backend follows a modular architecture with 25+ feature modules:

```
backend/src/
├── auth/                    # Authentication & JWT
├── users/                   # User management
├── modules/
│   ├── properties/         # Property listings
│   ├── bookings/           # Booking system
│   ├── payments/           # Payment processing
│   ├── finance/            # Finance operations
│   ├── reviews/            # Review system
│   ├── host/               # Host features
│   ├── admin/              # Admin panel
│   │   ├── users/
│   │   ├── bookings/
│   │   ├── finance/
│   │   ├── cases/
│   │   ├── reports/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── rbac/
│   ├── ai/                 # AI integration
│   ├── notifications/      # Notifications
│   ├── audit/              # Audit logging
│   ├── catalog/            # Categories/Destinations
│   ├── content/            # CMS
│   ├── coupons/            # Discount codes
│   └── messages/           # Messaging
└── database/               # Migrations & seeds
```

### Module Structure Pattern

Each module follows a consistent structure:

```typescript
module/
├── module-name.module.ts       # Module definition
├── module-name.controller.ts   # HTTP endpoints
├── module-name.service.ts      # Business logic
├── entities/                   # Database entities
├── dto/                        # Data transfer objects
├── guards/                     # Authorization guards
└── tests/                      # Tests
```

---

## Service Communication

### API Communication Protocol

All services communicate via HTTP/REST with JSON payloads.

**Request Example:**
```http
POST /api/bookings HTTP/1.1
Host: api.engida.com
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "propertyId": "uuid",
  "checkIn": "2024-12-20",
  "checkOut": "2024-12-25",
  "guests": 4
}
```

**Response Example:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "uuid",
  "status": "PENDING",
  "totalPrice": 603.75,
  "currency": "ETB"
}
```

### Inter-Service Communication

**Backend → AI Service:**
```typescript
// Backend service
async getPricePrediction(propertyData: PropertyDto) {
  const response = await this.httpService.post(
    `${AI_SERVICE_URL}/ai/predict-price`,
    propertyData
  );
  return response.data;
}
```

---

## Data Architecture

### Data Flow Layers

```
┌────────────────────────────────────────────┐
│            Presentation Layer              │
│  DTOs (Input/Output validation)            │
├────────────────────────────────────────────┤
│            Application Layer               │
│  Services (Business logic)                 │
├────────────────────────────────────────────┤
│            Data Access Layer               │
│  Repositories & Entities (ORM)             │
├────────────────────────────────────────────┤
│            Database Layer                  │
│  PostgreSQL (ACID, constraints)            │
└────────────────────────────────────────────┘
```

### Data Validation Strategy

**Three-Layer Validation:**

1. **Frontend**: Immediate user feedback
2. **API DTOs**: Type and business rule validation
3. **Database**: Constraints and referential integrity

**Example DTO:**
```typescript
export class CreateBookingDto {
  @IsUUID()
  propertyId: string;

  @IsDateString()
  @MinDate(new Date())
  checkIn: string;

  @IsDateString()
  @IsAfter('checkIn')
  checkOut: string;

  @IsInt()
  @Min(1)
  @Max(20)
  guests: number;
}
```

---

## Security Architecture

### Authentication Flow

```
1. User submits credentials
2. Backend verifies against database
3. Generate JWT access token (15 min)
4. Generate refresh token (7 days)
5. Store refresh token in database
6. Return access token + set HttpOnly cookie
7. Client uses access token in Authorization header
8. Refresh token used to get new access token
```

### JWT Token Structure

**Access Token:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1640995200,
  "exp": 1640996100
}
```

### Role-Based Access Control (RBAC)

**User Roles:**
- `USER` - Regular guest/host
- `ADMIN` - Admin user

**Admin Roles:**
- `SUPER_ADMIN` - Full access
- `BOOKING_MANAGER` - Booking operations
- `SUPPORT_AGENT` - Customer support
- `PROPERTY_MODERATOR` - Listing moderation
- `FINANCE_MANAGER` - Financial operations

**Permissions:**
- `USERS_VIEW`, `USERS_MANAGE`
- `LISTINGS_VIEW`, `LISTINGS_REVIEW`, `LISTINGS_HIDE`
- `BOOKINGS_VIEW`, `BOOKINGS_MANAGE`
- `FINANCE_VIEW`, `FINANCE_REFUNDS`, `FINANCE_PAYOUTS`
- `CASES_VIEW`, `CASES_MANAGE`, `CASES_COMPENSATE`
- And 30+ more granular permissions

**Permission Guard:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequirePermissions(Permission.LISTINGS_REVIEW)
@Get('reviews')
async getReviewQueue() {
  // Only users with LISTINGS_REVIEW permission
}
```

### Data Security

**1. Password Security:**
- Bcrypt hashing (cost factor 10)
- Salted hashes
- Never stored in plain text

**2. Sensitive Data:**
- Payment details encrypted at rest
- Payout account numbers encrypted
- PII minimization

**3. SQL Injection Prevention:**
- TypeORM parameterized queries
- Input validation
- No raw SQL concatenation

**4. XSS Prevention:**
- React automatic escaping
- Content Security Policy headers
- Sanitization of user input

**5. CSRF Protection:**
- SameSite cookies
- CSRF tokens for state-changing operations

---

## Module Architecture

### Core Modules

#### 1. Authentication Module
- JWT token generation & validation
- Google OAuth integration
- Refresh token rotation
- Session management

#### 2. Properties Module
- Property CRUD operations
- Room management
- Amenity associations
- Image uploads
- Availability management
- Moderation workflow

#### 3. Bookings Module
- Booking creation & management
- Status workflow (PENDING → CONFIRMED → COMPLETED)
- Cancellation requests
- Policy enforcement
- Price calculation

#### 4. Finance Module
- Payment processing
- Provider webhooks (Chapa, TeleBirr)
- Refund management
- Payout generation
- Escrow holds
- Double-entry ledger
- Reconciliation

#### 5. Admin Module
- User management
- Listing moderation
- Booking oversight
- Financial operations
- Support cases
- Analytics dashboard
- System settings

#### 6. Host Module
- Host profile management
- Listing management
- Reservation tracking
- Earnings reports
- Review management
- Payout configuration

---

## Design Patterns

### 1. Dependency Injection

NestJS uses constructor-based dependency injection:

```typescript
@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private propertiesService: PropertiesService,
    private paymentsService: PaymentsService,
  ) {}
}
```

### 2. Repository Pattern

Abstraction over data access:

```typescript
const booking = await this.bookingsRepository.findOne({
  where: { id },
  relations: ['property', 'guest'],
});
```

### 3. DTO Pattern

Data transfer objects for API boundaries:

```typescript
// Input validation
class CreateBookingDto {
  @IsUUID()
  propertyId: string;
  
  @IsDateString()
  checkIn: string;
}

// Output shaping
class BookingResponseDto {
  id: string;
  status: BookingStatus;
  totalPrice: number;
}
```

### 4. Guard Pattern

Authorization checks:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController { }
```

### 5. Decorator Pattern

Metadata and cross-cutting concerns:

```typescript
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  @Get()
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  list() { }
}
```

### 6. Strategy Pattern

Payment provider abstraction:

```typescript
interface PaymentProvider {
  initialize(params: PaymentParams): Promise<PaymentSession>;
  verify(reference: string): Promise<PaymentStatus>;
}

class ChapaProvider implements PaymentProvider { }
class TeleBirrProvider implements PaymentProvider { }
```

### 7. Observer Pattern

Event-driven architecture:

```typescript
// Emit event
this.eventEmitter.emit('booking.created', {
  booking,
  user,
});

// Listen to event
@OnEvent('booking.created')
async handleBookingCreated(payload: BookingCreatedEvent) {
  await this.sendConfirmationEmail(payload);
}
```

---

## Scalability & Performance

### Horizontal Scaling

**Stateless Services:**
- No session storage on servers
- JWT tokens for authentication
- Any instance can handle any request

**Load Balancing:**
```
            ┌─────────────┐
            │Load Balancer│
            └──────┬──────┘
           ┌───────┴───────┐
      ┌────▼────┐     ┌────▼────┐
      │ Server 1│     │ Server 2│
      └────┬────┘     └────┬────┘
           └───────┬───────┘
                   │
            ┌──────▼──────┐
            │  Database   │
            └─────────────┘
```

### Database Optimization

**1. Indexing Strategy:**
```sql
-- Frequently queried columns
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_users_email ON users(email);

-- Composite indexes
CREATE INDEX idx_properties_active 
ON properties(status, is_available, admin_hidden)
WHERE status = 'PUBLISHED';
```

**2. Query Optimization:**
- Eager loading with `relations`
- Pagination for large datasets
- Database connection pooling
- Read replicas for reporting

**3. Caching Strategy (Planned):**
```typescript
// Redis caching
@Cacheable('property:{id}', ttl: 3600)
async getProperty(id: string) {
  return this.propertiesRepository.findOne(id);
}
```

### Performance Monitoring

**Metrics to Track:**
- API response times
- Database query times
- Error rates
- Request throughput
- Memory usage
- CPU utilization

**Logging Strategy:**
```typescript
this.logger.log('Booking created', {
  bookingId: booking.id,
  propertyId: booking.propertyId,
  userId: user.id,
  duration: Date.now() - startTime,
});
```

---

## Deployment Architecture

### Development Environment

```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports: ["3001:3001"]
    depends_on: [backend]
    
  backend:
    build: ./backend
    ports: ["3000:3000"]
    depends_on: [postgres, ai-service]
    
  ai-service:
    build: ./ai-service
    ports: ["8000:8000"]
    
  postgres:
    image: postgres:14
    ports: ["5432:5432"]
```

### Production Architecture (Planned)

```
┌─────────────────────────────────────────────┐
│              CDN (Cloudflare)               │
│         Static Assets & Caching             │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│          Load Balancer (AWS ALB)            │
└────┬─────────────────────────┬──────────────┘
     │                         │
┌────▼─────────┐      ┌────────▼──────────┐
│  Frontend    │      │     Backend       │
│  (Next.js)   │      │    (NestJS)       │
│  EC2/ECS     │      │    EC2/ECS        │
└──────────────┘      └────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
            ┌───────▼────────┐   ┌───────▼─────────┐
            │   PostgreSQL   │   │   AI Service    │
            │   RDS          │   │   EC2/Lambda    │
            └────────────────┘   └─────────────────┘
```

### Environment Configuration

**.env Structure:**
```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# External Services
CLOUDINARY_URL=...
AI_SERVICE_URL=...

# Payment Providers
CHAPA_SECRET_KEY=...
```

---

## Quality Attributes

### 1. Maintainability
- Modular architecture
- Clear separation of concerns
- Consistent code style
- Comprehensive documentation

### 2. Testability
- Unit tests for services
- Integration tests for APIs
- E2E tests for critical flows
- Test coverage targets: >80%

### 3. Security
- Defense in depth
- Principle of least privilege
- Audit logging
- Regular security updates

### 4. Reliability
- Error handling
- Transaction management
- Data validation
- Graceful degradation

### 5. Performance
- Optimized queries
- Caching strategy
- CDN for static assets
- Lazy loading

### 6. Scalability
- Stateless services
- Horizontal scaling
- Database optimization
- Microservices-ready

---

## Technology Decisions

### Why NestJS?

**Pros:**
- TypeScript native
- Modular architecture
- Dependency injection
- Built-in testing
- Enterprise-ready

**Cons:**
- Steeper learning curve
- More boilerplate than Express

### Why Next.js?

**Pros:**
- SSR for SEO
- React ecosystem
- Image optimization
- File-based routing
- Production-ready

**Cons:**
- Complex for simple sites
- Learning curve for App Router

### Why PostgreSQL?

**Pros:**
- ACID compliance
- Rich feature set
- JSON support
- Geospatial queries
- Open source

**Cons:**
- More complex than NoSQL
- Vertical scaling limits

### Why TypeORM?

**Pros:**
- TypeScript support
- Active Record & Data Mapper
- Migration system
- Relationship handling

**Cons:**
- Performance overhead
- Complex queries can be verbose

---

## Future Architecture Considerations

### 1. Microservices Migration

If traffic grows significantly:
```
Monolith → Split into:
- User Service
- Property Service
- Booking Service
- Payment Service
- Notification Service
```

### 2. Message Queue

For async processing:
```
RabbitMQ/SQS for:
- Email notifications
- Payment webhooks
- Report generation
- Data export
```

### 3. Caching Layer

Redis for:
- Session storage
- API response caching
- Rate limiting
- Real-time features

### 4. Search Engine

Elasticsearch for:
- Full-text property search
- Faceted filtering
- Geospatial queries
- Analytics

### 5. Event Sourcing

For audit trails:
```
Event Store:
- BookingCreated
- PaymentProcessed
- ListingApproved
- UserRegistered
```

---

## Best Practices

### Code Organization
✅ Group by feature, not by type  
✅ Keep modules small and focused  
✅ Use dependency injection  
✅ Write self-documenting code

### API Design
✅ RESTful conventions  
✅ Versioned endpoints  
✅ Consistent error responses  
✅ Pagination for collections  
✅ Rate limiting

### Database
✅ Use migrations, never synchronize  
✅ Index frequently queried columns  
✅ Use transactions for multi-step operations  
✅ Validate at multiple layers

### Security
✅ Never trust user input  
✅ Use parameterized queries  
✅ Hash passwords properly  
✅ Implement rate limiting  
✅ Log security events

### Testing
✅ Test business logic thoroughly  
✅ Mock external dependencies  
✅ Test error scenarios  
✅ Maintain test independence

---

## Conclusion

The Engida architecture balances:
- **Simplicity**: Monolithic for now, easy to understand
- **Scalability**: Can scale horizontally and migrate to microservices
- **Security**: Multiple layers of protection
- **Performance**: Optimized queries and caching strategy
- **Maintainability**: Modular, testable, documented

The architecture supports the current scale while providing a path to growth.

---

**Document Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintained By**: Engida Development Team
