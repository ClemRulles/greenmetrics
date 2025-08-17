# feat(a11y): A11y Meta Sweep — Complete Metadata Coverage

## Summary

Ensures every route has proper `generateMetadata` for accessibility and SEO. Adds automated checks that every page has meaningful titles and OpenGraph data.

## Why

- Screen readers depend on proper `<title>` elements
- SEO requires consistent metadata across all routes
- Social sharing needs OpenGraph data
- Missing metadata creates accessibility barriers

## What Changed

- **Route Metadata**: Added `generateMetadata` to all routes missing it
- **Default Fallbacks**: Ensured all titles have meaningful defaults
- **OpenGraph Data**: Complete og:title, og:description, og:image coverage
- **E2E Validation**: Playwright test verifies `<title>` is non-empty on all routes

## Files Touched

- `app/[locale]/**/page.tsx` – Added/updated `generateMetadata` functions
- `e2e/a11y-meta.test.ts` – New test for metadata validation
- `lib/meta/` – Shared metadata utilities (if created)

## Verification

```bash
# Build check
npm run build

# A11y metadata test
npx playwright test e2e/a11y-meta.test.ts

# Manual spot check
curl -s http://localhost:3000/en | grep -o '<title>.*</title>'
```

## Expected Results

- All routes return meaningful `<title>` content
- OpenGraph metadata present on all pages
- No "Untitled" or empty titles in any route
- Screen reader navigation improved

## Acceptance Criteria

- [ ] Every route has `generateMetadata` function
- [ ] All titles are descriptive (no generic fallbacks)
- [ ] OpenGraph data complete (title, description, image)
- [ ] E2E test passes for metadata validation
- [ ] No accessibility regressions

## Follow-up

- Consider adding structured data (JSON-LD) for rich snippets
- Add metadata linting rules to prevent future regressions
- Implement dynamic OG image generation for content pages
