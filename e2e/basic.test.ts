import { test, expect } from '@playwright/test';

test('basic connectivity test', async ({ page }) => {
  // Just try to reach the server
  const response = await page.goto('http://localhost:3000/', { 
    waitUntil: 'domcontentloaded',
    timeout: 5000 
  });
  
  expect(response?.status()).toBe(200);
  
  // Check if we got redirected to a locale
  expect(page.url()).toMatch(/\/(?:en|fr)$/);
});
