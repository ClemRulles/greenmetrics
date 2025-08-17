# Billing & Entitlements System (PR #22)

A comprehensive, EU-ready billing system with seat-based pricing, grace periods, and advanced features.

## Features

### 🇪🇺 EU Compliance
- **Stripe Tax Integration**: Automatic EU VAT collection and calculation
- **VAT ID Collection**: Optional VAT ID capture for business customers
- **GDPR Ready**: Customer data handling compliant with EU regulations
- **Multi-currency**: Euro (EUR) as primary currency with localization support

### 💺 Seat-Based Billing
- **Dynamic Seats**: Seats = accepted supplier links
- **Peak-of-Period**: Billing based on highest seat count in billing period
- **Proration Enabled**: Automatic prorated charges when upgrading/downgrading
- **Real-time Tracking**: Daily seat snapshots for accurate billing

### 🎯 Plan Structure
- **FREE**: Unlimited suppliers, basic features, no billing required
- **BASIC**: €19/month, enhanced features, 14-day trial (card required)
- **PRO**: €49/month, advanced features, 14-day trial (card required)

### ⏰ Grace Period System
- **7-Day Grace**: Grace period on payment failures
- **Reduced Limits**: 50% quota reduction during grace period
- **Automatic Recovery**: Full restoration when payment resumes
- **Feature Freeze**: Account freeze after grace period ends

### 🛡️ Entitlement Guards
- **Rate Limiting**: Entitlements tied to API rate limits
- **Feature Gates**: Fine-grained control over feature access
- **Usage Tracking**: Real-time usage monitoring and enforcement
- **Quota Management**: Per-plan limits with overflow protection

## Installation & Setup

### 1. Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
# Required Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_BASIC_EUR=price_1234567890
STRIPE_PRICE_PRO_EUR=price_0987654321

# Job Security
JOB_SECRET=your-secure-random-secret
```

### 2. Database Migration

Run the database migration to add billing tables:

```bash
npx prisma migrate dev --name add-billing-system
```

### 3. Stripe Configuration

In your Stripe Dashboard:

1. **Create Products & Prices**:
   - BASIC: €19/month with 14-day trial
   - PRO: €49/month with 14-day trial

2. **Enable Stripe Tax**:
   - Go to Settings > Tax
   - Enable automatic tax calculation
   - Configure EU VAT rules

3. **Configure Webhooks**:
   - Add endpoint: `https://yourapp.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

## API Endpoints

### Billing Management
- `POST /api/billing/checkout` - Create Stripe checkout session
- `POST /api/billing/portal` - Access customer portal
- `POST /api/billing/webhook` - Stripe webhook handler (Node.js runtime)

### Job Endpoints
- `POST /api/jobs/seat-snapshot` - Daily seat calculation job
- `GET /api/jobs/seat-snapshot` - Job health check

## Usage Examples

### Creating Checkout Session

```typescript
const response = await fetch('/api/billing/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orgId: 'org_123',
    plan: 'PRO',
    locale: 'en',
    successUrl: 'https://app.com/billing/success',
    cancelUrl: 'https://app.com/billing',
  }),
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe
```

### Checking Entitlements

```typescript
import { requireEntitlement } from '@/lib/billing/entitlements';

// In API route
await requireEntitlement(orgId, 'REPORTS_GENERATION', {
  increment: true, // Count this usage
});
```

### Usage Monitoring

```typescript
import { getUsageStats } from '@/lib/billing/entitlements';

const usage = await getUsageStats(orgId);
console.log({
  plan: usage.plan,
  inGracePeriod: usage.inGracePeriod,
  suppliers: usage.usage.suppliers,
  reports: usage.usage.reports,
});
```

## Cron Jobs

### Daily Seat Snapshots

Set up a daily cron job to calculate seat usage:

```bash
# Daily at 2 AM UTC
0 2 * * * curl -X POST https://yourapp.com/api/jobs/seat-snapshot \\
  -H "Content-Type: application/json" \\
  -d '{"secret":"your-job-secret"}'
```

## Architecture

### Database Schema

