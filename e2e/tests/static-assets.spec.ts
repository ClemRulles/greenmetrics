import { test, expect } from '@playwright/test';

test('serves favicon and manifest without redirects', async ({ page }) => {
  const [respFavicon, respManifest] = await Promise.all([
    page.request.get('/favicon.ico'),
    page.request.get('/manifest.webmanifest'),
  ]);
  expect(respFavicon.status()).toBeLessThan(400);
  expect(respManifest.status()).toBeLessThan(400);
});
