/**
 * Synthetics Uptime Monitoring
 * 
 * Playwright tests for synthetic monitoring of critical endpoints.
 * Multi-region monitoring with performance SLA validation.
 */

import { test, expect } from '@playwright/test';

const regions = [
  { name: 'US-East', baseURL: process.env.US_EAST_URL || 'http://localhost:3000' },
  { name: 'EU-West', baseURL: process.env.EU_WEST_URL || 'http://localhost:3000' },
  { name: 'Asia-Pacific', baseURL: process.env.APAC_URL || 'http://localhost:3000' }
];

test.describe('GreenMetrics Multi-Region Uptime Monitoring', () => {
  // Test uptime across multiple regions
  for (const region of regions) {
    test(`${region.name} - Homepage loads successfully`, async ({ page }) => {
      await test.step('Navigate to homepage', async () => {
        const startTime = Date.now();
        
        const response = await page.goto(region.baseURL + '/en');
        const responseTime = Date.now() - startTime;
        
        expect(response?.status()).toBe(200);
        expect(responseTime).toBeLessThan(5000); // 5s timeout for regional access
      });

      await test.step('Verify page content', async () => {
        // Verify critical page elements load
        await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('nav')).toBeVisible();
      });
    });

    test(`${region.name} - Health check endpoint responds`, async ({ request }) => {
      const startTime = Date.now();
      
      const response = await request.get(region.baseURL + '/api/health');
      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Health checks should be fast
      
      const body = await response.json();
      expect(body.status).toBe('healthy');
      expect(body.timestamp).toBeDefined();
      expect(body.checks).toBeDefined();
    });

    test(`${region.name} - API endpoints respond within SLA`, async ({ request }) => {
      const endpoints = [
        '/api/health',
        '/api/auth/session',
        '/api/reports',
        '/api/organizations'
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        const response = await request.get(region.baseURL + endpoint);
        const responseTime = Date.now() - startTime;
        
        // API should respond within 500ms for healthy status
        expect(responseTime).toBeLessThan(500);
        expect(response.status()).toBeLessThanOrEqual(401); // Allow auth errors
      }
    });
  }

  test('Database connectivity validation', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();
    
    expect(body.checks.database.status).toBe('healthy');
    expect(parseInt(body.checks.database.latency)).toBeLessThan(100); // DB queries under 100ms
  });

  test('Performance SLA validation', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000); // 2s SLA for page loads
  });

  test('Error rate monitoring', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();
    
    if (body.metrics && body.metrics.error_rate_1h) {
      const errorRate = parseFloat(body.metrics.error_rate_1h.replace('%', ''));
      expect(errorRate).toBeLessThan(1); // Error rate under 1%
    }
  });

  test('Service availability check', async ({ request }) => {
    // Simulate continuous monitoring
    const checks = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      try {
        const response = await request.get('/api/health');
        const responseTime = Date.now() - startTime;
        
        checks.push({
          success: response.status() === 200,
          responseTime,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        checks.push({
          success: false,
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
      }
      
      // Wait 1 second between checks
      if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Calculate availability
    const successfulChecks = checks.filter(check => check.success).length;
    const availability = (successfulChecks / checks.length) * 100;
    
    expect(availability).toBeGreaterThanOrEqual(99); // High availability
  });
});
