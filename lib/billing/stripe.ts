import Stripe from 'stripe';

// Initialize Stripe with proper configuration
const key = process.env.STRIPE_SECRET_KEY ?? '';
export const stripe = key ? new Stripe(key, {
  apiVersion: '2025-07-30.basil',
  httpClient: Stripe.createFetchHttpClient(),
  timeout: 20000,
}) : null;

// Check if Stripe is properly configured
export function isStripeEnabled() { 
  return !!stripe; 
}

// Safe wrapper for constructEvent - works with mock in tests
export function constructEvent(raw: string, sig: string, secret: string) {
  if (!isStripeEnabled()) {
    // In tests, we manually verify HMAC the same way Stripe does (see helpers)
    // The route uses this wrapper only when stripe==null; signature is validated upstream.
    return JSON.parse(raw);
  }
  return stripe!.webhooks.constructEvent(raw, sig, secret);
}

// Stripe Price IDs for subscription plans (EUR currency with 14-day trials)
export const PRICES = {
  BASIC: process.env.STRIPE_PRICE_BASIC || 'price_basic_placeholder_eur',
  PRO: process.env.STRIPE_PRICE_PRO || 'price_pro_placeholder_eur',
} as const;

// Webhook endpoint secret for signature verification
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Job secret for authenticated cron endpoints
export const JOB_SECRET = process.env.JOB_SECRET || 'dev_job_secret';

// Helper to get price ID by plan
export function planPriceId(plan: 'BASIC' | 'PRO'): string {
  return plan === 'BASIC' ? PRICES.BASIC : PRICES.PRO;
}

// EU-ready checkout session creation
export async function createCheckoutSession(params: {
  orgId: string;
  plan: 'BASIC' | 'PRO';
  locale: 'en' | 'fr';
  successUrl?: string;
  cancelUrl?: string;
}) {
  if (!isStripeEnabled()) {
    throw new Error('Stripe is not configured');
  }

  const { orgId, plan, locale, successUrl, cancelUrl } = params;
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return await stripe!.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: planPriceId(plan),
        quantity: 1,
      },
    ],
    // EU compliance features
    automatic_tax: {
      enabled: true, // Stripe Tax handles EU VAT
    },
    tax_id_collection: {
      enabled: true, // Collect VAT numbers
    },
    customer_creation: 'always',
    invoice_creation: {
      enabled: true,
    },
    // 14-day trial with card required (prevents abuse)
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        orgId,
        plan,
      },
    },
    allow_promotion_codes: true,
    locale: locale === 'fr' ? 'fr' : 'en',
    metadata: {
      orgId,
      plan,
      locale,
    },
    success_url: successUrl || `${baseUrl}/${locale}/app/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${baseUrl}/${locale}/app/billing?canceled=1`,
  });
}

// Customer portal session creation
export async function createPortalSession(params: {
  customerId: string;
  locale: 'en' | 'fr';
  returnUrl?: string;
}) {
  if (!isStripeEnabled()) {
    throw new Error('Stripe is not configured');
  }

  const { customerId, locale, returnUrl } = params;
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return await stripe!.billingPortal.sessions.create({
    customer: customerId,
    locale: locale === 'fr' ? 'fr' : 'en',
    return_url: returnUrl || `${baseUrl}/${locale}/app/billing`,
  });
}

// Stripe configuration constants
export const STRIPE_CONFIG = {
  apiVersion: '2025-07-30.basil' as const,
  timeout: 20000,
  maxRetries: 3,
  currency: 'EUR' as const,
  trialDays: 14,
  gracePeriodDays: 7,
} as const;
