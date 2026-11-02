# Engida Development Workflow Guide

**Version**: 1.0.0  
**Last Updated**: January 2024

Complete development workflow guide for contributing to the Engida Ethiopian Property Marketplace platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Git Workflow](#git-workflow)
4. [Code Standards](#code-standards)
5. [Testing](#testing)
6. [Code Review Process](#code-review-process)
7. [Database Workflows](#database-workflows)
8. [API Development](#api-development)
9. [Frontend Development](#frontend-development)
10. [Debugging](#debugging)
11. [Common Tasks](#common-tasks)

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:
- Node.js 20+ and npm 9+
- Python 3.11+ (for AI service)
- PostgreSQL 14+ (or Docker)
- Git 2.0+
- Code editor (VS Code recommended)

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/yourorg/engida.git
cd engida

# 2. Install dependencies
# Backend
cd backend && npm ci && cd ..

# Frontend
cd frontend && npm ci && cd ..

# AI Service
cd ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 3. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 4. Setup database
# Option A: Docker
docker run --name engida-postgres \
  -e POSTGRES_DB=engida \
  -e POSTGRES_USER=engida \
  -e POSTGRES_PASSWORD=1921 \
  -p 5433:5432 \
  -d postgres:14

# Option B: Local PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE engida;"
sudo -u postgres psql -c "CREATE USER engida WITH PASSWORD '1921';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE engida TO engida;"

# 5. Run migrations
cd backend
npm run migration:run
cd ..

# 6. Start development servers
docker-compose up
# Or manually in separate terminals:
# Terminal 1: cd backend && npm run start:dev
# Terminal 2: cd frontend && npm run dev
# Terminal 3: cd ai-service && uvicorn app.main:app --reload
```

### IDE Setup (VS Code)

**Recommended Extensions:**
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "firsttris.vscode-jest-runner",
    "orta.vscode-jest"
  ]
}
```

**Workspace Settings (.vscode/settings.json):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true
  },
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "typescript.tsdk": "node_modules/typescript/lib",
  "jest.autoRun": "off"
}
```

---

## Development Environment

### Running Services

**Option 1: Docker Compose (Recommended)**

```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up backend

# Rebuild and start
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

**Option 2: Manual (Individual Terminals)**

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - AI Service
cd ai-service
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3001 | http://localhost:3001 |
| Backend API | 3000 | http://localhost:3000 |
| Backend Docs | 3000 | http://localhost:3000/api/docs |
| AI Service | 8000 | http://localhost:8000 |
| AI Docs | 8000 | http://localhost:8000/docs |
| PostgreSQL | 5433 | localhost:5433 |

### Environment Variables

**Development (.env):**
```env
# Database
DATABASE_URL=postgresql://engida:1921@localhost:5433/engida
DOCKER_DATABASE_URL=postgresql://engida:1921@host.docker.internal:5433/engida

# Backend
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:3000

# JWT (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=dev-secret-min-32-chars-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
JWT_REFRESH_EXPIRATION=7d

# Google OAuth (optional for development)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# AI Service
AI_SERVICE_URL=http://localhost:8000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_AI=false

# Cloudinary (optional for development)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Git Workflow

### Branching Strategy

We follow **Git Flow** with these branches:

```
main
  ├── develop
  │   ├── feature/add-property-search
  │   ├── feature/improve-bookings
  │   ├── fix/payment-validation
  │   └── refactor/auth-module
  └── hotfix/critical-security-fix
```

**Branch Types:**

| Branch | Purpose | Base | Merge To |
|--------|---------|------|----------|
| `main` | Production code | - | - |
| `develop` | Integration branch | `main` | `main` |
| `feature/*` | New features | `develop` | `develop` |
| `fix/*` | Bug fixes | `develop` | `develop` |
| `hotfix/*` | Critical fixes | `main` | `main` + `develop` |
| `refactor/*` | Code refactoring | `develop` | `develop` |

### Workflow Steps

**1. Start New Feature:**
```bash
# Update develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/property-filtering

# Make changes and commit
git add .
git commit -m "feat: add advanced property filtering"

# Push to remote
git push origin feature/property-filtering

# Create pull request on GitHub
```

**2. Work on Bug Fix:**
```bash
# Update develop branch
git checkout develop
git pull origin develop

# Create fix branch
git checkout -b fix/booking-date-validation

# Fix and commit
git add .
git commit -m "fix: correct booking date validation logic"

# Push and create PR
git push origin fix/booking-date-validation
```

**3. Hotfix for Production:**
```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/security-patch

# Fix and commit
git add .
git commit -m "fix: patch security vulnerability in auth"

# Push and create PR to main
git push origin hotfix/security-patch

# After merge to main, also merge to develop
git checkout develop
git merge main
git push origin develop
```

### Commit Convention

We follow **Conventional Commits**:

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code formatting (no logic change)
- `refactor`: Code restructuring (no behavior change)
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks
- `build`: Build system changes
- `ci`: CI configuration changes

**Examples:**

```bash
# Simple feature
git commit -m "feat: add property search by location"

# Fix with details
git commit -m "fix: resolve booking date overlap issue

- Add validation to check existing bookings
- Update database query to include date range
- Add unit tests for edge cases

Closes #123"

# Breaking change
git commit -m "feat!: redesign authentication API

BREAKING CHANGE: Authentication endpoints now use /api/v2/auth
instead of /api/auth. Update all clients accordingly."

# Multiple scopes
git commit -m "feat(backend): add email notification service"
git commit -m "feat(frontend): create notification settings page"
git commit -m "test(ai-service): add price prediction tests"
```

### Pull Request Process

**1. Before Creating PR:**
```bash
# Ensure code is formatted
cd backend && npm run format
cd ../frontend && npm run lint

# Run tests
cd backend && npm test
cd ../ai-service && pytest

# Rebase on latest develop (if needed)
git checkout develop
git pull origin develop
git checkout feature/your-feature
git rebase develop
```

**2. Create PR:**
- Use descriptive title following commit convention
- Fill out PR template
- Link related issues
- Add screenshots for UI changes
- Request reviewers

**PR Title Examples:**
```
feat: implement property filtering by price range
fix: resolve booking confirmation email bug
docs: update API documentation for payments
refactor: optimize database queries in properties module
```

**PR Description Template:**
```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123
Relates to #456

## Changes Made
- Added property filtering by price range
- Updated database query optimization
- Added unit tests for filter logic

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Dependent changes merged
```

**3. During Review:**
- Address feedback promptly
- Push new commits for requested changes
- Mark conversations as resolved
- Re-request review when ready

**4. After Approval:**
```bash
# Option A: Squash merge (preferred for features)
# Done via GitHub UI - creates single commit

# Option B: Rebase merge (for clean history)
git checkout develop
git pull origin develop
git checkout feature/your-feature
git rebase develop
# Resolve conflicts if any
git push origin feature/your-feature --force-with-lease
# Merge via GitHub UI

# Option C: Merge commit (for release branches)
# Done via GitHub UI - preserves history
```

---

## Code Standards

### TypeScript (Backend & Frontend)

**Style Guide:**

```typescript
// ✅ Good
export class PropertyService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly imagesService: ImagesService,
  ) {}

  async findAll(filters: PropertyFilters): Promise<Property[]> {
    const query = this.propertyRepository.createQueryBuilder('property');

    if (filters.city) {
      query.andWhere('property.city = :city', { city: filters.city });
    }

    if (filters.minPrice) {
      query.andWhere('property.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    return query.getMany();
  }
}

// ❌ Bad
export class PropertyService {
  constructor(private propertyRepository: any, private imagesService: any) {}

  async findAll(filters: any): Promise<any> {
    let query = this.propertyRepository.createQueryBuilder('property');
    if (filters.city) query = query.andWhere('property.city = :city', { city: filters.city });
    return query.getMany();
  }
}
```

**Naming Conventions:**

```typescript
// Classes: PascalCase
class UserService {}
class BookingController {}

// Interfaces: PascalCase with 'I' prefix (optional)
interface User {}
interface IPaymentProvider {}

// Types: PascalCase
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

// Functions/Methods: camelCase
function calculateTotalPrice() {}
async getUserById() {}

// Variables: camelCase
const userName = 'John';
let bookingCount = 0;

// Constants: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 20;

// Enums: PascalCase for enum, UPPER_CASE for values
enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  HOST = 'HOST',
}

// Files: kebab-case
// property-service.ts
// booking.controller.ts
// user.entity.ts
```

**Code Organization:**

```typescript
// 1. Imports
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// 2. Interfaces/Types
interface PropertyFilters {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
}

// 3. Constants
const DEFAULT_PAGE_SIZE = 20;

// 4. Class
@Injectable()
export class PropertyService {
  // 4.1 Constructor
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  // 4.2 Public methods
  async findAll(filters: PropertyFilters): Promise<Property[]> {
    // Implementation
  }

  // 4.3 Private methods
  private buildQuery(filters: PropertyFilters) {
    // Implementation
  }
}
```

### Python (AI Service)

**Style Guide (PEP 8):**

```python
# ✅ Good
from typing import List, Optional
from pydantic import BaseModel, Field


class PropertyPredictionRequest(BaseModel):
    """Request model for property price prediction."""

    bedrooms: int = Field(..., ge=1, le=10)
    bathrooms: int = Field(..., ge=1, le=10)
    area: float = Field(..., gt=0)
    city: str
    amenities: List[str] = []


class PricePredictionService:
    """Service for predicting property prices."""

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or "models/price_model.pkl"
        self.model = self._load_model()

    def predict_price(
        self, property_data: PropertyPredictionRequest
    ) -> float:
        """Predict property price based on features.

        Args:
            property_data: Property features for prediction

        Returns:
            Predicted price in ETB

        Raises:
            ModelNotLoadedError: If model is not loaded
        """
        if not self.model:
            raise ModelNotLoadedError("Model not loaded")

        features = self._extract_features(property_data)
        prediction = self.model.predict([features])[0]
        return float(prediction)

    def _load_model(self):
        """Load the ML model from disk."""
        # Implementation
        pass


# ❌ Bad
class pricePredictionService:
    def __init__(self, modelPath=None):
        self.modelPath = modelPath or "models/price_model.pkl"
        self.Model = self.loadModel()

    def PredictPrice(self, propertyData):
        if not self.Model:
            raise Exception("Model not loaded")
        Features = self.extractFeatures(propertyData)
        Prediction = self.Model.predict([Features])[0]
        return float(Prediction)
```

**Naming Conventions:**

```python
# Classes: PascalCase
class PricePredictor:
    pass

# Functions/Methods: snake_case
def calculate_total_price():
    pass

async def get_user_by_id():
    pass

# Variables: snake_case
user_name = "John"
booking_count = 0

# Constants: UPPER_SNAKE_CASE
MAX_UPLOAD_SIZE = 5 * 1024 * 1024
DEFAULT_PAGE_SIZE = 20

# Files: snake_case
# price_prediction.py
# recommendation_service.py
```

### Linting & Formatting

**Backend (TypeScript/NestJS):**

```bash
# Check linting
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Format code
npm run format

# ESLint config (.eslintrc or eslint.config.mjs)
# Uses typescript-eslint + prettier
```

**Frontend (TypeScript/Next.js):**

```bash
# Check linting
npm run lint

# Auto-fix
npm run lint -- --fix

# Uses next/core-web-vitals + typescript rules
```

**AI Service (Python):**

```bash
# Format with Black
black app/ tests/

# Check formatting
black --check app/ tests/

# Lint with Flake8
flake8 app/ tests/

# Type check with mypy (optional)
mypy app/

# Configuration in pyproject.toml or setup.cfg
```

---

## Testing

### Backend Testing (Jest)

**Test Structure:**

```typescript
// property.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PropertyService } from './property.service';
import { Property } from './entities/property.entity';

describe('PropertyService', () => {
  let service: PropertyService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
  });

  describe('findAll', () => {
    it('should return an array of properties', async () => {
      const properties = [
        { id: '1', title: 'Test Property' },
        { id: '2', title: 'Another Property' },
      ];
      mockRepository.find.mockResolvedValue(properties);

      const result = await service.findAll();

      expect(result).toEqual(properties);
      expect(mockRepository.find).toHaveBeenCalled();
    });

    it('should filter by city', async () => {
      const queryBuilder = mockRepository.createQueryBuilder();
      queryBuilder.getMany.mockResolvedValue([]);

      await service.findAll({ city: 'Addis Ababa' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'property.city = :city',
        { city: 'Addis Ababa' },
      );
    });
  });

  describe('findOne', () => {
    it('should return a property by id', async () => {
      const property = { id: '1', title: 'Test Property' };
      mockRepository.findOne.mockResolvedValue(property);

      const result = await service.findOne('1');

      expect(result).toEqual(property);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if property not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

**Running Tests:**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test -- property.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="findAll"
```

**Coverage Requirements:**
- Minimum: 70%
- Target: 80%+
- Critical paths: 90%+

### Frontend Testing (Future)

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

### AI Service Testing (pytest)

**Test Structure:**

```python
# tests/test_price_prediction.py
import pytest
from app.services.price_prediction import PricePredictionService
from app.models.requests import PropertyPredictionRequest


@pytest.fixture
def prediction_service():
    """Create a prediction service instance."""
    return PricePredictionService()


@pytest.fixture
def sample_property():
    """Create a sample property for testing."""
    return PropertyPredictionRequest(
        bedrooms=3,
        bathrooms=2,
        area=150.0,
        city="Addis Ababa",
        amenities=["wifi", "parking"],
    )


class TestPricePredictionService:
    """Tests for PricePredictionService."""

    def test_predict_price_returns_float(
        self, prediction_service, sample_property
    ):
        """Test that predict_price returns a float value."""
        result = prediction_service.predict_price(sample_property)
        assert isinstance(result, float)
        assert result > 0

    def test_predict_price_with_more_bedrooms_costs_more(
        self, prediction_service
    ):
        """Test that properties with more bedrooms are priced higher."""
        property_2br = PropertyPredictionRequest(
            bedrooms=2, bathrooms=2, area=150.0, city="Addis Ababa"
        )
        property_4br = PropertyPredictionRequest(
            bedrooms=4, bathrooms=2, area=150.0, city="Addis Ababa"
        )

        price_2br = prediction_service.predict_price(property_2br)
        price_4br = prediction_service.predict_price(property_4br)

        assert price_4br > price_2br

    @pytest.mark.parametrize(
        "bedrooms,bathrooms,area,expected_range",
        [
            (1, 1, 50.0, (5000, 15000)),
            (3, 2, 150.0, (20000, 40000)),
            (5, 4, 300.0, (50000, 100000)),
        ],
    )
    def test_predict_price_ranges(
        self, prediction_service, bedrooms, bathrooms, area, expected_range
    ):
        """Test that predictions fall within expected ranges."""
        property_data = PropertyPredictionRequest(
            bedrooms=bedrooms,
            bathrooms=bathrooms,
            area=area,
            city="Addis Ababa",
        )

        price = prediction_service.predict_price(property_data)

        assert expected_range[0] <= price <= expected_range[1]
```

**Running Tests:**

```bash
# Run all tests
pytest

# Verbose output
pytest -v

# With coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_price_prediction.py

# Run specific test
pytest tests/test_price_prediction.py::TestPricePredictionService::test_predict_price_returns_float

# Run tests matching pattern
pytest -k "predict_price"
```

### Integration Testing

**Backend Integration Test:**

```typescript
// test/properties.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('PropertiesController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = response.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/properties (GET)', () => {
    it('should return array of properties', () => {
      return request(app.getHttpServer())
        .get('/properties')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter properties by city', () => {
      return request(app.getHttpServer())
        .get('/properties?city=Addis Ababa')
        .expect(200)
        .expect((res) => {
          res.body.forEach((property) => {
            expect(property.city).toBe('Addis Ababa');
          });
        });
    });
  });

  describe('/properties (POST)', () => {
    it('should create a new property with auth', () => {
      return request(app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Test Property',
          description: 'A beautiful test property',
          price: 50000,
          city: 'Addis Ababa',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('New Test Property');
        });
    });

    it('should fail without auth', () => {
      return request(app.getHttpServer())
        .post('/properties')
        .send({
          title: 'New Test Property',
          price: 50000,
        })
        .expect(401);
    });
  });
});
```

**Run Integration Tests:**

```bash
npm run test:e2e
```

---

## Code Review Process

### Reviewer Responsibilities

**1. Check Code Quality:**
- [ ] Code follows style guidelines
- [ ] No unnecessary complexity
- [ ] Proper error handling
- [ ] Security best practices followed
- [ ] Performance considerations addressed

**2. Review Logic:**
- [ ] Business logic is correct
- [ ] Edge cases handled
- [ ] Data validation present
- [ ] No race conditions
- [ ] Transactions used appropriately

**3. Verify Tests:**
- [ ] Unit tests present and meaningful
- [ ] Edge cases tested
- [ ] Tests pass locally
- [ ] Coverage acceptable

**4. Check Documentation:**
- [ ] Code comments for complex logic
- [ ] API documentation updated
- [ ] README updated if needed
- [ ] Migration/deployment notes provided

### Author Responsibilities

**Before Requesting Review:**
- [ ] Self-review completed
- [ ] All tests pass
- [ ] Linting passes
- [ ] Branch is up to date with base
- [ ] PR description is complete
- [ ] Screenshots added (for UI changes)

**During Review:**
- [ ] Respond to feedback promptly
- [ ] Explain reasoning when disagreeing
- [ ] Update code based on feedback
- [ ] Mark conversations as resolved
- [ ] Re-request review when ready

**Review Comments:**

```typescript
// ✅ Good: Constructive feedback
// Consider using a switch statement here for better readability
// and easier maintenance when adding new status types

// Suggestion: Extract this logic into a separate method
// to improve testability

// Question: Should we handle the case where user is null?

// ❌ Bad: Non-constructive
// This is wrong
// Bad code
// Why did you do it this way?
```

---

## Database Workflows

### Creating Migrations

**1. Make Entity Changes:**

```typescript
// entities/property.entity.ts
@Entity('properties')
export class Property {
  // ... existing fields

  // New field
  @Column({ nullable: true })
  virtualTourUrl: string;
}
```

**2. Generate Migration:**

```bash
cd backend
npm run migration:generate -- src/database/migrations/AddVirtualTourUrl
```

**3. Review Generated Migration:**

```typescript
// migrations/1234567890-AddVirtualTourUrl.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVirtualTourUrl1234567890 implements MigrationInterface {
  name = 'AddVirtualTourUrl1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "properties" ADD "virtual_tour_url" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "properties" DROP COLUMN "virtual_tour_url"`,
    );
  }
}
```

**4. Run Migration:**

```bash
npm run migration:run
```

**5. Test Rollback:**

```bash
# Revert migration
npm run migration:revert

# Re-run to confirm
npm run migration:run
```

### Complex Migrations

**Adding Index:**

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(
    `CREATE INDEX "idx_properties_city" ON "properties" ("city")`,
  );
}

public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`DROP INDEX "idx_properties_city"`);
}
```

**Data Migration:**

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // Add new column
  await queryRunner.query(
    `ALTER TABLE "users" ADD "full_name" character varying`,
  );

  // Migrate existing data
  await queryRunner.query(
    `UPDATE "users" SET "full_name" = CONCAT("first_name", ' ', "last_name")`,
  );

  // Make column non-nullable
  await queryRunner.query(
    `ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL`,
  );
}
```

### Database Seeding

**Create Seed Script:**

```bash
# Run seed
cd backend
npm run seed:properties
```

---

## API Development

### Creating New Endpoint

**1. Define DTO:**

```typescript
// dto/create-property.dto.ts
import { IsString, IsNumber, IsEnum, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Beautiful 3BR Apartment' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'Addis Ababa' })
  @IsString()
  city: string;

  @ApiProperty({ enum: ['HOUSE', 'APARTMENT', 'VILLA'] })
  @IsEnum(['HOUSE', 'APARTMENT', 'VILLA'])
  type: string;
}
```

**2. Create Service Method:**

```typescript
// property.service.ts
async create(
  createPropertyDto: CreatePropertyDto,
  userId: string,
): Promise<Property> {
  const property = this.propertyRepository.create({
    ...createPropertyDto,
    hostId: userId,
  });

  return this.propertyRepository.save(property);
}
```

**3. Add Controller Endpoint:**

```typescript
// property.controller.ts
@Post()
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Create a new property' })
@ApiResponse({ status: 201, description: 'Property created successfully' })
@ApiResponse({ status: 400, description: 'Invalid input' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
async create(
  @Body() createPropertyDto: CreatePropertyDto,
  @GetUser() user: User,
) {
  return this.propertyService.create(createPropertyDto, user.id);
}
```

**4. Add Tests:**

```typescript
describe('create', () => {
  it('should create a property', async () => {
    const dto = {
      title: 'Test Property',
      price: 50000,
      city: 'Addis Ababa',
      type: 'APARTMENT',
    };

    mockRepository.create.mockReturnValue(dto);
    mockRepository.save.mockResolvedValue({ id: '1', ...dto });

    const result = await service.create(dto, 'user-123');

    expect(result).toHaveProperty('id');
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
```

**5. Test Manually:**

```bash
# Using curl
curl -X POST http://localhost:3000/properties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Beautiful 3BR Apartment",
    "price": 50000,
    "city": "Addis Ababa",
    "type": "APARTMENT"
  }'

# Or use Swagger UI: http://localhost:3000/api/docs
```

---

## Frontend Development

### Creating New Page

**1. Create Page Component:**

```typescript
// app/properties/[id]/page.tsx
import { PropertyDetails } from '@/components/properties/PropertyDetails';

interface PageProps {
  params: { id: string };
}

export default async function PropertyPage({ params }: PageProps) {
  const property = await fetchProperty(params.id);

  return (
    <div>
      <PropertyDetails property={property} />
    </div>
  );
}

async function fetchProperty(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/properties/${id}`);
  if (!res.ok) throw new Error('Failed to fetch property');
  return res.json();
}
```

**2. Create Component:**

```typescript
// components/properties/PropertyDetails.tsx
'use client';

import { Property } from '@/types/property';

interface PropertyDetailsProps {
  property: Property;
}

export function PropertyDetails({ property }: PropertyDetailsProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{property.title}</h1>
      <p className="text-gray-600 mt-2">{property.description}</p>
      <div className="mt-4">
        <span className="text-2xl font-semibold">
          {property.price.toLocaleString()} ETB
        </span>
      </div>
    </div>
  );
}
```

**3. Add Types:**

```typescript
// types/property.ts
export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  type: 'HOUSE' | 'APARTMENT' | 'VILLA';
  images: string[];
  createdAt: string;
}
```

---

## Debugging

### Backend Debugging (VS Code)

**launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeArgs": ["-r", "ts-node/register", "-r", "tsconfig-paths/register"],
      "args": ["${workspaceFolder}/backend/src/main.ts"],
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "sourceMaps": true
    }
  ]
}
```

**Set Breakpoints:**
- Click left of line number in VS Code
- Debug → Start Debugging (F5)

### Frontend Debugging

**Browser DevTools:**
- Open DevTools (F12)
- Use Sources tab
- Set breakpoints in source maps
- Use console.log strategically

**Next.js Debugging:**

```typescript
// Enable verbose logging
console.log('Property data:', property);

// Debug API calls
console.log('Fetching from:', `${process.env.NEXT_PUBLIC_API_URL}/properties`);
```

### Python Debugging

**VS Code launch.json:**

```json
{
  "type": "python",
  "request": "launch",
  "name": "Debug FastAPI",
  "module": "uvicorn",
  "args": [
    "app.main:app",
    "--reload",
    "--port",
    "8000"
  ],
  "jinja": true,
  "cwd": "${workspaceFolder}/ai-service"
}
```

### Debugging Database Queries

**Enable Query Logging:**

```typescript
// data-source.ts
export const AppDataSource = new DataSource({
  // ... other config
  logging: ['query', 'error'],
  logger: 'advanced-console',
});
```

**View Generated SQL:**

```typescript
const query = this.propertyRepository
  .createQueryBuilder('property')
  .where('property.city = :city', { city: 'Addis Ababa' });

console.log(query.getSql());
console.log(query.getParameters());
```

---

## Common Tasks

### Add New Module

```bash
# Generate module, controller, service
cd backend
nest g module modules/reviews
nest g controller modules/reviews
nest g service modules/reviews

# Create entity
nest g class modules/reviews/entities/review.entity --no-spec
```

### Update Dependencies

```bash
# Backend
cd backend
npm outdated
npm update
# Or update specific package
npm install @nestjs/common@latest

# Frontend
cd frontend
npm outdated
npm update

# AI Service
cd ai-service
pip list --outdated
pip install --upgrade package-name
```

### Clear Caches

```bash
# Backend
cd backend
rm -rf node_modules dist
npm ci

# Frontend
cd frontend
rm -rf node_modules .next
npm ci

# Docker
docker-compose down -v
docker system prune -a
```

### Database Reset

```bash
# ⚠️ Destructive: Drops all data
cd backend

# Revert all migrations
npm run migration:revert -- --fake

# Drop database
psql -U postgres -c "DROP DATABASE engida;"
psql -U postgres -c "CREATE DATABASE engida;"

# Run migrations
npm run migration:run

# Seed data
npm run seed:properties
```

---

## Troubleshooting

### Common Issues

**1. Port Already in Use:**
```bash
# Find process
lsof -i :3000
# Kill process
kill -9 <PID>
```

**2. Database Connection Failed:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**3. Node Modules Issues:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**4. TypeORM Sync Issues:**
```env
# Never use in production!
DATABASE_SYNCHRONIZE=false
```

**5. Docker Issues:**
```bash
# Rebuild containers
docker-compose down -v
docker-compose up --build
```

---

## Best Practices Summary

### DO ✅

- Write meaningful commit messages
- Add tests for new features
- Review your own PR before requesting review
- Keep PRs small and focused
- Document complex logic
- Use TypeScript strictly (avoid `any`)
- Handle errors properly
- Validate input at API boundaries
- Use migrations for database changes
- Keep dependencies up to date

### DON'T ❌

- Commit directly to main/develop
- Skip code review
- Ignore linting errors
- Use `any` type extensively
- Commit sensitive data (.env files)
- Use `DATABASE_SYNCHRONIZE=true` in production
- Leave console.logs in production code
- Skip writing tests
- Make breaking changes without discussion
- Deploy without testing

---

**Document Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintained By**: Engida Development Team
