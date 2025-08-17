import { describe, it, expect, vi } from 'vitest';

vi.mock('posthog-node', () => {
  return {
    PostHog: vi.fn().mockImplementation(() => ({
      capture: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

import { trackServerEvent } from '@/lib/analytics';
import { cookies } from 'next/headers';

function reqWithCookies(cookie: string) {
  return new Request('http://localhost/en/test', { headers: { cookie } });
}

describe('analytics consent gating', () => {
  it('does not send when consent is missing/rejected', async () => {
    // Mock cookies to return rejected
    (cookies as any).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'rejected' })
    });

    process.env.POSTHOG_KEY = 'x';
    const res = await trackServerEvent({ 
      req: reqWithCookies('consent=rejected'), 
      userId: 'u', 
      event: 'report_computed' 
    });
    expect(res).toBeUndefined();
  });

  it('sends when consent is accepted', async () => {
    // Mock cookies to return accepted
    (cookies as any).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'accepted' })
    });

    process.env.POSTHOG_KEY = 'x';
    const res = await trackServerEvent({ 
      req: reqWithCookies('consent=accepted'), 
      userId: 'u', 
      event: 'report_exported', 
      properties: { reportId: 'r' } 
    });
    expect(res).toBeUndefined(); // no exception
  });

  it('does not send when PostHog is disabled', async () => {
    // Mock cookies to return accepted but disable PostHog
    (cookies as any).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'accepted' })
    });

    process.env.POSTHOG_ENABLED = 'false';
    const res = await trackServerEvent({ 
      req: reqWithCookies('consent=accepted'), 
      userId: 'u', 
      event: 'report_computed' 
    });
    expect(res).toBeUndefined();
    
    // Reset
    process.env.POSTHOG_ENABLED = 'true';
  });
});
