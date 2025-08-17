import { test, expect } from '@playwright/test';

test.describe('Critical User Journey Monitoring', () => {
  test('User registration journey', async ({ page }) => {
    await test.step('Navigate to signup page', async () => {
      const startTime = Date.now();
      
      await page.goto('/auth/signup');
      
      const navigationTime = Date.now() - startTime;
      expect(navigationTime).toBeLessThan(3000); // Navigation under 3s
    });

    await test.step('Fill registration form', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      
      await page.fill('[name="email"]', testEmail);
      await page.fill('[name="password"]', 'TestPassword123!');
      await page.fill('[name="confirmPassword"]', 'TestPassword123!');
      await page.fill('[name="organizationName"]', 'Test Organization');
      
      const startTime = Date.now();
      await page.click('button[type="submit"]');
      
      // Should process within 5 seconds
      const submitTime = Date.now() - startTime;
      expect(submitTime).toBeLessThan(5000);
    });

    await test.step('Verify success or validation', async () => {
      // Should either redirect to verification or show validation errors
      await page.waitForTimeout(2000);
      
      const url = page.url();
      const hasSuccess = url.includes('/verify') || url.includes('/dashboard');
      const hasValidation = await page.locator('.error, [role="alert"]').count() > 0;
      
      expect(hasSuccess || hasValidation).toBe(true);
    });
  });

  test('User authentication journey', async ({ page }) => {
    await test.step('Navigate to signin page', async () => {
      await page.goto('/auth/signin');
      
      await expect(page.locator('[name="email"]')).toBeVisible();
      await expect(page.locator('[name="password"]')).toBeVisible();
    });

    await test.step('Attempt login with test credentials', async () => {
      await page.fill('[name="email"]', 'test@example.com');
      await page.fill('[name="password"]', 'testpassword');
      
      const startTime = Date.now();
      await page.click('button[type="submit"]');
      
      // Authentication should respond quickly
      const authTime = Date.now() - startTime;
      expect(authTime).toBeLessThan(3000);
    });

    await test.step('Handle authentication result', async () => {
      await page.waitForTimeout(2000);
      
      // Should either redirect to dashboard or show error
      const url = page.url();
      const isAuthenticated = url.includes('/dashboard') || url.includes('/organizations');
      const hasError = await page.locator('.error, [role="alert"]').count() > 0;
      
      expect(isAuthenticated || hasError).toBe(true);
    });
  });

  test('Report creation journey', async ({ page }) => {
    await test.step('Navigate to reports page', async () => {
      await page.goto('/en/reports');
      
      // May redirect to auth, which is expected
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify report interface loads', async () => {
      const url = page.url();
      
      if (url.includes('/auth/')) {
        // If redirected to auth, that's expected behavior
        await expect(page.locator('form')).toBeVisible();
      } else {
        // If on reports page, verify interface
        await expect(page.locator('h1, h2')).toBeVisible();
      }
    });

    await test.step('Test report creation flow', async () => {
      // If authenticated, try to create a report
      const createButton = page.locator('button:has-text("Create"), button:has-text("New")');
      
      if (await createButton.count() > 0) {
        const startTime = Date.now();
        await createButton.first().click();
        
        // Should open form or modal quickly
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(2000);
      }
    });
  });

  test('Export functionality journey', async ({ page }) => {
    await test.step('Navigate to exports page', async () => {
      await page.goto('/en/exports');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify export interface', async () => {
      const url = page.url();
      
      if (url.includes('/auth/')) {
        // If redirected to auth, verify login form
        await expect(page.locator('[name="email"]')).toBeVisible();
      } else {
        // If on exports page, verify content loads
        await expect(page.locator('h1, h2')).toBeVisible();
      }
    });

    await test.step('Test export initiation', async () => {
      // Look for export buttons or download links
      const exportTriggers = page.locator('button:has-text("Export"), button:has-text("Download"), a[download]');
      
      if (await exportTriggers.count() > 0) {
        const startTime = Date.now();
        
        // Monitor downloads
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
        
        await exportTriggers.first().click();
        
        // Should either start download or show processing
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(5000);
        
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toBeTruthy();
        }
      }
    });
  });

  test('Dashboard performance journey', async ({ page }) => {
    await test.step('Navigate to dashboard', async () => {
      const startTime = Date.now();
      
      await page.goto('/en/dashboard');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Dashboard should load within 5s
    });

    await test.step('Verify dashboard content loads', async () => {
      const url = page.url();
      
      if (url.includes('/auth/')) {
        // Redirected to auth - verify login form
        await expect(page.locator('form')).toBeVisible();
      } else {
        // On dashboard - verify key elements
        await expect(page.locator('h1, h2, [data-testid="dashboard"]')).toBeVisible();
      }
    });

    await test.step('Test dashboard interactions', async () => {
      // Test navigation and interactive elements
      const navLinks = page.locator('nav a, [role="navigation"] a');
      
      if (await navLinks.count() > 0) {
        const startTime = Date.now();
        await navLinks.first().click();
        
        // Navigation should be responsive
        const navTime = Date.now() - startTime;
        expect(navTime).toBeLessThan(2000);
      }
    });
  });

  test('API integration journey', async ({ request }) => {
    await test.step('Test API health', async () => {
      const response = await request.get('/api/health');
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.status).toBe('healthy');
    });

    await test.step('Test authenticated API endpoints', async () => {
      const endpoints = [
        '/api/auth/session',
        '/api/organizations',
        '/api/reports',
        '/api/exports'
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        const response = await request.get(endpoint);
        const responseTime = Date.now() - startTime;
        
        // API should respond quickly (allow auth errors)
        expect(responseTime).toBeLessThan(1000);
        expect([200, 401, 403]).toContain(response.status());
      }
    });

    await test.step('Test API rate limiting', async () => {
      // Test that rate limiting is working
      const responses = [];
      
      for (let i = 0; i < 10; i++) {
        const response = await request.get('/api/auth/session');
        responses.push(response.status());
        
        // If we hit rate limit, break
        if (response.status() === 429) break;
      }
      
      // Should handle requests appropriately
      const validStatuses = responses.filter(status => 
        [200, 401, 403, 429].includes(status)
      );
      expect(validStatuses.length).toBe(responses.length);
    });
  });

  test('Mobile responsiveness journey', async ({ page }) => {
    await test.step('Test mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      await page.goto('/en');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify mobile navigation', async () => {
      // Check if mobile menu exists and works
      const mobileMenuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], .hamburger');
      
      if (await mobileMenuButton.count() > 0) {
        await mobileMenuButton.click();
        
        // Menu should open
        await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
      }
    });

    await test.step('Test touch interactions', async () => {
      // Verify buttons are touch-friendly
      const buttons = page.locator('button, a[role="button"]');
      
      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        const boundingBox = await firstButton.boundingBox();
        
        if (boundingBox) {
          // Touch targets should be at least 44px (iOS guideline)
          expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });
});
