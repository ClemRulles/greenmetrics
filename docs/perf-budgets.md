# Performance Budgets Guide

This document defines performance budgets, monitoring approaches, and failure handling for the GreenMetrics platform.

## Performance Budgets Overview

Performance budgets are limits set on metrics that affect user experience. They serve as guardrails to prevent performance regressions and ensure consistent user experience across deployments.

### Core Web Vitals Budgets

#### Largest Contentful Paint (LCP)
- **Target**: ≤ 2.5 seconds
- **Warning**: > 2.0 seconds  
- **Failure**: > 2.5 seconds
- **Measurement**: 75th percentile of real user data
- **Scope**: All public pages

#### First Input Delay (FID) / Interaction to Next Paint (INP)
- **Target**: ≤ 100ms (FID) / ≤ 200ms (INP)
- **Warning**: > 75ms (FID) / > 150ms (INP)
- **Failure**: > 100ms (FID) / > 200ms (INP)
- **Measurement**: 75th percentile of real user interactions
- **Scope**: Interactive pages

#### Cumulative Layout Shift (CLS)
- **Target**: ≤ 0.1
- **Warning**: > 0.05
- **Failure**: > 0.1
- **Measurement**: 75th percentile during page lifetime
- **Scope**: All pages

### Loading Performance Budgets

#### First Contentful Paint (FCP)
- **Target**: ≤ 1.5 seconds
- **Warning**: > 1.2 seconds
- **Failure**: > 2.0 seconds
- **Measurement**: 75th percentile
- **Scope**: All pages

#### Total Blocking Time (TBT)
- **Target**: ≤ 200ms
- **Warning**: > 150ms
- **Failure**: > 300ms
- **Measurement**: Lab testing (Lighthouse)
- **Scope**: Critical pages

#### Time to First Byte (TTFB)
- **Target**: ≤ 300ms (CDN), ≤ 800ms (origin)
- **Warning**: > 250ms (CDN), > 600ms (origin)
- **Failure**: > 500ms (CDN), > 1200ms (origin)
- **Measurement**: Server response time
- **Scope**: All requests

### Resource Budgets

#### JavaScript Bundle Size
- **Target**: ≤ 250KB (compressed)
- **Warning**: > 200KB (compressed)
- **Failure**: > 300KB (compressed)
- **Measurement**: Main bundle size after compression
- **Scope**: Initial page load

#### CSS Bundle Size
- **Target**: ≤ 100KB (compressed)
- **Warning**: > 80KB (compressed)
- **Failure**: > 120KB (compressed)
- **Measurement**: Critical CSS size after compression
- **Scope**: Initial page load

#### Image Payload
- **Target**: ≤ 500KB per page
- **Warning**: > 400KB per page
- **Failure**: > 600KB per page
- **Measurement**: Total image bytes loaded
- **Scope**: Above-the-fold content

#### Font Loading
- **Target**: ≤ 100KB total fonts
- **Warning**: > 80KB total fonts
- **Failure**: > 150KB total fonts
- **Measurement**: Total font file sizes
- **Scope**: Critical fonts only

### Lighthouse Performance Score
- **Target**: ≥ 90
- **Warning**: < 85
- **Failure**: < 80
- **Measurement**: Lighthouse lab score
- **Scope**: Key landing pages

## Measurement and Monitoring

### Lab Testing (Lighthouse CI)

