# PR #28 — Perf Guardrails (E2E + CI): Playwright + Axe Smoke Flows

## 📋 Overview

Building on PR #27's performance infrastructure, this PR will implement **end-to-end performance guardrails** with Playwright automation and Axe accessibility testing to protect performance gains in production.

## 🎯 Objectives

### 1. E2E Performance Testing
- **Playwright** smoke flows for critical user journeys
- **Real browser** performance measurement (not just simulated)
- **Multi-device** testing (desktop + mobile viewports)

### 2. Accessibility Guardrails  
- **Axe-core** integration for automated a11y testing
- **WCAG 2.1 AA** compliance validation
- **Regression prevention** for accessibility score

### 3. CI/CD Integration
- **Preview deployment** testing (not just localhost)
- **Visual regression** detection for layout shifts
- **Automated reporting** with actionable insights

## 🛠️ Implementation Plan

### Phase 1: Playwright Setup
```bash
# Install Playwright + Axe
npm install --save-dev @playwright/test playwright-expect axe-playwright

# Create test infrastructure
mkdir -p e2e/tests e2e/fixtures e2e/utils
```

**Files to Create:**
- `playwright.config.ts` - Multi-browser, multi-device config
- `e2e/tests/performance.spec.ts` - Core Web Vitals measurement
- `e2e/tests/accessibility.spec.ts` - Axe integration tests
- `e2e/tests/smoke.spec.ts` - Critical user journeys

### Phase 2: Performance Test Flows

**🏠 Homepage Tests (`/en`, `/fr`)**
- First visit performance (cold cache)
- Web Vitals measurement (LCP, CLS, INP)
- Font loading optimization validation
- Image optimization verification

**👥 Partner Dashboard (`/en/app/partner`)**
- Authenticated user performance
- Data-heavy page optimization
- Interactive component responsiveness

**📜 Certificate Pages (`/certificate/[id]`)**
- Dynamic content performance
- QR code generation speed
- Social sharing optimizations

### Phase 3: Accessibility Testing

**Automated Axe Scans:**
- Color contrast validation
- Keyboard navigation testing
- Screen reader compatibility
- Focus management verification

**Manual Test Coverage:**
- Locale switching functionality
- Form accessibility
- Modal and dialog patterns
- Dark/light theme support

### Phase 4: CI Integration

**GitHub Actions Enhancement:**
```yaml
# .github/workflows/e2e-perf.yml
name: E2E Performance & Accessibility

on:
  pull_request:
  deployment_status: # Runs after preview deployment

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
        device: [desktop, mobile]
```

## 📊 Success Metrics

### Performance Budgets (Enforced)
- **LCP**: ≤ 2.5s (blocking)
- **CLS**: ≤ 0.1 (blocking)  
- **INP**: ≤ 200ms (warning)
- **Performance Score**: ≥ 90% (warning)

### Accessibility Requirements (Enforced)
- **Axe violations**: 0 critical/serious (blocking)
- **WCAG 2.1 AA**: 100% compliance (blocking)
- **Accessibility Score**: ≥ 95% (blocking)

### Coverage Targets
- **Critical user paths**: 100% covered
- **Page types**: Homepage, dashboard, forms, certificates
- **Locales**: EN + FR validation
- **Devices**: Desktop + mobile testing

## 🔧 Technical Implementation

### Test Architecture
```
e2e/
├── config/
│   ├── playwright.config.ts      # Multi-browser setup
│   └── test-data.ts              # Test fixtures
├── tests/
│   ├── performance/
│   │   ├── core-vitals.spec.ts   # Web Vitals measurement
│   │   ├── loading.spec.ts       # Page load performance
│   │   └── interactions.spec.ts  # User interaction performance
│   ├── accessibility/
│   │   ├── axe-scans.spec.ts     # Automated a11y testing
│   │   ├── keyboard-nav.spec.ts  # Keyboard accessibility
│   │   └── screen-reader.spec.ts # ARIA validation
│   └── smoke/
│       ├── homepage.spec.ts      # Critical homepage flows
│       ├── auth.spec.ts          # Authentication flows
│       └── partner.spec.ts       # Partner dashboard flows
├── utils/
│   ├── performance.ts            # Web Vitals helpers
│   ├── accessibility.ts         # Axe integration
│   └── reporting.ts              # Test result formatting
└── fixtures/
    ├── users.ts                  # Test user data
    └── data.ts                   # Mock data sets
```

### Performance Measurement
```typescript
// e2e/utils/performance.ts
export async function measureWebVitals(page: Page) {
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        // Collect LCP, CLS, INP, etc.
        resolve(entries);
      });
      observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });
    });
  });
  
  return metrics;
}
```

### Accessibility Integration
```typescript
// e2e/tests/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test('Homepage accessibility', async ({ page }) => {
  await page.goto('/en');
  await injectAxe(page);
  
  await checkA11y(page, null, {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
    },
  });
});
```

## 🚀 Delivery Timeline

### Week 1: Foundation
- ✅ Playwright setup and configuration
- ✅ Basic smoke test implementation
- ✅ Performance measurement utilities

### Week 2: Core Tests
- ✅ Web Vitals measurement tests
- ✅ Axe accessibility integration
- ✅ Critical user journey coverage

### Week 3: CI Integration
- ✅ GitHub Actions workflow
- ✅ Preview deployment testing
- ✅ Automated reporting

### Week 4: Refinement
- ✅ Performance budget tuning
- ✅ False positive elimination
- ✅ Documentation and training

## 📈 Expected Outcomes

### Risk Mitigation
- **Performance regressions**: Caught before production
- **Accessibility bugs**: Prevented in CI/CD
- **Layout shifts**: Detected automatically
- **Loading performance**: Continuously monitored

### Developer Experience
- **Fast feedback**: Performance issues caught in PR
- **Actionable reports**: Clear guidance on fixes
- **Automated validation**: No manual testing required
- **Multi-browser coverage**: Cross-browser compatibility

### Business Impact
- **User experience**: Consistent performance across updates
- **Compliance**: WCAG 2.1 AA adherence maintained
- **SEO benefits**: Core Web Vitals protected
- **Brand trust**: Reliable, accessible application

## ✅ Definition of Done

- [ ] Playwright E2E framework operational
- [ ] Performance tests covering all critical paths
- [ ] Axe accessibility validation integrated
- [ ] CI/CD blocking on budget violations
- [ ] Multi-browser and device coverage
- [ ] Automated PR reporting functional
- [ ] Documentation complete for team onboarding

---

**Ready to proceed with PR #28 implementation?** 🚀

This comprehensive E2E testing framework will ensure the performance gains from PR #27 are protected long-term while maintaining accessibility standards and providing fast feedback to developers.
