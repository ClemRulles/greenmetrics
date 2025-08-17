// Test utilities for Next.js 15 async params
import type { Session } from 'next-auth';

// Helper to mock async params for testing route handlers
export function mockAsyncParams<T>(params: T): Promise<T> {
  return Promise.resolve(params);
}

// Helper to create a mock session with required properties
export function mockSession(overrides: Partial<Session> = {}): Session {
  return {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    ...overrides,
  };
}

// Helper for missing billing types
export interface BillingStatus {
  plan: string;
  status: 'active' | 'inactive' | 'trial';
  billingPeriodEnd: string;
}

export interface BillingEntitlements {
  reports: number;
  teamSeats: number;
  features: string[];
}

export interface BillingUsage {
  reportsUsed: number;
  seatsUsed: number;
  period: string;
}
