# Environment Configuration Guide

## Overview

This guide documents all environment variables used in GreenMetrics, organized by category and environment requirements.

## Database Configuration

### Basic Database Settings

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `DATABASE_URL` | Primary database connection string | Yes | - | `postgresql://user:pass@localhost:5432/db` |
| `DATABASE_URL_WRITE` | Write operations database URL | Staging/Prod | `DATABASE_URL` | `postgresql://user:pass@primary.aws.com:5432/db` |
| `DATABASE_URL_READ` | Read operations database URL | Prod | `DATABASE_URL_WRITE` | `postgresql://user:pass@replica.aws.com:5432/db` |

### High Availability Settings

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `DB_READ_REPLICA_ENABLED` | Enable read replica usage | No | `false` | `true` |
| `PRIMARY_REGION` | Primary region for leader election | Staging/Prod | - | `eu-west-3` |
| `READ_AFTER_WRITE_MS` | Consistency window after writes | No | `1500` | `1500` |

### Connection Pooling

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `DATABASE_POOL_MIN` | Minimum database connections | No | `2` | `2` |
| `DATABASE_POOL_MAX` | Maximum database connections | No | `10` | `20` |
| `DATABASE_READ_POOL_MIN` | Minimum read connections | No | `2` | `2` |
| `DATABASE_READ_POOL_MAX` | Maximum read connections | No | `20` | `30` |

## Redis Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `REDIS_URL` | Redis connection string | Staging/Prod | - | `redis://localhost:6379` |
| `REDIS_PREFIX` | Key prefix for multi-tenant | No | `greenmetrics:dev` | `greenmetrics:prod` |
| `REDIS_TTL_DEFAULT` | Default TTL in seconds | No | `3600` | `3600` |

## Storage Configuration

### Storage Driver

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `STORAGE_DRIVER` | Storage backend driver | No | `local` | `s3` |
| `STORAGE_LOCAL_DIR` | Local storage directory | No | `.data/exports` | `/app/storage` |

### S3 Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `AWS_REGION` | AWS region | S3 only | - | `eu-west-3` |
| `AWS_ACCESS_KEY_ID` | AWS access key | S3 only | - | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | S3 only | - | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `STORAGE_S3_BUCKET_EXPORTS` | Exports bucket name | S3 only | - | `greenmetrics-exports-prod` |
| `STORAGE_S3_BUCKET_EVIDENCE` | Evidence bucket name | S3 only | - | `greenmetrics-evidence-prod` |

## Authentication & Security

### NextAuth Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `NEXTAUTH_SECRET` | NextAuth encryption secret | Yes | - | `32-char-random-string` |
| `NEXTAUTH_URL` | Application base URL | Yes | - | `https://app.greenmetrics.com` |

### OAuth Providers

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | No | - | `Iv1.abc123` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | No | - | `secret123` |

### Security Secrets

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `SIGNED_URL_SECRET` | Signed URL encryption key | Yes | - | `32-char-random-string` |
| `JOB_SECRET` | Background job authentication | Yes | - | `32-char-random-string` |

## Billing & Payments

### Stripe Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | Prod | - | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Prod | - | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Prod | - | `whsec_...` |

### Stripe Pricing

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `STRIPE_PRICE_BASIC_EUR` | Basic plan price ID | Prod | - | `price_1ABC123` |
| `STRIPE_PRICE_PRO_EUR` | Pro plan price ID | Prod | - | `price_1DEF456` |

## Monitoring & Observability

### Sentry Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `SENTRY_DSN` | Sentry error tracking DSN | Staging/Prod | - | `https://abc@sentry.io/123` |
| `SENTRY_ENV` | Sentry environment name | No | `development` | `production` |
| `SENTRY_TRACES_SAMPLE_RATE` | Performance monitoring rate | No | `0.0` | `0.1` |

