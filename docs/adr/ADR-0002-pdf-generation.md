# ADR-0002: PDF Generation Strategy

- **Status**: Proposed
- **Date**: 2025-08-15
- **Context**: MVP requires bilingual ESG report generation with performance requirements of P95 < 10s generation time and <1% failure rate. Serverless deployment constraints require careful consideration of PDF rendering approach.

## Decision

**Start with synchronous server-side PDF generation**, instrument performance metrics, and prepare feature-flagged fallback to asynchronous background processing.

### Primary Approach: Synchronous Generation
- **Technology**: React-PDF library for server-side rendering
- **Rationale**: Simpler implementation, immediate user feedback, lower infrastructure complexity
- **Implementation**: Next.js API route `/api/reports/{id}/export` with locale parameter
- **Timeout**: 30-second serverless function limit

### Fallback Trigger Conditions
Switch to background processing when either condition is met:
- **P95 generation time > 8 seconds** (measured over 7-day rolling window)
- **Failure rate > 1%** (timeouts, memory errors, crashes)

### Feature Flag Configuration
```typescript
// Feature flag: pdf_queue_enabled
const PDF_QUEUE_ENABLED = process.env.PDF_QUEUE_ENABLED === 'true'

if (PDF_QUEUE_ENABLED) {
  // Enqueue job, return processing status
  return { status: 'processing', jobId: uuid() }
} else {
  // Synchronous generation
  const pdf = await generatePDF(report, locale)
  return { pdfUrl: signedUrl, expiresAt: timestamp }
}
```

### Background Processing Architecture (Fallback)
- **Queue**: Redis-based job queue (Upstash)
- **Worker**: Separate service on Railway/Fly.io for longer-running processes
- **Status Polling**: Client polls `/api/exports/{jobId}/status` endpoint
- **Notification**: Optional email when PDF is ready

## Consequences

### Advantages
- ✅ **Simple MVP implementation** - immediate user feedback, no job queue complexity
- ✅ **Lower infrastructure costs** - serverless-first approach
- ✅ **Gradual optimization** - data-driven decision to add complexity

### Disadvantages  
- ❌ **Serverless timeout risk** - large reports may hit 30s limit
- ❌ **User blocking** - synchronous generation blocks UI during processing
- ❌ **Memory constraints** - serverless memory limits for complex PDFs

### Monitoring Requirements
- **Performance metrics**: P95/P99 generation times by report size
- **Error tracking**: Timeout rates, memory errors, rendering failures  
- **User experience**: Abandonment rate during PDF generation
- **Feature flag**: A/B test percentage for background processing

## Alternatives Considered

### Alternative 1: React-PDF (Chosen)
- **Pros**: Pure JavaScript, serverless-friendly, good i18n support
- **Cons**: Limited complex layout support, larger bundle size

### Alternative 2: Puppeteer/Playwright  
- **Pros**: Full browser rendering, perfect layout fidelity
- **Cons**: Large memory footprint, slower cold starts, binary dependencies

### Alternative 3: Background-First
- **Pros**: No timeout risk, better user experience for large reports
- **Cons**: Implementation complexity, infrastructure costs, delayed feedback

## Implementation Plan

### Phase 1: Synchronous MVP
1. Implement React-PDF renderer with bilingual templates
2. Add performance instrumentation (Sentry, custom metrics)
3. Set up monitoring dashboards for generation times and failure rates

### Phase 2: Conditional Background Processing  
1. Implement Redis job queue and status endpoints
2. Deploy background worker service
3. Add feature flag with gradual rollout (10% → 50% → 100%)

### Phase 3: Optimization
1. Pre-generate PDFs for common report patterns
2. Implement progressive PDF loading (cover page first)
3. Add PDF caching based on report content hash
