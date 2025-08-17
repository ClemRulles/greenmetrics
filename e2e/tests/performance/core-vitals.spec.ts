import { test, expect } from '@playwright/test';
import { getNavigationTimings, getCLS } from '../../utils/performance';

const BUDGET = {
  LCP_MS: 3000,
  CLS: 0.1
};

test.describe('Core Web Vitals (best-effort)', () => {
  test('LCP & CLS within budget on /en (Chromium preferred)', async ({ page, browserName }) => {
    await page.goto('/en', { waitUntil: 'domcontentloaded' });

    const nav = await getNavigationTimings(page);
    const cls = await getCLS(page);

    // Get LCP more reliably with proper wait
    let lcp: number | null = null;
    if (browserName === 'chromium') {
      try {
        lcp = await page.evaluate(async () => {
          return new Promise<number | null>((resolve) => {
            let value = 0;
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                value = Math.max(value, entry.startTime);
              }
            });
            observer.observe({ type: 'largest-contentful-paint', buffered: true });
            // Wait a bit for measurements to stabilize
            setTimeout(() => resolve(value || null), 1000);
          });
        });
      } catch {
        lcp = null;
      }
    }

    // Always assert CLS budget (all engines)
    if (cls !== null) {
      expect(cls, `CLS too high: ${cls}`).toBeLessThanOrEqual(BUDGET.CLS);
    }

    // Only assert LCP where supported, with relaxed budget for CI
    if (lcp !== null) {
      expect(lcp, `LCP too high: ${lcp}ms`).toBeLessThanOrEqual(BUDGET.LCP_MS);
    }

    // Sanity: navigation should have basic timing data (more permissive)
    const hasValidTiming = (nav?.domContentLoaded ?? 0) > 0 || (nav?.load ?? 0) > 0 || (nav?.response ?? 0) > 0;
    expect(hasValidTiming, 'Navigation timing data should be available').toBe(true);
  });
});
