import { describe, test, expect, vi } from 'vitest';
import { 
  verifyWebhookSignature, 
  verifyStripeSignature, 
  verifyGitHubSignature,
  withSignatureVerification,
  WebhookTestUtils 
} from '../../lib/security/signature';

describe('Webhook Signature Verification', () => {
  const testSecret = 'test-webhook-secret-key';
  const testBody = JSON.stringify({ test: 'data' });
  
  describe('verifyWebhookSignature', () => {
    test('verifies valid HMAC signature', () => {
      const signature = WebhookTestUtils.generateSignature(testBody, testSecret);
      
      const result = verifyWebhookSignature(testBody, signature, {
        secret: testSecret
      });
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    test('rejects invalid signature', () => {
      const signature = 'invalid-signature';
      
      const result = verifyWebhookSignature(testBody, signature, {
        secret: testSecret
      });
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    test('handles prefixed signatures (sha256=hash)', () => {
      const signature = WebhookTestUtils.generateSignature(testBody, testSecret);
      const prefixedSignature = `sha256=${signature}`;
      
      const result = verifyWebhookSignature(testBody, prefixedSignature, {
        secret: testSecret
      });
      
      expect(result.valid).toBe(true);
    });
  });
  
  describe('verifyStripeSignature', () => {
    test('verifies valid Stripe signature', () => {
      const signature = WebhookTestUtils.generateStripeSignature(testBody, testSecret);
      
      const result = verifyStripeSignature(testBody, signature, testSecret);
      
      expect(result.valid).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
    
    test('rejects signature outside tolerance window', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signature = WebhookTestUtils.generateStripeSignature(testBody, testSecret, oldTimestamp);
      
      const result = verifyStripeSignature(testBody, signature, testSecret, 300); // 5 minute tolerance
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Timestamp outside tolerance');
    });
    
    test('handles malformed Stripe signature', () => {
      const malformedSignature = 'invalid-stripe-signature';
      
      const result = verifyStripeSignature(testBody, malformedSignature, testSecret);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature format');
    });
  });
  
  describe('verifyGitHubSignature', () => {
    test('verifies valid GitHub signature', () => {
      const signature = WebhookTestUtils.generateGitHubSignature(testBody, testSecret);
      
      const result = verifyGitHubSignature(testBody, signature, testSecret);
      
      expect(result.valid).toBe(true);
    });
    
    test('rejects GitHub signature without sha256 prefix', () => {
      const signature = 'invalid-github-signature';
      
      const result = verifyGitHubSignature(testBody, signature, testSecret);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid GitHub signature format');
    });
  });
  
  describe('withSignatureVerification middleware', () => {
    test('allows request with valid signature', async () => {
      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const verifier = (rawBody: Buffer, headers: Headers) => ({ valid: true });
      const middleware = withSignatureVerification(handler, verifier);
      
      const request = new Request('http://test.com', {
        method: 'POST',
        body: testBody,
        headers: { 'content-type': 'application/json' }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });
    
    test('blocks request with invalid signature', async () => {
      const handler = vi.fn();
      const verifier = (rawBody: Buffer, headers: Headers) => ({ 
        valid: false, 
        error: 'Invalid signature' 
      });
      const middleware = withSignatureVerification(handler, verifier);
      
      const request = new Request('http://test.com', {
        method: 'POST',
        body: testBody,
        headers: { 'content-type': 'application/json' }
      });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
      
      const body = await response.json();
      expect(body.error).toBe('Invalid signature');
    });
  });
  
  describe('WebhookTestUtils', () => {
    test('generateStripeSignature creates valid signature', () => {
      const signature = WebhookTestUtils.generateStripeSignature(testBody, testSecret);
      
      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]+$/);
      
      const result = verifyStripeSignature(testBody, signature, testSecret);
      expect(result.valid).toBe(true);
    });
    
    test('generateGitHubSignature creates valid signature', () => {
      const signature = WebhookTestUtils.generateGitHubSignature(testBody, testSecret);
      
      expect(signature).toMatch(/^sha256=[a-f0-9]+$/);
      
      const result = verifyGitHubSignature(testBody, signature, testSecret);
      expect(result.valid).toBe(true);
    });
    
    test('generateSignature creates valid HMAC', () => {
      const signature = WebhookTestUtils.generateSignature(testBody, testSecret);
      
      expect(signature).toMatch(/^[a-f0-9]+$/);
      
      const result = verifyWebhookSignature(testBody, signature, {
        secret: testSecret
      });
      expect(result.valid).toBe(true);
    });
  });
});
