import { test, expect } from '@playwright/test';

const locales = ['en', 'fr'];

for (const locale of locales) {
  test.describe(`Homepage smoke (${locale})`, () => {
    test('loads without console errors and shows main landmark', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(`/${locale}`);
      await expect(page.locator('main')).toBeVisible();

      // No critical console errors
      expect(errors.join('\n')).not.toMatch(/(ReferenceError|TypeError|Unhandled)/);
    });

    test('can switch locale via link presence', async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator('a:has-text("EN"), a:has-text("FR")')).toHaveCount(1, { timeout: 5000 });
    });
  });
}
