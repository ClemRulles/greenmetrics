import type { Page } from '@playwright/test';

export async function getNavigationTimings(page: Page) {
  return await page.evaluate(() => {
    const t = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!t) return null;
    return {
      domContentLoaded: t.domContentLoadedEventEnd - t.startTime,
      load: t.loadEventEnd - t.startTime,
      response: t.responseEnd - t.requestStart,
      firstByte: t.responseStart - t.startTime
    };
  });
}

/** Chromium-only LCP (skips on other engines) */
export async function getLCP(page: Page): Promise<number | null> {
  return await page.evaluate(() => {
    // @ts-ignore
    if (!PerformanceObserver || !('PerformanceObserver' in window)) return null;
    return new Promise<number | null>((resolve) => {
      let lcp = 0;
      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-ignore
            if (entry.name || entry.startTime) {
              // largest-contentful-paint entry
              // @ts-ignore
              lcp = Math.max(lcp, entry.startTime || 0);
            }
          }
        });
        // @ts-ignore
        po.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve(lcp || null), 0);
      } catch {
        resolve(null);
      }
    });
  });
}

/** CLS (cumulative layout shift) best-effort */
export async function getCLS(page: Page): Promise<number | null> {
  return await page.evaluate(() => {
    let cls = 0;
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // @ts-ignore
          if (!entry.hadRecentInput) {
            // @ts-ignore
            cls += entry.value || 0;
          }
        }
      });
      // @ts-ignore
      po.observe({ type: 'layout-shift', buffered: true });
      return new Promise<number>((resolve) => setTimeout(() => resolve(cls), 0));
    } catch {
      return null;
    }
  });
}