#### Configuration
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.8}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
        "total-blocking-time": ["error", {"maxNumericValue": 300}]
      }
    }
  }
}
```

#### Test Pages
- **Landing Page**: `/` (English default)
- **Localized Pages**: `/en`, `/fr`
- **Feature Pages**: `/en/about`, `/fr/about`
- **Partner Flow**: `/en/app/partner`
- **Certificate View**: `/certificate/sample-carbon-neutral`

#### Test Frequency
- **PR Builds**: Every pull request
- **Scheduled**: Daily at 06:00 UTC
- **Post-Deployment**: After each production deployment
- **On-Demand**: Manual trigger via GitHub Actions

### Real User Monitoring (RUM)

#### Core Web Vitals Collection
```javascript
// Web Vitals measurement
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  posthog.capture('web_vital', {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta,
    entries: metric.entries,
    url: window.location.href,
    user_agent: navigator.userAgent,
    connection: navigator.connection?.effectiveType,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

#### Monitoring Setup
- **Service**: PostHog + Custom Web Vitals collection
- **Sampling**: 100% for Core Web Vitals
- **Segmentation**: By page type, user type, device, connection
- **Alerting**: Daily reports, threshold breaches

### Synthetic Monitoring

#### Uptime Monitoring
```typescript
// Playwright-based synthetic tests
import { test, expect } from '@playwright/test';

test('Performance benchmark', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/en');
  
  // Wait for LCP element
  await page.locator('[data-testid="hero-heading"]').waitFor();
  
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(2500); // LCP budget
  
  // Check CLS
  const cls = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          resolve(entries[entries.length - 1].value);
        }
      }).observe({ entryTypes: ['layout-shift'] });
      
      setTimeout(() => resolve(0), 5000);
    });
  });
  
  expect(cls).toBeLessThan(0.1); // CLS budget
});
```

#### Monitoring Frequency
- **Health Checks**: Every 5 minutes
- **Performance Tests**: Every 30 minutes
- **Full Audits**: Every 6 hours

## Budget Enforcement

### CI/CD Integration

#### Pull Request Checks
```yaml
# .github/workflows/performance-budget.yml
name: Performance Budget Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  performance-budget:
    runs-on: ubuntu-latest
    steps:
      - name: Run Lighthouse CI
        run: |
          npm run build
          npm run lighthouse:ci
          
      - name: Check Bundle Size
        run: |
          npm run build:analyze
          node scripts/check-bundle-size.js
          
      - name: Performance Budget Report
        run: |
          node scripts/performance-report.js
```

#### Bundle Size Monitoring
```javascript
// scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');

const BUNDLE_SIZE_LIMITS = {
  'main': 250 * 1024,      // 250KB
  'chunks/pages': 100 * 1024, // 100KB per page
  'css': 100 * 1024,      // 100KB CSS
};

function checkBundleSize() {
  const buildPath = path.join(process.cwd(), '.next');
  const bundleStats = JSON.parse(
    fs.readFileSync(path.join(buildPath, 'bundle-stats.json'))
  );
  
  let failed = false;
  
  Object.entries(BUNDLE_SIZE_LIMITS).forEach(([bundle, limit]) => {
    const actualSize = bundleStats[bundle]?.size || 0;
    if (actualSize > limit) {
      console.error(`❌ Bundle '${bundle}' exceeds limit: ${actualSize} > ${limit}`);
      failed = true;
    } else {
      console.log(`✅ Bundle '${bundle}' within limit: ${actualSize} ≤ ${limit}`);
    }
  });
  
  if (failed) {
    process.exit(1);
  }
}

checkBundleSize();
```

### Failure Handling

#### Budget Failure Workflow
1. **Detection**: CI/CD pipeline fails performance budget check
2. **Analysis**: Automated analysis identifies regression cause
3. **Notification**: Team notified via Slack/email with details
4. **Investigation**: Developer investigates performance regression
5. **Resolution**: Fix applied and verified before merge

#### Performance Regression Response
```bash
# 1. Identify the regression
npm run lighthouse:compare -- --base main --head feature-branch

# 2. Analyze bundle changes
npm run bundle:analyze:compare -- --base main --head feature-branch

# 3. Profile performance
npm run profile:performance

# 4. Fix and verify
npm run test:performance:local
```

#### Emergency Performance Issues
```bash
# 1. Immediate rollback if critical
kubectl rollout undo deployment/greenmetrics-web -n greenmetrics

# 2. Purge CDN cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# 3. Enable performance mode
# Reduce JavaScript execution, disable non-critical features

# 4. Scale up resources temporarily
kubectl scale deployment greenmetrics-web --replicas=10 -n greenmetrics
```

## Budget Optimization Strategies

### JavaScript Optimization

#### Code Splitting
```javascript
// Dynamic imports for code splitting
const DashboardComponent = lazy(() => import('./Dashboard'));
const ReportsComponent = lazy(() => import('./Reports'));

// Route-based splitting
const routes = [
  {
    path: '/app/dashboard',
    component: lazy(() => import('./pages/Dashboard'))
  },
  {
    path: '/app/reports', 
    component: lazy(() => import('./pages/Reports'))
  }
];
```

#### Tree Shaking
```javascript
// next.config.js optimization
module.exports = {
  experimental: {
    optimizePackageImports: [
      'lodash-es',
      'date-fns',
      'framer-motion'
    ]
  },
  webpack: (config) => {
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    return config;
  }
};
```

#### Bundle Analysis
```bash
# Analyze bundle composition
npm run build
npm run analyze

# Check for duplicate dependencies
npx webpack-bundle-analyzer .next/static/chunks/*.js

# Identify heavy imports
npx source-map-explorer .next/static/chunks/main-*.js
```

### CSS Optimization

#### Critical CSS
```javascript
// Extract critical CSS
const critical = require('critical');

critical.generate({
  inline: true,
  base: '.next/',
  src: 'index.html',
  dest: 'index-critical.html',
  dimensions: [
    { width: 320, height: 568 },  // Mobile
    { width: 1920, height: 1080 } // Desktop
  ]
});
```

#### CSS Purging
```javascript
// Remove unused CSS
const purgecss = require('@fullhuman/postcss-purgecss');

module.exports = {
  plugins: [
    purgecss({
      content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
      ],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
    })
  ]
};
```

### Image Optimization

#### Format Selection
```javascript
// next.config.js image optimization
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
  }
};
```

#### Lazy Loading
```jsx
// Optimized image component
import Image from 'next/image';

function OptimizedImage({ src, alt, priority = false }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority={priority}
      quality={85}
    />
  );
}
```

### Font Optimization

#### Font Loading Strategy
```css
/* Font display optimization */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-display: swap;
  font-weight: 100 900;
}
```

#### Preloading Critical Fonts
```jsx
// _document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

## Monitoring and Alerting

### Performance Dashboards

#### Grafana Metrics
```promql
# Core Web Vitals P75
histogram_quantile(0.75, rate(web_vitals_lcp_bucket[5m]))
histogram_quantile(0.75, rate(web_vitals_fid_bucket[5m]))
histogram_quantile(0.75, rate(web_vitals_cls_bucket[5m]))

# Lighthouse Scores
lighthouse_performance_score{page="home"}
lighthouse_performance_score{page="about"}

# Bundle Sizes
bundle_size_bytes{bundle="main"}
bundle_size_bytes{bundle="css"}

# Page Load Times
histogram_quantile(0.95, rate(page_load_duration_seconds_bucket[5m]))
```

#### Alert Rules
```yaml
# Prometheus alert rules
groups:
  - name: performance_budgets
    rules:
      - alert: LCPBudgetExceeded
        expr: histogram_quantile(0.75, rate(web_vitals_lcp_bucket[5m])) > 2.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "LCP budget exceeded"
          description: "75th percentile LCP is {{ $value }}s, exceeding 2.5s budget"
          
      - alert: CLSBudgetExceeded
        expr: histogram_quantile(0.75, rate(web_vitals_cls_bucket[5m])) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CLS budget exceeded"
          description: "75th percentile CLS is {{ $value }}, exceeding 0.1 budget"
          
      - alert: BundleSizeExceeded
        expr: bundle_size_bytes{bundle="main"} > 250000
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "JavaScript bundle size exceeded"
          description: "Main bundle size is {{ $value }} bytes, exceeding 250KB budget"
```

### Reporting

#### Weekly Performance Report
```bash
#!/bin/bash
# scripts/weekly-performance-report.sh

echo "📊 Weekly Performance Report - $(date)"
echo "================================================"

# Lighthouse scores
echo "🔍 Lighthouse Scores (Average):"
curl -s "$GRAFANA_API/query" -d 'query=avg(lighthouse_performance_score)' | jq -r '.data.result[0].value[1]'

# Core Web Vitals
echo "⚡ Core Web Vitals (P75):"
echo "LCP: $(curl -s "$GRAFANA_API/query" -d 'query=histogram_quantile(0.75, rate(web_vitals_lcp_bucket[7d]))' | jq -r '.data.result[0].value[1]')s"
echo "FID: $(curl -s "$GRAFANA_API/query" -d 'query=histogram_quantile(0.75, rate(web_vitals_fid_bucket[7d]))' | jq -r '.data.result[0].value[1]')ms"
echo "CLS: $(curl -s "$GRAFANA_API/query" -d 'query=histogram_quantile(0.75, rate(web_vitals_cls_bucket[7d]))' | jq -r '.data.result[0].value[1]')"

# Bundle sizes
echo "📦 Bundle Sizes:"
echo "Main JS: $(curl -s "$GRAFANA_API/query" -d 'query=bundle_size_bytes{bundle="main"}' | jq -r '.data.result[0].value[1]') bytes"
echo "CSS: $(curl -s "$GRAFANA_API/query" -d 'query=bundle_size_bytes{bundle="css"}' | jq -r '.data.result[0].value[1]') bytes"

# Budget compliance
echo "✅ Budget Compliance:"
# Calculate compliance percentages
```

#### Performance Trends
```sql
-- PostHog query for performance trends
SELECT 
  toStartOfDay(timestamp) as date,
  quantile(0.75)(properties.value) as p75_value,
  avg(properties.value) as avg_value,
  count() as samples
FROM events 
WHERE 
  event = 'web_vital' 
  AND properties.name = 'LCP'
  AND timestamp >= now() - interval 30 day
GROUP BY date
ORDER BY date;
```

## Performance Budget Evolution

### Quarterly Review Process
1. **Data Analysis**: Review 90 days of performance data
2. **Budget Assessment**: Evaluate current budget effectiveness
3. **Benchmark Updates**: Compare against industry standards
4. **Goal Setting**: Adjust budgets based on business priorities
5. **Documentation**: Update budget thresholds and processes

### Budget Tightening Strategy
- **Month 1-2**: Establish baseline with current budgets
- **Month 3-4**: Tighten budgets by 10-15%
- **Month 5-6**: Further optimize to reach target budgets
- **Ongoing**: Maintain strict budgets, continuous optimization

### Performance Investment Prioritization
1. **Core Web Vitals**: Highest priority (user experience)
2. **Load Performance**: High priority (conversion impact)
3. **Bundle Size**: Medium priority (development efficiency)
4. **Advanced Metrics**: Low priority (optimization depth)
