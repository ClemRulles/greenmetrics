# GreenMetrics - ESG Reporting Platform

A bilingual (EN/FR) web application that helps EU SMEs collect ESG inputs, compute Scopes 1–2 CO₂e emissions, and generate compliant PDF reports aligned with CSRD/GRI standards.

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database URL and other settings
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

## 🏗️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Validation**: Zod
- **Forms**: React Hook Form
- **Internationalization**: English and French support

## 📁 Project Structure

```
├── docs/                   # Project documentation
│   ├── PRD.md             # Product Requirements Document
│   ├── architecture.md    # Architecture overview
│   ├── testing.md         # Testing strategy
│   ├── security-privacy.md # Security and privacy guidelines
│   ├── i18n.md           # Internationalization plan
│   ├── release-plan.md   # Deployment strategy
│   ├── openapi.yaml      # API specification
│   └── adr/              # Architecture Decision Records
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   └── lib/              # Utility functions
├── prisma/
│   └── schema.prisma     # Database schema
├── public/
│   └── locales/          # i18n translations
│       ├── en/           # English translations
│       └── fr/           # French translations
└── .env.example          # Environment variables template
```

## 🗃️ Database Setup

1. **Install Prisma CLI** (if not already installed)
   ```bash
   npm install -g prisma
   ```

2. **Initialize database**
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

## 🌍 Internationalization

The app supports English and French:
- Routes: `/en/*` and `/fr/*`
- Translations in `public/locales/`
- Automatic language detection based on browser settings

## 📚 Documentation

- [Product Requirements Document](./docs/PRD.md)
- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/openapi.yaml)
- [Testing Strategy](./docs/testing.md)
- [Security & Privacy](./docs/security-privacy.md)
- [Release Plan](./docs/release-plan.md)

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

## 🚀 Deployment

The project is configured for deployment on Vercel with:
- Automatic deployments from main branch
- Preview deployments for pull requests
- Environment variables managed through Vercel dashboard

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/greenmetrics"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI (optional, for AI features)
OPENAI_API_KEY="your-openai-key"

# Security & CDN
CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
CLOUDFLARE_ZONE_ID="your-cloudflare-zone-id"

# Webhook Security
STRIPE_WEBHOOK_SECRET="whsec_your-stripe-webhook-secret"
GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"
CUSTOM_WEBHOOK_SECRET="your-custom-webhook-secret"

# Rate Limiting & Cache
REDIS_URL="redis://localhost:6379"
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Monitoring & Analytics
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
POSTHOG_KEY="phc_your-posthog-key"
POSTHOG_HOST="https://app.posthog.com"

# Production Security
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
CSP_REPORT_URI="https://your-csp-reporting-endpoint"
```

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

For detailed development guidelines, see the [Architecture Documentation](./docs/architecture.md).
