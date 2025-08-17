import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/en', '/fr']) {
  test.describe(`a11y smoke: ${path}`, () => {
    test(`no critical/serious violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).include('body').analyze();
      const critical = results.violations.filter(v =>
        ['critical', 'serious'].includes(v.impact || '')
      );
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    });
  });
}
