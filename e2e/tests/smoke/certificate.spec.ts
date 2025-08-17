import { test, expect } from '@playwright/test';

test.fixme('public certificate page renders core sections (example id)', async ({ page }) => {
  // Replace with a known test publicId if available
  await page.goto('/certificate/test-public-id');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByText(/Certificate/i)).toBeVisible({ timeout: 2000 });
});
