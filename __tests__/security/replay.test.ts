import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createReplayProtection, generateNonce, extractNonceFromRequest, withReplayProtection } from '../../lib/security/replay';

describe('Replay Protection', () => {
  let replayProtection: any;
  
  beforeEach(() => {
    replayProtection = createReplayProtection({ ttlSeconds: 60 });
  });
  
  describe('generateNonce', () => {
    test('generates unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toHaveLength(64); // 32 bytes * 2 (hex)
    });
    
    test('generates nonces of specified length', () => {
      const nonce = generateNonce(16);
      expect(nonce).toHaveLength(32); // 16 bytes * 2 (hex)
    });
  });
  
  describe('extractNonceFromRequest', () => {
    test('extracts nonce from header', () => {
      const request = new Request('http://test.com', {
        headers: { 'x-nonce': 'test-nonce-123' }
      });
      
      const nonce = extractNonceFromRequest(request);
      expect(nonce).toBe('test-nonce-123');
    });
    
    test('extracts nonce from body', () => {
      const request = new Request('http://test.com');
      const body = { nonce: 'body-nonce-456' };
      
      const nonce = extractNonceFromRequest(request, body);
      expect(nonce).toBe('body-nonce-456');
    });
    
    test('prefers header over body', () => {
      const request = new Request('http://test.com', {
        headers: { 'x-nonce': 'header-nonce' }
      });
      const body = { nonce: 'body-nonce' };
      
      const nonce = extractNonceFromRequest(request, body);
      expect(nonce).toBe('header-nonce');
    });
    
    test('returns null when no nonce found', () => {
      const request = new Request('http://test.com');
      const nonce = extractNonceFromRequest(request);
      expect(nonce).toBeNull();
    });
  });
  
  describe('InMemoryReplayProtection', () => {
    test('allows first request with nonce', async () => {
      const nonce = generateNonce();
      const result = await replayProtection.checkAndStore(nonce);
      
      expect(result.allowed).toBe(true);
      expect(result.isReplay).toBeUndefined();
    });
    
    test('blocks replay attack', async () => {
      const nonce = generateNonce();
      
      // First request should be allowed
      const first = await replayProtection.checkAndStore(nonce);
      expect(first.allowed).toBe(true);
      
      // Second request with same nonce should be blocked
      const second = await replayProtection.checkAndStore(nonce);
      expect(second.allowed).toBe(false);
      expect(second.isReplay).toBe(true);
      expect(second.error).toContain('replay attack detected');
    });
    
    test('allows request after TTL expiry', async () => {
      const shortTtlProtection = createReplayProtection({ ttlSeconds: 1 });
      const nonce = generateNonce();
      
      // First request
      const first = await shortTtlProtection.checkAndStore(nonce);
      expect(first.allowed).toBe(true);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be allowed again after TTL
      const second = await shortTtlProtection.checkAndStore(nonce);
      expect(second.allowed).toBe(true);
    });
  });
  
  describe('withReplayProtection middleware', () => {
    test('allows request with valid nonce', async () => {
      const nonce = generateNonce();
      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const middleware = withReplayProtection(replayProtection);
      const protectedHandler = middleware(handler);
      
      const request = new Request('http://test.com', {
        headers: { 'x-nonce': nonce }
      });
      
      const response = await protectedHandler(request);
      
      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });
    
    test('blocks request without nonce', async () => {
      const handler = vi.fn();
      const middleware = withReplayProtection(replayProtection);
      const protectedHandler = middleware(handler);
      
      const request = new Request('http://test.com');
      const response = await protectedHandler(request);
      
      expect(response.status).toBe(400);
      expect(handler).not.toHaveBeenCalled();
      
      const body = await response.json();
      expect(body.error).toContain('Missing nonce');
    });
    
    test('blocks replay attack', async () => {
      const nonce = generateNonce();
      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const middleware = withReplayProtection(replayProtection);
      const protectedHandler = middleware(handler);
      
      const request = new Request('http://test.com', {
        headers: { 'x-nonce': nonce }
      });
      
      // First request should succeed
      const first = await protectedHandler(request);
      expect(first.status).toBe(200);
      
      // Second request should be blocked
      const second = await protectedHandler(request);
      expect(second.status).toBe(409);
      
      const body = await second.json();
      expect(body.replay).toBe(true);
    });
  });
});
