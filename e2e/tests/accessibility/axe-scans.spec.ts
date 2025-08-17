import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

const routes = ['/en', '/fr', '/en/auth/signin'];

for (const path of routes) {
  test(`a11y scan: ${path}`, async ({ page }) => {
    await page.goto(path);
    await injectAxe(page);

    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: {
        runOnly: ['wcag2a', 'wcag2aa'],
      }
    });

    // Minimal assertion so the test isn't empty:
    await expect(page.locator('body')).toBeVisible();
  });
}
