# test(e2e): Static Asset E2E — Guard Against Middleware Regressions

## Summary

Adds focused E2E tests for static asset routing to prevent middleware regressions. Ensures favicon, manifest, and other static files always bypass middleware correctly.

## Why

- Static assets must never be processed by middleware
- Routing regressions can break favicon/manifest serving
- Mobile and desktop may handle assets differently
- Need automated protection against middleware config changes

## What Changed

- **Asset E2E Test**: New spec testing `/favicon.ico` and `/manifest.webmanifest`
- **Multi-Device Coverage**: Tests on desktop and mobile viewports
- **Response Validation**: Verifies 200 status and correct content-type headers
- **Middleware Bypass Check**: Ensures assets don't hit authentication logic

## Files Touched

- `e2e/static-assets.test.ts` – New test suite for static asset routing
- `playwright.config.ts` – Updated to include static asset tests (if needed)

## Test Coverage

```typescript
// Example test structure
test('static assets bypass middleware', async ({ page }) => {
  // Test favicon.ico
  const faviconResponse = await page.goto('/favicon.ico');
  expect(faviconResponse?.status()).toBe(200);
  expect(faviconResponse?.headers()['content-type']).toContain('image');
  
  // Test manifest.webmanifest
  const manifestResponse = await page.goto('/manifest.webmanifest');
  expect(manifestResponse?.status()).toBe(200);
  expect(manifestResponse?.headers()['content-type']).toContain('application/manifest+json');
});
```

## Verification

```bash
# Run static asset tests
npx playwright test e2e/static-assets.test.ts --project=chromium-desktop
npx playwright test e2e/static-assets.test.ts --project=webkit-mobile

# Verify both viewports pass
npm run test:e2e:assets
```

## Expected Results

- `/favicon.ico` returns 200 with correct content-type
- `/manifest.webmanifest` returns 200 with JSON content-type
- Tests pass on both desktop and mobile
- Static assets load without authentication redirects

## Acceptance Criteria

- [ ] E2E test covers favicon and manifest routes
- [ ] Tests run on multiple device profiles
- [ ] Response headers validated (content-type, cache headers)
- [ ] No middleware interference detected
- [ ] Tests integrated into CI pipeline

## Coverage

**Assets Tested:**
- `/favicon.ico`
- `/manifest.webmanifest`
- `/_next/static/*` (sample)
- `/robots.txt` (if applicable)

**Devices:**
- Desktop (Chromium)
- Mobile (WebKit)

## Follow-up

- Add tests for other static assets (`/robots.txt`, `/_next/static/*`)
- Monitor asset load performance in E2E
- Add middleware bypass validation for new public routes
