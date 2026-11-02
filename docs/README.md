# Engida Platform Documentation

**Version**: 1.0.0  
**Last Updated**: January 2024

Complete documentation for the Engida Ethiopian Property Marketplace platform.

---

## 📚 Documentation Index

### 1. [API Documentation](./API_DOCUMENTATION.md)
Complete REST API reference covering all 200+ endpoints across all modules.

**Contents:**
- Authentication & Authorization APIs
- Property Management APIs
- Booking & Reservation APIs
- Payment & Finance APIs
- Host Management APIs
- Review & Rating APIs
- Admin Operations APIs
- AI Services Integration
- Search & Filtering APIs

**Key Features:**
- Request/response examples for all endpoints
- Authentication requirements
- Permission specifications
- Error handling guidelines
- Rate limiting information

---

### 2. [Database Schema Documentation](./DATABASE_SCHEMA.md)
Comprehensive database schema covering 50+ tables with relationships and indexes.

**Contents:**
- Complete table definitions
- Column specifications with types and constraints
- Entity relationships (one-to-many, many-to-many)
- Database indexes for performance
- Enum definitions
- Migration history
- Performance optimization strategies

**Key Tables:**
- Users & Authentication
- Properties & Listings
- Bookings & Reservations
- Payments & Finance
- Reviews & Ratings
- Admin & Moderation
- Audit Trails

---

### 3. [Architecture Documentation](./ARCHITECTURE.md)
System architecture and technical design decisions.

**Contents:**
- System overview and component architecture
- Technology stack (Next.js 16, NestJS 11, FastAPI, PostgreSQL)
- Service communication patterns
- Data architecture and validation layers
- Security architecture with RBAC
- Module structure (25+ feature modules)
- Design patterns (DI, Repository, DTO, Guards, Strategy, Observer)
- Scalability and performance strategies
- Deployment architecture

**Architecture Highlights:**
- Microservices-inspired modular monolith
- Three-tier architecture (Frontend, Backend, AI Service)
- JWT-based authentication with refresh token rotation
- Role-based access control with granular permissions
- Horizontal scaling capability

---

### 4. [Deployment Guide](./DEPLOYMENT_GUIDE.md)
Complete deployment instructions for local, staging, and production environments.

**Contents:**
- Prerequisites and system requirements
- Local development setup
- Environment configuration with secure secrets
- Docker deployment (development and production)
- Database setup, migrations, and backups
- Production deployment options:
  - AWS (ECS, RDS, CloudFront)
  - DigitalOcean App Platform
  - VPS deployment (Ubuntu)
- CI/CD pipeline with GitHub Actions
- Monitoring and logging setup
- Backup and recovery procedures
- Troubleshooting common issues
- Security checklists

**Quick Start:**
```bash
# Clone repository
git clone https://github.com/yourorg/engida.git
cd engida

# Setup environment
cp .env.example .env

# Start with Docker Compose
docker-compose up

# Services available at:
# Frontend: http://localhost:3001
# Backend: http://localhost:3000
# AI Service: http://localhost:8000
```

---

### 5. [Development Workflow Guide](./DEVELOPMENT_WORKFLOW.md)
Best practices and workflows for contributing to the project.

**Contents:**
- Getting started guide
- Development environment setup
- Git workflow and branching strategy
- Commit conventions (Conventional Commits)
- Code standards for TypeScript and Python
- Testing strategies (unit, integration, e2e)
- Code review process
- Database workflows and migrations
- API development best practices
- Frontend development patterns
- Debugging techniques
- Common development tasks

**Branching Strategy:**
- `main` - Production code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

---

### 6. [Frontend Component Library](./FRONTEND_COMPONENTS.md)
Design system and component documentation for the frontend.

**Contents:**
- **Warm Architectural Modernism** design system
- Ethiopian-inspired color palette
- Typography system (EB Garamond, Manrope)
- Spacing and layout guidelines
- Component architecture patterns
- Layout components (AppHeader, AppFooter, AppShell)
- Core UI components (buttons, cards, forms, badges, icons)
- Feature components (AmenitySelector, GalleryManager, AiPricingWidget)
- Design tokens and CSS variables
- Admin console theme
- State management with Context API
- Custom React hooks
- Styling guidelines with Tailwind CSS 4
- Accessibility standards (WCAG, ARIA)
- Performance best practices

**Design System:**
- Brand Primary: `#234B36` (Deep forest green)
- Brand Canvas: `#F8F5ED` (Warm off-white)
- Brand Espresso: `#252923` (Deep brown-black)

---

### 7. [Security & Compliance Documentation](./SECURITY_COMPLIANCE.md)
Security protocols and compliance requirements.

**Contents:**
- Security architecture overview
- Authentication methods:
  - Email/password with bcrypt (12 rounds)
  - Google OAuth with CSRF protection
  - JWT tokens with 15-minute expiration
  - Refresh token rotation
- Authorization system:
  - Role-Based Access Control (RBAC)
  - 30+ granular permissions
  - Admin role hierarchy
