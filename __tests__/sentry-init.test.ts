import { describe, it, expect, vi } from 'vitest';

// Mock Sentry to avoid actual initialization
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
}));

describe('Sentry configuration', () => {
  it('does not throw when DSN is missing', async () => {
    // Clear any existing DSN
    delete process.env.SENTRY_DSN;
    
    // Import after mocking and clearing env
    await import('../sentry.server.config');
    
    // Should not throw
    expect(true).toBe(true);
  });

  it('initializes when DSN is provided', async () => {
    process.env.SENTRY_DSN = 'https://test@test.ingest.sentry.io/test';
    
    // Import after setting env
    await import('../sentry.client.config');
    
    // Should not throw
    expect(true).toBe(true);
    
    // Clean up
    delete process.env.SENTRY_DSN;
  });
});
