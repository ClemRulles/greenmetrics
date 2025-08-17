// Minimal Stripe mock for tests: constructEvent + typed events
import crypto from 'crypto';

export function signStripePayload(payload: string, secret: string) {
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${payload}`)
    .digest('hex');
  return `t=${ts},v1=${sig}`;
}

export function makeEvent<T = any>(type: string, data: T) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type,
    data: { object: data },
    created: Math.floor(Date.now() / 1000),
    api_version: '2024-06-20',
    object: 'event',
    pending_webhooks: 1,
    request: {
      id: `req_${Math.random().toString(36).slice(2)}`,
      idempotency_key: null,
    },
  };
}

// Typed event creators for common Stripe events
export function createCheckoutSession(params: {
  id?: string;
  orgId: string;
  plan: string;
  customerId?: string;
  subscriptionId?: string;
}) {
  return makeEvent('checkout.session.completed', {
    id: params.id || `cs_test_${Math.random().toString(36).slice(2)}`,
    object: 'checkout.session',
    metadata: {
      orgId: params.orgId,
      plan: params.plan,
    },
    customer: params.customerId || `cus_test_${Math.random().toString(36).slice(2)}`,
    subscription: params.subscriptionId || `sub_test_${Math.random().toString(36).slice(2)}`,
    customer_details: {
      address: {
        country: 'FR',
        postal_code: '75001',
      },
      name: 'Test Customer',
      email: 'test@example.com',
    },
  });
}

export function createSubscription(params: {
  id?: string;
  orgId: string;
  status?: string;
  customerId?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return makeEvent('customer.subscription.updated', {
    id: params.id || `sub_test_${Math.random().toString(36).slice(2)}`,
    object: 'subscription',
    metadata: {
      orgId: params.orgId,
    },
    customer: params.customerId || `cus_test_${Math.random().toString(36).slice(2)}`,
    status: params.status || 'active',
    current_period_start: now,
    current_period_end: now + 30 * 24 * 60 * 60, // 30 days
    trial_end: null,
  });
}

export function createInvoice(params: {
  id?: string;
  subscriptionId?: string;
  paid?: boolean;
  amountPaid?: number;
  amountDue?: number;
}) {
  return makeEvent(params.paid ? 'invoice.paid' : 'invoice.payment_failed', {
    id: params.id || `in_test_${Math.random().toString(36).slice(2)}`,
    object: 'invoice',
    subscription: params.subscriptionId || `sub_test_${Math.random().toString(36).slice(2)}`,
    amount_paid: params.amountPaid || (params.paid ? 4900 : 0), // €49.00
    amount_due: params.amountDue || 4900,
    currency: 'eur',
    status: params.paid ? 'paid' : 'open',
  });
}
