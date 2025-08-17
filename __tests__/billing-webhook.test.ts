import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockNextRequest } from '../tests/helpers/rawBody';
import { signStripePayload, createCheckoutSession, createSubscription, createInvoice } from '../tests/helpers/stripeMock';

// Mock Prisma
const mockPrisma = {
  stripeEventLog: {
    upsert: vi.fn(),
  },
};

// Mock the dependencies properly
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock constructEvent function
const mockConstructEvent = vi.fn();
vi.mock('@/lib/billing/stripe', () => ({
  constructEvent: mockConstructEvent,
  WEBHOOK_SECRET: 'whsec_test_secret',
}));

// Import the webhook handler
const webhookModule = await import('@/app/api/billing/webhook/route');

const SECRET = 'whsec_test_secret';

describe('Billing Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.stripeEventLog.upsert.mockResolvedValue({});
  });

  it('should verify webhook signature successfully', async () => {
    const event = createCheckoutSession({
      orgId: 'org-1',
      plan: 'BASIC',
    });

    mockConstructEvent.mockReturnValue(event);

    const payload = JSON.stringify(event);
    const sig = signStripePayload(payload, SECRET);
    const req = createMockNextRequest(event, {
      'stripe-signature': sig,
    });

    const response = await webhookModule.POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockConstructEvent).toHaveBeenCalledWith(payload, sig, SECRET);
  });

  it('should reject invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const event = createCheckoutSession({
      orgId: 'org-1',
      plan: 'BASIC',
    });

    const req = createMockNextRequest(event, {
      'stripe-signature': 'invalid_signature',
    });

    const response = await webhookModule.POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('invalid signature');
  });

  it('should handle missing stripe-signature header', async () => {
    const event = createCheckoutSession({
      orgId: 'org-1',
      plan: 'BASIC',
    });

    const req = createMockNextRequest(event);

    const response = await webhookModule.POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('invalid signature');
  });

  it('should handle checkout.session.completed event', async () => {
    const event = createCheckoutSession({
      orgId: 'org-1',
      plan: 'BASIC',
    });

    mockConstructEvent.mockReturnValue(event);

    const payload = JSON.stringify(event);
    const sig = signStripePayload(payload, SECRET);
    const req = createMockNextRequest(event, {
      'stripe-signature': sig,
    });

    const response = await webhookModule.POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockPrisma.stripeEventLog.upsert).toHaveBeenCalledWith({
      where: { eventId: event.id },
      create: { eventId: event.id, type: event.type, raw: payload },
      update: {},
    });
  });

  it('should handle subscription.updated event', async () => {
    const event = createSubscription({
      orgId: 'org-1',
    });

    mockConstructEvent.mockReturnValue(event);

    const payload = JSON.stringify(event);
    const sig = signStripePayload(payload, SECRET);
    const req = createMockNextRequest(event, {
      'stripe-signature': sig,
    });

    const response = await webhookModule.POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it('should handle subscription.deleted event', async () => {
    const event = {
      ...createSubscription({ orgId: 'org-1' }),
      type: 'customer.subscription.deleted',
    };

    mockConstructEvent.mockReturnValue(event);

    const payload = JSON.stringify(event);
    const sig = signStripePayload(payload, SECRET);
    const req = createMockNextRequest(event, {
      'stripe-signature': sig,
    });

    const response = await webhookModule.POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it('should handle invoice.paid event', async () => {
    const event = createInvoice({
      paid: true,
      subscriptionId: 'sub_test_123',
    });

    mockConstructEvent.mockReturnValue(event);

    const payload = JSON.stringify(event);
    const sig = signStripePayload(payload, SECRET);
    const req = createMockNextRequest(event, {
      'stripe-signature': sig,
    });

    const response = await webhookModule.POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it('should handle invoice.payment_failed event', async () => {
    const event = createInvoice({
      paid: false,
      subscriptionId: 'sub_test_123',
    });

    mockConstructEvent.mockReturnValue(event);

    const payload = JSON.stringify(event);
    const sig = signStripePayload(payload, SECRET);
    const req = createMockNextRequest(event, {
      'stripe-signature': sig,
    });

    const response = await webhookModule.POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it('should handle unknown event types gracefully', async () => {
    const event = {
      id: 'evt_test_123',
      type: 'unknown.event.type',
      data: { object: {} },
      created: Math.floor(Date.now() / 1000),
    };

    mockConstructEvent.mockReturnValue(event);

    const payload = JSON.stringify(event);
    const sig = signStripePayload(payload, SECRET);
    const req = createMockNextRequest(event, {
      'stripe-signature': sig,
    });

    const response = await webhookModule.POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it('should handle duplicate events with idempotency', async () => {
    const event = createCheckoutSession({
      orgId: 'org-1',
      plan: 'BASIC',
    });

    mockConstructEvent.mockReturnValue(event);
    // Simulate duplicate event by making upsert throw
    mockPrisma.stripeEventLog.upsert.mockRejectedValueOnce(new Error('Unique constraint'));

    const payload = JSON.stringify(event);
    const sig = signStripePayload(payload, SECRET);
    const req = createMockNextRequest(event, {
      'stripe-signature': sig,
    });

    const response = await webhookModule.POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.deduped).toBe(true);
  });
});