```sql
-- Core billing customer
CREATE TABLE billing_customers (
  id TEXT PRIMARY KEY,
  organization_id TEXT UNIQUE REFERENCES organizations(id),
  stripe_customer_id TEXT UNIQUE,
  email TEXT,
  name TEXT,
  country_code TEXT,
  vat_id TEXT,
  address JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions with grace period support
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES billing_customers(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status subscription_status DEFAULT 'INCOMPLETE',
  plan plan_type,
  quantity INTEGER DEFAULT 1,
  trial_end TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  in_grace_period BOOLEAN DEFAULT FALSE,
  grace_period_end TIMESTAMP,
  frozen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking for billing
CREATE TABLE usage_snapshots (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES billing_customers(id),
  period_key TEXT, -- "2025-08"
  reports_generated INTEGER DEFAULT 0,
  exports_requested INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  storage_used_bytes BIGINT DEFAULT 0,
  current_seats INTEGER DEFAULT 0,
  peak_seats INTEGER DEFAULT 0,
  snapshot_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, period_key)
);
```

### Quota System

```typescript
export const QUOTAS = {
  FREE: {
    supplierLinks: Infinity,
    reportsPerMonth: 50,
    storageGB: 1,
    apiCallsPerDay: 100,
  },
  BASIC: {
    supplierLinks: Infinity,
    reportsPerMonth: 500,
    storageGB: 10,
    apiCallsPerDay: 1000,
  },
  PRO: {
    supplierLinks: Infinity,
    reportsPerMonth: Infinity,
    storageGB: 100,
    apiCallsPerDay: 10000,
  },
} as const;
```

## Security Features

### Webhook Security
- Stripe signature verification
- Idempotency via event logging
- Node.js runtime for crypto compatibility

### Job Authentication
- Signed job secrets
- Request IP validation (optional)
- Rate limiting on job endpoints

### Data Protection
- Minimal PII storage
- Encrypted customer data
- GDPR deletion support

## Monitoring & Observability

### Key Metrics
- Seat utilization trends
- Grace period conversions
- Trial-to-paid conversion
- Churn prediction signals

### Error Handling
- Stripe webhook failures
- Payment method issues
- Quota violations
- Grace period notifications

## Testing

Run the comprehensive test suite:

```bash
npm test -- billing
```

Key test coverage:
- Entitlement enforcement
- Grace period logic
- Seat calculations
- Webhook processing
- Trial management

## Internationalization (i18n)

### Supported Locales
- **English (en)**: Default
- **French (fr)**: Full billing translations

### Translation Keys
- `billing.plans.*` - Plan descriptions
- `billing.checkout.*` - Checkout flow
- `billing.grace.*` - Grace period messaging
- `billing.entitlements.*` - Quota notifications

## Production Checklist

### Pre-Launch
- [ ] Configure production Stripe account
- [ ] Set up real price IDs in environment
- [ ] Configure webhook endpoints
- [ ] Test payment flows end-to-end
- [ ] Set up monitoring and alerts
- [ ] Configure cron jobs
- [ ] Test grace period flows
- [ ] Verify EU tax collection

### Post-Launch Monitoring
- [ ] Monitor webhook delivery success
- [ ] Track seat calculation accuracy
- [ ] Monitor grace period conversions
- [ ] Validate tax compliance
- [ ] Review billing accuracy

## Troubleshooting

### Common Issues

**Webhook Failures**
```typescript
// Check event log for idempotency
const existingEvent = await prisma.stripeEventLog.findUnique({
  where: { eventId: event.id }
});
```

**Seat Calculation Errors**
```typescript
// Manual seat recalculation
const seatData = await computeDailySeats();
console.log('Current seat metrics:', seatData);
```

**Grace Period Issues**
```typescript
// Check grace period status
const usage = await getUsageStats(orgId);
console.log('Grace period:', usage.inGracePeriod);
```

## Support & Documentation

- **Stripe Integration**: [Stripe Docs](https://stripe.com/docs)
- **EU Tax Compliance**: [Stripe Tax](https://stripe.com/tax)
- **Webhook Testing**: [Stripe CLI](https://stripe.com/docs/stripe-cli)
- **Billing Best Practices**: [SaaS Billing Guide](https://stripe.com/billing)

---

**This billing system provides production-ready, EU-compliant billing with optimal defaults for SaaS applications.**