### PostHog Analytics

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `POSTHOG_KEY` | PostHog project key | Prod | - | `phc_abc123` |
| `POSTHOG_HOST` | PostHog instance URL | No | `https://app.posthog.com` | `https://app.posthog.com` |
| `POSTHOG_ENABLED` | Enable analytics tracking | No | `true` | `true` |

### OpenTelemetry Tracing

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `OTEL_ENABLED` | Enable OpenTelemetry tracing | No | `false` | `true` |
| `OTEL_SERVICE_NAME` | Service name in traces | No | `greenmetrics-web` | `greenmetrics-web` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP traces endpoint | OTEL | - | `https://otel.example.com/v1/traces` |
| `OTEL_EXPORTER_OTLP_HEADERS` | OTLP authentication headers | No | - | `authorization=Bearer xyz` |
| `OTEL_TRACES_SAMPLER` | Sampling strategy | No | `parentbased_traceidratio` | `traceidratio` |
| `OTEL_TRACES_SAMPLER_ARG` | Sampling ratio (0.0-1.0) | No | `0.1` | `0.01` |
| `DEPLOY_ENV` | Deployment environment | No | `development` | `production` |
| `REGION` | Deployment region | No | `local` | `eu-west-3` |

### Prometheus Metrics

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `PROMETHEUS_METRICS_ENABLED` | Enable metrics collection | No | `true` | `true` |
| `METRICS_BEARER_TOKEN` | Metrics API protection token | Staging/Prod | - | `secure-random-token-123` |

### Structured Logging

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `LOG_LEVEL` | Minimum log level | No | `info` | `debug` |
| `LOG_PRETTY` | Pretty print logs (development) | No | `false` | `true` |
| `LOG_REDACT_KEYS` | JSON array of keys to redact | No | `["authorization","email"]` | `["password","token"]` |

## Feature Flags

### Core Features

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `FEATURE_BILLING_ENABLED` | Enable billing features | No | `true` | `true` |
| `FEATURE_ANALYTICS_ENABLED` | Enable analytics tracking | No | `true` | `false` |
| `FEATURE_FACTORS_WRITE` | Allow factor modifications | No | `true` | `false` |

## Rate Limiting

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `RATE_LIMIT_ENABLED` | Enable rate limiting | No | `true` | `true` |
| `RATE_LIMIT_AUTH_PER_MINUTE` | Auth attempts per minute | No | `5` | `3` |
| `RATE_LIMIT_API_PER_MINUTE` | API calls per minute | No | `30` | `60` |

## Background Jobs

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `CRON_ENABLED` | Enable scheduled jobs | No | `true` | `true` |
| `CRON_TIMEZONE` | Cron timezone | No | `UTC` | `Europe/Paris` |

## Environment-Specific Examples

### Development

```bash
# Core
NODE_ENV=development
APP_ENV=development
APP_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/greenmetrics
DB_READ_REPLICA_ENABLED=false

# Storage
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=.data/exports

# Security
NEXTAUTH_SECRET=dev-secret-32-chars-minimum-length
SIGNED_URL_SECRET=dev-signed-url-secret-32-chars-min
JOB_SECRET=dev-job-secret-32-chars-minimum-len

# Features
FEATURE_BILLING_ENABLED=false
FEATURE_ANALYTICS_ENABLED=false
```

### Staging

```bash
# Core
NODE_ENV=staging
APP_ENV=staging
APP_BASE_URL=https://staging.greenmetrics.app

# Database
DATABASE_URL=postgresql://user:pass@staging-db.eu-west-3.rds.amazonaws.com:5432/greenmetrics
DATABASE_URL_WRITE=$DATABASE_URL
DATABASE_URL_READ=$DATABASE_URL
DB_READ_REPLICA_ENABLED=false
PRIMARY_REGION=eu-west-3

# Redis
REDIS_URL=redis://staging-redis.aws.com:6379
REDIS_PREFIX=greenmetrics:staging

# Storage
STORAGE_DRIVER=s3
AWS_REGION=eu-west-3
STORAGE_S3_BUCKET_EXPORTS=greenmetrics-exports-staging
STORAGE_S3_BUCKET_EVIDENCE=greenmetrics-evidence-staging

# Monitoring
SENTRY_DSN=https://abc@sentry.io/staging
SENTRY_ENV=staging
POSTHOG_ENABLED=true

# Features
FEATURE_BILLING_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true
```

