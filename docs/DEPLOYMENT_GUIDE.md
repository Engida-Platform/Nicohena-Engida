# Engida Deployment Guide

**Version**: 1.0.0  
**Last Updated**: January 2024

Complete deployment guide for the Engida Ethiopian Property Marketplace platform covering local development, staging, and production environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Docker Deployment](#docker-deployment)
5. [Database Setup](#database-setup)
6. [Production Deployment](#production-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | Backend & Frontend runtime |
| npm | 9+ | Package manager |
| PostgreSQL | 14+ | Database |
| Docker | 24+ | Containerization |
| Docker Compose | 2.0+ | Multi-container orchestration |
| Python | 3.11+ | AI Service |
| Git | 2.0+ | Version control |

### System Requirements

**Development:**
- RAM: 8GB minimum, 16GB recommended
- Storage: 20GB free space
- OS: Linux, macOS, or Windows (WSL2)

**Production:**
- RAM: 16GB minimum, 32GB recommended
- Storage: 100GB+ with SSD
- CPU: 4+ cores
- OS: Ubuntu 22.04 LTS or similar

### Account Requirements

- **Cloudinary**: For image storage
- **Google Cloud**: For OAuth authentication
- **Payment Providers**: Chapa and/or TeleBirr accounts
- **Domain Name**: For production deployment
- **SSL Certificate**: Let's Encrypt or commercial

---

## Local Development Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/engida.git
cd engida
```

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
npm ci
cd ..
```

**Frontend:**
```bash
cd frontend
npm ci
cd ..
```

**AI Service:**
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Step 3: Setup PostgreSQL

**Option A: Local PostgreSQL Installation**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql@14
brew services start postgresql@14

# Start PostgreSQL
sudo systemctl start postgresql
```

**Create Database:**
```bash
sudo -u postgres psql

-- In PostgreSQL shell:
CREATE DATABASE engida;
CREATE USER engida WITH ENCRYPTED PASSWORD '1921';
GRANT ALL PRIVILEGES ON DATABASE engida TO engida;
\q
```

**Option B: Docker PostgreSQL**

```bash
docker run --name engida-postgres \
  -e POSTGRES_DB=engida \
  -e POSTGRES_USER=engida \
  -e POSTGRES_PASSWORD=1921 \
  -p 5433:5432 \
  -d postgres:14
```

### Step 4: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

See [Environment Configuration](#environment-configuration) section for details.

### Step 5: Run Database Migrations

```bash
cd backend
npm run migration:run
```

### Step 6: Start Services

**Option A: Run Individually**

Terminal 1 - Backend:
```bash
cd backend
npm run start:dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Terminal 3 - AI Service:
```bash
cd ai-service
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Option B: Use Docker Compose (Recommended)**

```bash
docker-compose up
```

### Step 7: Verify Installation

Open your browser and navigate to:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **AI Service**: http://localhost:8000/docs

**Health Check:**
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","database":"connected"}
```

---

## Environment Configuration

### Root .env File

Create `.env` in the project root with the following variables:

```env
# ================================================================
# ENGIDA PLATFORM ENVIRONMENT CONFIGURATION
# ================================================================

# --- Database Configuration ---
DATABASE_URL=postgresql://engida:1921@localhost:5433/engida
DOCKER_DATABASE_URL=postgresql://engida:1921@host.docker.internal:5433/engida

# --- Backend API Service (Port: 3000) ---
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:3000

# --- JWT Configuration ---
# Generate secure secrets using: openssl rand -base64 32
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-min-32-chars
JWT_REFRESH_EXPIRATION=7d

# --- Google OAuth ---
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# --- AI Service (Port: 8000) ---
AI_SERVICE_URL=http://localhost:8000

# --- Frontend Client (Port: 3001) ---
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_AI=false

# --- Cloudinary (Image Storage) ---
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# --- Payment Providers ---
CHAPA_SECRET_KEY=your-chapa-secret-key
CHAPA_WEBHOOK_SECRET=your-chapa-webhook-secret
TELEBIRR_APP_ID=your-telebirr-app-id
TELEBIRR_APP_KEY=your-telebirr-app-key

# --- Email Configuration (Optional) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@engida.com
```

### Generating Secure Secrets

**JWT Secrets:**
```bash
# Generate access secret
openssl rand -base64 64

# Generate refresh secret
openssl rand -base64 64
```

**Example Output:**
```
JWT_ACCESS_SECRET=xK9mP3nQ7rS2tU4vW6yZ8aB0cD1eF3gH5jK7lM9nP0qR2sT4uV6wX8yZ0aB2cD4e
JWT_REFRESH_SECRET=eF3gH5jK7lM9nP0qR2sT4uV6wX8yZ0aB2cD4eF6gH8jK0lM2nP4qR6sT8uV0wX2y
```

### Environment-Specific Configurations

**Development (.env.development):**
```env
NODE_ENV=development
DATABASE_SYNCHRONIZE=false  # Always use migrations
LOG_LEVEL=debug
ENABLE_SWAGGER=true
CORS_ORIGIN=http://localhost:3001
```

**Staging (.env.staging):**
```env
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/engida
FRONTEND_URL=https://staging.engida.com
BACKEND_URL=https://api-staging.engida.com
LOG_LEVEL=info
ENABLE_SWAGGER=true
```

**Production (.env.production):**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/engida
FRONTEND_URL=https://engida.com
BACKEND_URL=https://api.engida.com
LOG_LEVEL=warn
ENABLE_SWAGGER=false
DATABASE_SSL=true
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Security Best Practices

1. **Never commit .env files to version control**
   ```bash
   # .gitignore already includes
   .env
   .env.*
   ```

2. **Use strong, unique secrets for each environment**

3. **Rotate secrets regularly (every 90 days)**

4. **Use environment-specific secrets**
   - Development: Simple for ease of use
   - Staging: Similar to production
   - Production: Maximum security

5. **Store production secrets in secure vaults**
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault

---

## Docker Deployment

### Development with Docker Compose

The provided `docker-compose.yml` sets up all services for local development.

**Start all services:**
```bash
docker-compose up
```

**Start in detached mode:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f

# Service-specific logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f ai-service
```

**Stop services:**
```bash
docker-compose down
```

**Rebuild after code changes:**
```bash
docker-compose up --build
```

**Clean rebuild (remove volumes):**
```bash
docker-compose down -v
docker-compose up --build
```

### Docker Compose Configuration Explained

```yaml
services:
  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"  # Maps host:container
    volumes:
      - ./frontend:/app          # Live code reload
      - /app/node_modules        # Preserve node_modules
      - /app/.next               # Preserve Next.js cache
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    depends_on:
      - backend
    networks:
      - engida-network

  # Backend Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://...
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
    depends_on:
      - ai-service
    extra_hosts:
      - "host.docker.internal:host-gateway"  # Access host DB
    networks:
      - engida-network

  # AI Service
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./ai-service:/app
    environment:
      - DEBUG=true
    networks:
      - engida-network

networks:
  engida-network:
    driver: bridge
```

### Production Docker Setup

**Production Dockerfile (Backend):**

Create `backend/Dockerfile.prod`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

CMD ["node", "dist/src/main"]
```

**Production Dockerfile (Frontend):**

Create `frontend/Dockerfile.prod`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3001

CMD ["npm", "start"]
```

**Production Docker Compose:**

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: always
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${BACKEND_URL}
    depends_on:
      - backend
    networks:
      - engida-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - postgres
    networks:
      - engida-network

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8000:8000"
    environment:
      - DEBUG=false
    networks:
      - engida-network

  postgres:
    image: postgres:14-alpine
    restart: always
    environment:
      - POSTGRES_DB=engida
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - engida-network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - engida-network

volumes:
  postgres-data:

networks:
  engida-network:
    driver: bridge
```

---

## Database Setup

### Initial Setup

**1. Create Database:**
```bash
# Connect to PostgreSQL
psql -U postgres

-- Create database and user
CREATE DATABASE engida;
CREATE USER engida_admin WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE engida TO engida_admin;

-- Connect to engida database
\c engida

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO engida_admin;
```

**2. Run Migrations:**
```bash
cd backend
npm run migration:run
```

**3. Verify Migrations:**
```bash
# Check migration status
npm run typeorm migration:show
```

### Creating New Migrations

**Generate migration from entity changes:**
```bash
npm run migration:generate -- src/database/migrations/AddNewFeature
```

**Create empty migration:**
```bash
npm run typeorm migration:create -- src/database/migrations/AddNewFeature
```

**Run migrations:**
```bash
npm run migration:run
```

**Revert last migration:**
```bash
npm run migration:revert
```

### Database Seeding

**Seed sample properties:**
```bash
cd backend
npm run seed:properties
```

### Database Backup

**Create backup:**
```bash
# Full database backup
pg_dump -U engida_admin -d engida -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).dump

# SQL format backup
pg_dump -U engida_admin -d engida > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore backup:**
```bash
# From custom format
pg_restore -U engida_admin -d engida -v backup_20240115_120000.dump

# From SQL format
psql -U engida_admin -d engida < backup_20240115_120000.sql
```

**Automated daily backup script:**

Create `scripts/backup-db.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/engida"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/engida_$TIMESTAMP.dump"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -U engida_admin -d engida -F c -b -v -f $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "engida_*.dump.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Setup cron job:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/engida-backup.log 2>&1
```

---

## Production Deployment

### Cloud Platform Options

#### Option 1: AWS Deployment

**Architecture:**
```
CloudFront (CDN)
    │
    ├─→ S3 (Static Assets)
    │
    └─→ ALB (Load Balancer)
         ├─→ ECS/Fargate (Frontend)
         ├─→ ECS/Fargate (Backend)
         ├─→ ECS/Fargate (AI Service)
         └─→ RDS PostgreSQL
```

**Services:**
- **Frontend**: ECS Fargate + CloudFront
- **Backend**: ECS Fargate + ALB
- **Database**: RDS PostgreSQL Multi-AZ
- **Storage**: S3 + CloudFront
- **Cache**: ElastiCache Redis (future)
- **Monitoring**: CloudWatch

**Setup Steps:**

1. **Create RDS PostgreSQL Instance:**
```bash
aws rds create-db-instance \
  --db-instance-identifier engida-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14 \
  --master-username admin \
  --master-user-password <secure-password> \
  --allocated-storage 100 \
  --backup-retention-period 7 \
  --multi-az
```

2. **Build and Push Docker Images:**
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
docker build -f backend/Dockerfile.prod -t engida-backend .
docker tag engida-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/engida-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/engida-backend:latest

# Repeat for frontend and ai-service
```

3. **Create ECS Task Definitions:**

See `infrastructure/aws/task-definitions/` for examples.

4. **Configure Application Load Balancer:**
- Target groups for frontend, backend, AI service
- Health checks
- SSL certificate (ACM)

5. **Setup CloudFront:**
- Origin: ALB
- Behaviors: API paths → backend, default → frontend
- Custom domain with Route53

#### Option 2: DigitalOcean App Platform

**Setup Steps:**

1. **Create App:**
```bash
doctl apps create --spec digitalocean-app.yaml
```

**digitalocean-app.yaml:**
```yaml
name: engida
region: nyc

databases:
  - name: engida-db
    engine: PG
    version: "14"
    size: db-s-2vcpu-4gb

services:
  - name: backend
    github:
      repo: yourusername/engida
      branch: main
      deploy_on_push: true
    source_dir: /backend
    dockerfile_path: Dockerfile.prod
    health_check:
      http_path: /health
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${engida-db.DATABASE_URL}
      - key: JWT_ACCESS_SECRET
        scope: RUN_TIME
        type: SECRET
        value: <encrypted>

  - name: frontend
    github:
      repo: yourusername/engida
      branch: main
    source_dir: /frontend
    dockerfile_path: Dockerfile.prod
    envs:
      - key: NEXT_PUBLIC_API_URL
        value: https://api.engida.com

  - name: ai-service
    github:
      repo: yourusername/engida
      branch: main
    source_dir: /ai-service
    dockerfile_path: Dockerfile
```

#### Option 3: VPS Deployment (Ubuntu)

**Server Setup:**

1. **Initial Server Configuration:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install nginx
```

2. **Clone Repository:**
```bash
cd /var/www
sudo git clone https://github.com/yourusername/engida.git
sudo chown -R $USER:$USER engida
cd engida
```

3. **Configure Environment:**
```bash
cp .env.example .env.production
nano .env.production
# Update with production values
```

4. **Setup PostgreSQL:**
```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb engida
sudo -u postgres createuser engida_admin
sudo -u postgres psql -c "ALTER USER engida_admin WITH PASSWORD 'secure_password';"
```

5. **Run Migrations:**
```bash
cd backend
npm ci
npm run migration:run
```

6. **Configure Nginx:**

Create `/etc/nginx/sites-available/engida`:
```nginx
# Frontend
server {
    listen 80;
    server_name engida.com www.engida.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.engida.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
        add_header Access-Control-Allow-Headers 'Authorization, Content-Type';
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://localhost:3000/health;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/engida /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

7. **Setup SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d engida.com -d www.engida.com -d api.engida.com
```

8. **Setup Systemd Services:**

**Backend Service** (`/etc/systemd/system/engida-backend.service`):
```ini
[Unit]
Description=Engida Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/engida/backend
EnvironmentFile=/var/www/engida/.env.production
ExecStart=/usr/bin/node dist/src/main.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Frontend Service** (`/etc/systemd/system/engida-frontend.service`):
```ini
[Unit]
Description=Engida Frontend
After=network.target engida-backend.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/engida/frontend
EnvironmentFile=/var/www/engida/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start services:
```bash
sudo systemctl enable engida-backend engida-frontend
sudo systemctl start engida-backend engida-frontend
sudo systemctl status engida-backend engida-frontend
```

9. **Setup Firewall:**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Engida Platform

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: 20
  PYTHON_VERSION: 3.11

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run linter
        working-directory: ./backend
        run: npm run lint
      
      - name: Run tests
        working-directory: ./backend
        run: npm test
      
      - name: Build
        working-directory: ./backend
        run: npm run build

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Run linter
        working-directory: ./frontend
        run: npm run lint
      
      - name: Build
        working-directory: ./frontend
        run: npm run build

  test-ai-service:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      
      - name: Install dependencies
        working-directory: ./ai-service
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      
      - name: Run tests
        working-directory: ./ai-service
        run: pytest

  deploy-staging:
    needs: [test-backend, test-frontend, test-ai-service]
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Staging
        env:
          DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}
          HOST: ${{ secrets.STAGING_HOST }}
        run: |
          echo "$DEPLOY_KEY" > deploy_key
          chmod 600 deploy_key
          ssh -i deploy_key -o StrictHostKeyChecking=no user@$HOST << 'EOF'
            cd /var/www/engida
            git pull origin staging
            docker-compose -f docker-compose.prod.yml up -d --build
          EOF

  deploy-production:
    needs: [test-backend, test-frontend, test-ai-service]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Production
        env:
          DEPLOY_KEY: ${{ secrets.PRODUCTION_DEPLOY_KEY }}
          HOST: ${{ secrets.PRODUCTION_HOST }}
        run: |
          echo "$DEPLOY_KEY" > deploy_key
          chmod 600 deploy_key
          ssh -i deploy_key -o StrictHostKeyChecking=no user@$HOST << 'EOF'
            cd /var/www/engida
            git pull origin main
            npm run migration:run
            docker-compose -f docker-compose.prod.yml up -d --build
          EOF
```

---

## Monitoring & Logging

### Application Logging

**Backend Logging:**
```typescript
// src/common/logger.ts
import { Logger } from '@nestjs/common';

export class AppLogger extends Logger {
  log(message: string, context?: string) {
    super.log(JSON.stringify({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
    }));
  }

  error(message: string, trace?: string, context?: string) {
    super.error(JSON.stringify({
      level: 'error',
      message,
      trace,
      context,
      timestamp: new Date().toISOString(),
    }));
  }
}
```

### Log Management

**Setup Log Rotation:**

Create `/etc/logrotate.d/engida`:
```
/var/www/engida/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload engida-backend
        systemctl reload engida-frontend
    endscript
}
```

### Health Checks

**Backend Health Endpoint:**
```typescript
@Get('health')
async healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await this.checkDatabase(),
    memory: process.memoryUsage(),
  };
}
```

**Monitoring Script:**

Create `scripts/health-check.sh`:
```bash
#!/bin/bash

BACKEND_URL="https://api.engida.com/health"
FRONTEND_URL="https://engida.com"

# Check backend
if curl -sf "$BACKEND_URL" > /dev/null; then
    echo "Backend: OK"
else
    echo "Backend: FAILED"
    # Send alert
fi

# Check frontend
if curl -sf "$FRONTEND_URL" > /dev/null; then
    echo "Frontend: OK"
else
    echo "Frontend: FAILED"
    # Send alert
fi
```

### Performance Monitoring

**Key Metrics to Monitor:**
- Response times (P50, P95, P99)
- Error rates
- Request throughput
- Database query times
- Memory usage
- CPU utilization
- Disk I/O

**Tools:**
- Application: New Relic, Datadog, or Sentry
- Infrastructure: Prometheus + Grafana
- Logs: ELK Stack (Elasticsearch, Logstash, Kibana)

---

## Backup & Recovery

### Automated Backup Strategy

**Daily backups:**
- Database: Full dump at 2 AM
- Files: Incremental backup at 3 AM

**Weekly backups:**
- Full system backup on Sundays at 1 AM

**Retention:**
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months

### Disaster Recovery Plan

**RTO (Recovery Time Objective):** 4 hours  
**RPO (Recovery Point Objective):** 24 hours

**Recovery Steps:**

1. **Provision new server** (if needed)
2. **Install dependencies** (Docker, PostgreSQL, etc.)
3. **Restore database** from latest backup
4. **Deploy application** from Git repository
5. **Configure environment** variables
6. **Start services** and verify
7. **Update DNS** to point to new server

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string in .env
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### 2. Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

#### 3. Docker Build Fails

**Symptom:**
```
ERROR: failed to solve: process "/bin/sh -c npm ci" did not complete successfully
```

**Solutions:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -f Dockerfile.dev .
```

#### 4. Migration Errors

**Symptom:**
```
QueryFailedError: relation "users" already exists
```

**Solutions:**
```bash
# Check migration status
npm run typeorm migration:show

# Revert last migration
npm run migration:revert

# Run migrations again
npm run migration:run
```

#### 5. Frontend Can't Connect to Backend

**Symptom:**
```
Network Error: Failed to fetch
```

**Solutions:**
```bash
# Check NEXT_PUBLIC_API_URL in .env
echo $NEXT_PUBLIC_API_URL

# Verify backend is running
curl http://localhost:3000/health

# Check CORS configuration in backend
# Ensure FRONTEND_URL is correct
```

### Performance Issues

#### Slow Database Queries

**Diagnosis:**
```sql
-- Enable query logging
ALTER DATABASE engida SET log_statement = 'all';
ALTER DATABASE engida SET log_duration = on;
ALTER DATABASE engida SET log_min_duration_statement = 100;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Solutions:**
- Add indexes on frequently queried columns
- Use query explain plans
- Optimize N+1 queries with eager loading
- Consider database connection pooling

#### High Memory Usage

**Diagnosis:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check Node.js memory
node --inspect dist/main.js
```

**Solutions:**
```javascript
// Increase Node.js memory limit
node --max-old-space-size=4096 dist/main.js

// Or in package.json
"start:prod": "node --max-old-space-size=4096 dist/main.js"
```

### Getting Help

**Log Files:**
- Backend: `/var/www/engida/backend/logs/`
- Frontend: `/var/www/engida/frontend/.next/`
- Nginx: `/var/log/nginx/`
- PostgreSQL: `/var/log/postgresql/`

**Check Service Status:**
```bash
sudo systemctl status engida-backend
sudo systemctl status engida-frontend
sudo systemctl status postgresql
sudo systemctl status nginx
```

**View Service Logs:**
```bash
sudo journalctl -u engida-backend -f
sudo journalctl -u engida-frontend -f
```

---

## Security Checklist

### Pre-Deployment Security

- [ ] All environment variables set securely
- [ ] JWT secrets are strong and unique
- [ ] Database credentials are complex
- [ ] HTTPS/SSL certificate configured
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Database backups automated
- [ ] Security headers configured (Helmet.js)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Password hashing with bcrypt
- [ ] Sensitive data encrypted at rest
- [ ] Audit logging enabled
- [ ] Dependency vulnerabilities scanned

### Post-Deployment Security

- [ ] Monitor logs for suspicious activity
- [ ] Regular security updates
- [ ] Penetration testing performed
- [ ] SSL certificate renewal automated
- [ ] Backup restoration tested
- [ ] Incident response plan documented
- [ ] Access controls reviewed
- [ ] API keys rotated regularly

---

## Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed and merged
- [ ] Tests passing
- [ ] Environment variables configured
- [ ] Database migrations prepared
- [ ] SSL certificate obtained
- [ ] DNS records configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Rollback plan documented

### Deployment

- [ ] Notify team of deployment
- [ ] Create database backup
- [ ] Run database migrations
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Deploy AI service
- [ ] Verify health endpoints
- [ ] Run smoke tests
- [ ] Monitor logs for errors
- [ ] Update documentation

### Post-Deployment

- [ ] Verify all features working
- [ ] Check monitoring dashboards
- [ ] Review error logs
- [ ] Test critical user flows
- [ ] Notify team of completion
- [ ] Update status page
- [ ] Document any issues

---

## Additional Resources

### Documentation
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeORM Documentation](https://typeorm.io)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com)

### Tools
- [Docker Compose](https://docs.docker.com/compose/)
- [Let's Encrypt](https://letsencrypt.org)
- [Nginx](https://nginx.org/en/docs/)
- [PM2 Process Manager](https://pm2.keymetrics.io)

### Community
- GitHub Issues
- Discord Server
- Stack Overflow

---

**Document Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintained By**: Engida Development Team
