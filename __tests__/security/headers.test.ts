import { describe, test, expect, beforeEach } from 'vitest';
import { getSecurityHeaders, validateSecurityHeaders, generateCSP, generatePermissionsPolicy } from '../../lib/http/headers';

describe('Security Headers', () => {
  describe('generateCSP', () => {
    test('generates basic CSP without nonce', () => {
      const csp = generateCSP();
      
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("upgrade-insecure-requests");
    });
    
    test('includes nonce when provided', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });
      
      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).toContain("'strict-dynamic'");
    });
    
    test('allows framing when specified', () => {
      const csp = generateCSP({ allowFraming: true });
      
      expect(csp).toContain("frame-ancestors 'self' https:");
    });
    
    test('includes additional connect sources', () => {
      const csp = generateCSP({ 
        additionalConnectSrc: ['https://api.example.com', 'wss://ws.example.com'] 
      });
      
      expect(csp).toContain('https://api.example.com');
      expect(csp).toContain('wss://ws.example.com');
    });
  });
  
  describe('generatePermissionsPolicy', () => {
    test('generates restrictive permissions policy', () => {
      const policy = generatePermissionsPolicy();
      
      expect(policy).toContain('camera=()');
      expect(policy).toContain('microphone=()');
      expect(policy).toContain('geolocation=()');
      expect(policy).toContain('fullscreen=(self)');
    });
  });
  
  describe('getSecurityHeaders', () => {
    test('includes all required security headers', () => {
      const headers = getSecurityHeaders();
      
      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
      expect(headers).toHaveProperty('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(headers).toHaveProperty('Permissions-Policy');
      expect(headers).toHaveProperty('Cross-Origin-Opener-Policy', 'same-origin');
      expect(headers).toHaveProperty('Cross-Origin-Resource-Policy', 'same-site');
    });
    
  test('includes HSTS in production', () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Mock production environment using vi.stubEnv
    vi.stubEnv('NODE_ENV', 'production');
    
    const headers = getSecurityHeaders();
    
    expect(headers).toHaveProperty('Strict-Transport-Security');
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
    
    // Restore environment
    vi.unstubAllEnvs();
  });    test('allows framing when specified', () => {
      const headers = getSecurityHeaders({ allowFraming: true });
      
      expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
      expect(headers['Cross-Origin-Opener-Policy']).toBe('unsafe-none');
    });
  });
  
  describe('validateSecurityHeaders', () => {
  test('validates complete security headers', () => {
    const completeHeaders = {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
    
    const validation = validateSecurityHeaders(completeHeaders);
    
    expect(validation.valid).toBe(true);
    expect(validation.missing).toHaveLength(0);
    expect(validation.issues).toHaveLength(0);
  });    test('detects missing headers', () => {
      const headers = {
        'Content-Security-Policy': "default-src 'self'",
        // Missing other required headers
      };
      
      const validation = validateSecurityHeaders(headers);
      
      expect(validation.valid).toBe(false);
      expect(validation.missing.length).toBeGreaterThan(0);
      expect(validation.missing).toContain('X-Content-Type-Options');
    });
    
    test('detects unsafe CSP directives', () => {
      const headers = {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=()',
      };
      
      const validation = validateSecurityHeaders(headers);
      
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('CSP allows unsafe-inline scripts');
    });
    
    test('detects weak X-Frame-Options', () => {
      const headers = {
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'ALLOWALL',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=()',
      };
      
      const validation = validateSecurityHeaders(headers);
      
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('X-Frame-Options has weak value: ALLOWALL');
    });
  });
});
