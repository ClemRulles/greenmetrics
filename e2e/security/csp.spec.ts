import { test, expect } from '@playwright/test';

test.describe('Security Headers E2E', () => {
  test('homepage has comprehensive security headers', async ({ page }) => {
    // Navigate to homepage
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    
    // Check CSP header
    const cspHeader = response?.headers()['content-security-policy'];
    expect(cspHeader).toBeDefined();
    expect(cspHeader).toContain("default-src 'self'");
    expect(cspHeader).toContain("script-src 'self'");
    expect(cspHeader).toContain("style-src 'self'");
    
    // Check HSTS header
    const hstsHeader = response?.headers()['strict-transport-security'];
    expect(hstsHeader).toBeDefined();
    expect(hstsHeader).toContain('max-age=');
    
    // Check X-Frame-Options
    const frameOptionsHeader = response?.headers()['x-frame-options'];
    expect(frameOptionsHeader).toBe('DENY');
    
    // Check X-Content-Type-Options
    const contentTypeHeader = response?.headers()['x-content-type-options'];
    expect(contentTypeHeader).toBe('nosniff');
    
    // Check Referrer-Policy
    const referrerPolicyHeader = response?.headers()['referrer-policy'];
    expect(referrerPolicyHeader).toBeDefined();
    
    // Check Permissions-Policy
    const permissionsPolicyHeader = response?.headers()['permissions-policy'];
    expect(permissionsPolicyHeader).toBeDefined();
  });
  
  test('API routes have security headers', async ({ request }) => {
    const response = await request.get('/api/health');
    
    // API routes should have basic security headers
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    
    // Check for CORS headers if applicable
    const corsHeader = response.headers()['access-control-allow-origin'];
    if (corsHeader) {
      expect(corsHeader).not.toBe('*'); // Should not allow all origins in production
    }
  });
  
  test('CSP nonce is properly injected', async ({ page }) => {
    await page.goto('/');
    
    // Check that inline scripts have nonce attributes
    const scriptWithNonce = await page.locator('script[nonce]').first();
    if (await scriptWithNonce.count() > 0) {
      const nonceValue = await scriptWithNonce.getAttribute('nonce');
      expect(nonceValue).toBeTruthy();
      expect(nonceValue?.length).toBeGreaterThan(10); // Reasonable nonce length
    }
  });
  
  test('no unsafe CSP directives detected', async ({ page }) => {
    const response = await page.goto('/');
    const cspHeader = response?.headers()['content-security-policy'];
    
    if (cspHeader) {
      // Check for unsafe directives
      expect(cspHeader).not.toContain("'unsafe-eval'");
      expect(cspHeader).not.toContain("'unsafe-inline'");
      expect(cspHeader).not.toContain('data:'); // Unless specifically needed
      
      // Check for overly permissive sources
      expect(cspHeader).not.toContain("* ");
      expect(cspHeader).not.toContain("*;");
    }
  });
});

test.describe('Rate Limiting E2E', () => {
  test('auth endpoints are rate limited', async ({ request }) => {
    const endpoint = '/api/auth/signin';
    const payload = { email: 'test@example.com', password: 'testpass' };
    
    // Make requests up to the limit (5 requests per minute for auth)
    const responses = [];
    for (let i = 0; i < 6; i++) {
      const response = await request.post(endpoint, {
        data: payload,
        headers: { 'Content-Type': 'application/json' }
      });
      responses.push(response.status());
    }
    
    // First 5 should succeed or return validation errors (not rate limited)
    // 6th should be rate limited
    const rateLimitedResponses = responses.filter(status => status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
  
  test('API endpoints have appropriate rate limits', async ({ request }) => {
    const endpoint = '/api/reports';
    
    // Make rapid requests to test rate limiting
    const responses = [];
    for (let i = 0; i < 35; i++) { // API limit is 30 req/min
      const response = await request.get(endpoint);
      responses.push(response.status());
      
      // If we hit rate limit, break early
      if (response.status() === 429) break;
    }
    
    // Should eventually hit rate limit
    const rateLimitedResponses = responses.filter(status => status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});

test.describe('Webhook Security E2E', () => {
  test('webhooks require valid signatures', async ({ request }) => {
    const endpoints = [
      '/api/webhooks/stripe',
      '/api/webhooks/github',
      '/api/webhooks/custom'
    ];
    
    for (const endpoint of endpoints) {
      // Request without signature should be rejected
      const response = await request.post(endpoint, {
        data: { test: 'data' },
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status()).toBe(401);
      
      const body = await response.json();
      expect(body.error).toContain('signature');
    }
  });
  
  test('malformed webhook signatures are rejected', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      data: { test: 'data' },
      headers: { 
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid-signature'
      }
    });
    
    expect(response.status()).toBe(401);
  });
});

test.describe('Content Security E2E', () => {
  test('no mixed content warnings', async ({ page }) => {
    const mixedContentWarnings: string[] = [];
    
    page.on('console', msg => {
      if (msg.text().includes('Mixed Content') || msg.text().includes('blocked:mixed-content')) {
        mixedContentWarnings.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    expect(mixedContentWarnings).toHaveLength(0);
  });
  
  test('external resources are properly configured', async ({ page }) => {
    await page.goto('/');
    
    // Check that external scripts have integrity attributes if from CDN
    const externalScripts = await page.locator('script[src^="http"]').all();
    
    for (const script of externalScripts) {
      const src = await script.getAttribute('src');
      if (src && !src.includes(process.env.VERCEL_URL || 'localhost')) {
        // External scripts should have integrity or be from trusted CDNs
        const integrity = await script.getAttribute('integrity');
        const crossorigin = await script.getAttribute('crossorigin');
        
        if (!integrity) {
          console.warn(`External script without integrity: ${src}`);
        }
      }
    }
  });
});

test.describe('Cookie Security E2E', () => {
  test('session cookies have secure attributes', async ({ context, page }) => {
    await page.goto('/auth/signin');
    
    // Simulate login to get session cookies
    // Note: This would need actual auth flow in real tests
    
    const cookies = await context.cookies();
    const sessionCookies = cookies.filter(c => 
      c.name.includes('session') || 
      c.name.includes('auth') ||
      c.name.includes('token')
    );
    
    for (const cookie of sessionCookies) {
      expect(cookie.secure).toBe(true);
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.sameSite).toBe('Strict');
    }
  });
});

test.describe('Error Handling Security E2E', () => {
  test('error pages do not leak sensitive information', async ({ page }) => {
    // Test 404 page
    const response404 = await page.goto('/nonexistent-page');
    expect(response404?.status()).toBe(404);
    
    const content404 = await page.textContent('body');
    expect(content404).not.toContain('stack trace');
    expect(content404).not.toContain('database');
    expect(content404).not.toContain('internal');
    
    // Test 500 error (if we can trigger one safely)
    // This would need careful implementation to avoid actually breaking things
  });
  
  test('API errors do not expose sensitive data', async ({ request }) => {
    // Test API endpoint with invalid data
    const response = await request.post('/api/reports', {
      data: { invalid: 'data' }
    });
    
    if (response.status() >= 400) {
      const body = await response.json();
      
      // Error responses should not contain sensitive information
      const bodyText = JSON.stringify(body);
      expect(bodyText).not.toContain('password');
      expect(bodyText).not.toContain('secret');
      expect(bodyText).not.toContain('key');
      expect(bodyText).not.toContain('database');
    }
  });
});
