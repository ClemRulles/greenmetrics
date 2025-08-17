import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/consent/route';

describe('consent endpoint', () => {
  it('accepts consent value', async () => {
    const res = await POST(new Request('http://localhost', { 
      method: 'POST', 
      body: JSON.stringify({ value: 'accepted' }),
      headers: { 'content-type': 'application/json' }
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.value).toBe('accepted');
    
    // Check Set-Cookie header
    const cookieHeader = res.headers.get('Set-Cookie');
    expect(cookieHeader).toContain('consent=accepted');
  });

  it('defaults to rejected on invalid input', async () => {
    const res = await POST(new Request('http://localhost', { 
      method: 'POST', 
      body: 'invalid'
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.value).toBe('rejected');
  });
});