- Data security:
  - Encryption at rest and in transit
  - Password security requirements
  - Database security measures
  - File upload validation
- API security:
  - Input validation with DTOs
  - Rate limiting
  - CORS configuration
  - CSRF protection
- Infrastructure security:
  - Docker security best practices
  - SSL/TLS configuration
  - Firewall setup
- GDPR compliance:
  - Data protection principles
  - User rights (access, rectification, erasure, portability)
  - Consent management
  - Data retention policies
- Privacy policy requirements
- Incident response plan
- Security audit checklist

**Security Highlights:**
- Defense in depth with multiple security layers
- Zero trust architecture
- Regular security audits
- Automated vulnerability scanning

---

## 🚀 Quick Links

### For New Developers
1. Start with [Architecture Documentation](./ARCHITECTURE.md) to understand the system
2. Follow [Development Workflow Guide](./DEVELOPMENT_WORKFLOW.md) to set up your environment
3. Review [API Documentation](./API_DOCUMENTATION.md) for available endpoints
4. Check [Frontend Component Library](./FRONTEND_COMPONENTS.md) for UI patterns

### For DevOps Engineers
1. Review [Deployment Guide](./DEPLOYMENT_GUIDE.md) for infrastructure setup
2. Check [Security & Compliance Documentation](./SECURITY_COMPLIANCE.md) for security requirements
3. Reference [Database Schema Documentation](./DATABASE_SCHEMA.md) for database architecture

### For Product Managers
1. [Architecture Documentation](./ARCHITECTURE.md) - System capabilities and limitations
2. [API Documentation](./API_DOCUMENTATION.md) - Feature availability
3. [Security & Compliance Documentation](./SECURITY_COMPLIANCE.md) - Data protection and compliance

---

## 🏗️ System Overview

### Technology Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Leaflet for maps

**Backend:**
- NestJS 11
- TypeScript 5
- Node.js 20+
- TypeORM
- PostgreSQL 14+

**AI Service:**
- FastAPI
- Python 3.11+
- Pydantic

**Infrastructure:**
- Docker & Docker Compose
- PostgreSQL 14+
- Cloudinary (image storage)
- Nginx (reverse proxy)

### Key Features

**For Guests:**
- Property search and filtering
- AI-powered recommendations
- Booking management
- Secure payments (Chapa, TeleBirr)
- Review system
- Google Sign-In

**For Hosts:**
- Property listing management
- Multi-room properties
- Gallery management
- AI pricing suggestions
- Booking calendar
- Earnings tracking
- Host profile with verification

**For Admins:**
- User management with RBAC
- Property moderation workflow
- Booking oversight and management
- Finance operations (refunds, payouts)
- Support case management
- Analytics dashboard
- System settings
- Audit logging

---

## 📊 Project Statistics

- **200+** API endpoints
- **50+** database tables
- **25+** backend modules
- **30+** admin permissions
- **10+** payment methods supported
- **3** services (Frontend, Backend, AI)
- **99.9%** target uptime

---

## 🔧 Development Commands

### Backend
```bash
cd backend

# Development
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Tests
npm test
npm run test:cov

# Migrations
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert

# Linting
npm run lint
npm run format
```

### Frontend
```bash
cd frontend

# Development
npm run dev

# Build
npm run build

# Production
npm start

# Linting
npm run lint
```

### AI Service
```bash
cd ai-service

# Activate virtual environment
source venv/bin/activate

# Development
uvicorn app.main:app --reload --port 8000

# Tests
pytest

# Linting
black app/ tests/
flake8 app/ tests/
```

### Docker
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose up --build
```

---

## 🌍 Environment Variables

Required environment variables for local development:

```env
# Database
DATABASE_URL=postgresql://engida:1921@localhost:5433/engida

# Backend
PORT=3000
NODE_ENV=development
JWT_ACCESS_SECRET=<generate-with-openssl-rand-base64-64>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-64>

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Cloudinary (optional for development)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Generate secure secrets:
```bash
openssl rand -base64 64
```

---

## 📝 Contributing

1. Read [Development Workflow Guide](./DEVELOPMENT_WORKFLOW.md)
2. Follow branching strategy (feature/*, fix/*)
3. Use conventional commits
4. Write tests for new features
5. Update documentation
6. Submit pull request
7. Address code review feedback

---

## 🔒 Security

For security issues, please email: security@engida.com

**Do not** create public issues for security vulnerabilities.

See [Security & Compliance Documentation](./SECURITY_COMPLIANCE.md) for details.

---

## 📞 Support

- **Documentation Issues**: Create an issue on GitHub
- **Development Questions**: Team Slack channel
- **Security Concerns**: security@engida.com
- **General Inquiries**: support@engida.com

---

## 📄 License

Private - ENGIDA Project

---

## 🙏 Acknowledgments

Built with ❤️ for Ethiopia by the Engida Development Team.

---

**Last Updated**: January 2024  
**Documentation Version**: 1.0.0  
**Platform Version**: 1.0.0