### Production

```bash
# Core
NODE_ENV=production
APP_ENV=production
APP_BASE_URL=https://app.greenmetrics.com

# Database (Multi-Region HA)
DATABASE_URL_WRITE=postgresql://user:pass@primary.eu-west-3.rds.amazonaws.com:5432/greenmetrics
DATABASE_URL_READ=postgresql://readonly:pass@replica.eu-central-1.rds.amazonaws.com:5432/greenmetrics
DB_READ_REPLICA_ENABLED=true
PRIMARY_REGION=eu-west-3
READ_AFTER_WRITE_MS=1500

# Redis
REDIS_URL=redis://prod-redis.aws.com:6379
REDIS_PREFIX=greenmetrics:prod

# Storage
STORAGE_DRIVER=s3
AWS_REGION=eu-west-3
STORAGE_S3_BUCKET_EXPORTS=greenmetrics-exports-prod
STORAGE_S3_BUCKET_EVIDENCE=greenmetrics-evidence-prod

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring
SENTRY_DSN=https://abc@sentry.io/production
SENTRY_ENV=production
SENTRY_TRACES_SAMPLE_RATE=0.1
POSTHOG_KEY=phc_prod_key
POSTHOG_ENABLED=true

# Security
FORCE_HTTPS=true
SECURE_COOKIES=true
RATE_LIMIT_AUTH_PER_MINUTE=3
RATE_LIMIT_API_PER_MINUTE=60

# Features
FEATURE_BILLING_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true
FEATURE_AUDIT_LOG_ENABLED=true
```

## Validation

### Environment Validation Script

Use the built-in validation script to check your environment:

```bash
# Check current environment
npm run env:check

# Check production configuration
npm run env:check:prod

# Verbose output with details
npm run env:check:verbose
```

### Database HA Testing

Test multi-region database setup:

```bash
# Basic HA test
npm run db:ha-test

# Load testing
npm run db:ha-test:load

# Verbose output
npm run db:ha-test:verbose
```

### Health Checks

Monitor database health:

```bash
# Database health
curl https://app.greenmetrics.com/api/ops/db/health

# Database roles
curl https://app.greenmetrics.com/api/ops/db/role
```

## Security Best Practices

### Secret Management

1. **Never commit secrets to version control**
2. **Use environment-specific secret stores**:
   - Development: `.env.local` (gitignored)
   - Staging/Production: AWS Secrets Manager
3. **Rotate secrets regularly**:
   - Database credentials: Monthly
   - API keys: Quarterly
   - Encryption secrets: Annually

### Secret Generation

```bash
# Generate secure secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -base64 32  # For SIGNED_URL_SECRET
openssl rand -base64 32  # For JOB_SECRET
```

### Environment Isolation

1. **Separate AWS accounts** for staging and production
2. **Different database instances** per environment
3. **Isolated network configurations** (VPCs, security groups)
4. **Environment-specific monitoring** and alerting

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check `DATABASE_URL` format
   - Verify network connectivity
   - Check connection pool limits

2. **Read Replica Issues**:
   - Ensure `DATABASE_URL_READ` is accessible
   - Check replication lag
   - Verify `DB_READ_REPLICA_ENABLED` setting

3. **Rate Limiting**:
   - Adjust `RATE_LIMIT_*` variables
   - Check Redis connectivity
   - Monitor usage patterns

### Debug Commands

```bash
# Test database connectivity
npx prisma db push --preview-feature

# Check environment variables
env | grep DATABASE

# Validate configuration
npm run env:check:verbose
```
