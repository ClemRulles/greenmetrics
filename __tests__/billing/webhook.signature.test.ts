import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signStripePayload } from '../../tests/helpers/stripeMock';
import { createMockNextRequest } from '../../tests/helpers/rawBody';

// Mock Prisma
const mockPrisma = {
  stripeEventLog: {
    upsert: vi.fn(),
  },
};

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/billing/stripe', () => ({
  constructEvent: vi.fn(),
  WEBHOOK_SECRET: 'whsec_test_secret',
}));

const { constructEvent } = await vi.importMock('@/lib/billing/stripe') as any;
const { POST } = await import('@/app/api/billing/webhook/route');

const SECRET = 'whsec_test_secret';

describe('Stripe webhook signature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.stripeEventLog.upsert.mockResolvedValue({});
  });

  it('rejects invalid signature', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const payload = { type: 'ping', data: { object: {} } };
    const req = createMockNextRequest(payload, { 'stripe-signature': 'bad' });
    
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid signature');
  });

  it('accepts valid signature', async () => {
    const event = { 
      id: 'evt_test_123', 
      type: 'ping', 
      data: { object: {} } 
    };
    
    constructEvent.mockReturnValue(event);

    const payload = { type: 'ping', data: { object: {} } };
    const sig = signStripePayload(JSON.stringify(payload), SECRET);
    const req = createMockNextRequest(payload, { 'stripe-signature': sig });
    
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.received).toBe(true);
    expect(constructEvent).toHaveBeenCalledWith(JSON.stringify(payload), sig, SECRET);
  });

  it('returns webhook disabled when no secret', async () => {
    // Mock empty webhook secret
    vi.doMock('@/lib/billing/stripe', () => ({
      constructEvent: vi.fn(),
      WEBHOOK_SECRET: '',
    }));

    // Re-import the route with mocked empty secret
    const { POST: POSTWithoutSecret } = await vi.importActual('@/app/api/billing/webhook/route') as any;
    
    const payload = { type: 'ping', data: { object: {} } };
    const req = createMockNextRequest(payload);
    
    const res = await POSTWithoutSecret(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.reason).toBe('webhook disabled');
  });

  it('handles idempotency - returns deduped for duplicate events', async () => {
    const event = { 
      id: 'evt_test_123', 
      type: 'ping', 
      data: { object: {} } 
    };
    
    constructEvent.mockReturnValue(event);
    // Simulate duplicate event by making upsert throw
    mockPrisma.stripeEventLog.upsert.mockRejectedValueOnce(new Error('Unique constraint'));

    const payload = { type: 'ping', data: { object: {} } };
    const sig = signStripePayload(JSON.stringify(payload), SECRET);
    const req = createMockNextRequest(payload, { 'stripe-signature': sig });
    
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.deduped).toBe(true);
  });
});
