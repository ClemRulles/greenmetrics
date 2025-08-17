import { describe, it, expect, beforeEach } from 'vitest';
import { consume, rateKey } from '@/lib/sec/rate-limit';

describe('rate limiter', () => {
  beforeEach(() => {
    // Reset environment for each test
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_API_PER_MINUTE = '3';
    process.env.RATE_LIMIT_AUTH_PER_MINUTE = '2';
  });

  it('allows within limit and blocks after for API', () => {
    const id = 'u:test-api';
    
    expect(consume('api', id)).toMatchObject({ ok: true });
    expect(consume('api', id)).toMatchObject({ ok: true });
    expect(consume('api', id)).toMatchObject({ ok: true });
    
    const blocked = consume('api', id);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('allows within limit and blocks after for auth', () => {
    const id = 'u:test-auth';
    
    expect(consume('auth', id)).toMatchObject({ ok: true });
    expect(consume('auth', id)).toMatchObject({ ok: true });
    
    const blocked = consume('auth', id);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('respects separate limits for different users', () => {
    const user1 = 'u:user1';
    const user2 = 'u:user2';
    
    // Exhaust user1's limit
    consume('api', user1);
    consume('api', user1);
    consume('api', user1);
    expect(consume('api', user1)).toMatchObject({ ok: false });
    
    // user2 should still have capacity
    expect(consume('api', user2)).toMatchObject({ ok: true });
  });

  it('bypasses limiting when disabled', () => {
    process.env.RATE_LIMIT_ENABLED = 'false';
    
    const id = 'u:test-disabled';
    
    // Should always return ok when disabled
    for (let i = 0; i < 10; i++) {
      const result = consume('api', id);
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(Infinity);
    }
  });

  it('generates correct rate keys', () => {
    expect(rateKey('api', 'u:123')).toBe('api:u:123');
    expect(rateKey('auth', 'ip:1.2.3.4')).toBe('auth:ip:1.2.3.4');
  });
});
