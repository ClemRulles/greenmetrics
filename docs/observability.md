# GreenMetrics Observability Guide

## Overview

GreenMetrics implements a comprehensive observability stack with distributed tracing, metrics collection, structured logging, and automated alerting. This guide covers configuration, development practices, and operational procedures.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Telemetry     │    │   Monitoring    │
│                 │    │   Collector     │    │   Stack         │
│  ┌───────────┐  │    │                 │    │                 │
│  │   OTEL    │  │───▶│  ┌───────────┐  │───▶│  ┌───────────┐  │
│  │ Tracing   │  │    │  │   OTLP    │  │    │  │ Grafana   │  │
│  └───────────┘  │    │  │Collector  │  │    │  │Dashboards │  │
│                 │    │  └───────────┘  │    │  └───────────┘  │
│  ┌───────────┐  │    │                 │    │                 │
│  │Prometheus │  │───▶│  ┌───────────┐  │───▶│  ┌───────────┐  │
│  │ Metrics   │  │    │  │Prometheus │  │    │  │Prometheus │  │
│  └───────────┘  │    │  │ Server    │  │    │  │ Alerts    │  │
│                 │    │  └───────────┘  │    │  └───────────┘  │
│  ┌───────────┐  │    │                 │    │                 │
│  │Structured │  │───▶│  ┌───────────┐  │───▶│  ┌───────────┐  │
│  │   Logs    │  │    │  │   Log     │  │    │  │   Log     │  │
│  └───────────┘  │    │  │Aggregator │  │    │  │ Analytics │  │
└─────────────────┘    │  └───────────┘  │    │  └───────────┘  │
                       └─────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

```bash
# Tracing Configuration
OTEL_ENABLED=false                                    # Enable OpenTelemetry tracing
OTEL_SERVICE_NAME=greenmetrics-web                   # Service name in traces
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.example.com/v1/traces  # OTLP endpoint
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer xyz  # Optional auth headers
OTEL_TRACES_SAMPLER=parentbased_traceidratio         # Sampling strategy
OTEL_TRACES_SAMPLER_ARG=0.1                         # 10% sampling rate
DEPLOY_ENV=staging                                   # Environment label
REGION=eu-west-3                                     # Region label

# Metrics Configuration
PROMETHEUS_METRICS_ENABLED=true                     # Enable metrics collection
METRICS_BEARER_TOKEN=secure-random-token            # API protection token

# Logging Configuration
LOG_LEVEL=info                                       # Log level (debug|info|warn|error)
LOG_PRETTY=false                                     # Pretty print for development
LOG_REDACT_KEYS='["authorization","email","password"]'  # PII redaction
```

### Development Setup

```bash
# 1. Enable tracing locally (optional)
export OTEL_ENABLED=true
export OTEL_SERVICE_NAME=greenmetrics-dev
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# 2. Enable pretty logging
export LOG_LEVEL=debug
export LOG_PRETTY=true

# 3. Set a development metrics token
export METRICS_BEARER_TOKEN=dev-token-change-me

# 4. Start development server
npm run dev
```

### Production Setup

```bash
# 1. Configure OTLP endpoint (Jaeger, Honeycomb, etc.)
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
export OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY

# 2. Set appropriate sampling for production
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.01  # 1% sampling for production

# 3. Configure secure metrics token
export METRICS_BEARER_TOKEN=$(openssl rand -hex 32)

# 4. Production logging
export LOG_LEVEL=info
export LOG_PRETTY=false
```

## Tracing

### How It Works

OpenTelemetry automatically instruments:
- HTTP requests (incoming and outgoing)
- Database operations (Prisma)
- Next.js API routes
- Express middleware

### Privacy & Security

**Automatic PII Redaction:**
- Email addresses → `[REDACTED_EMAIL]`
- Bearer tokens → `Bearer [REDACTED_TOKEN]`
- API keys → `[REDACTED_SECRET_KEY]`

**Request ID Correlation:**
- Traces include `x-request-id` headers
- Links requests across services
- Enables end-to-end tracing

### Sampling Strategy

**Development:** 100% sampling for debugging
```bash
export OTEL_TRACES_SAMPLER_ARG=1.0
```

**Staging:** 10% sampling for testing
```bash
export OTEL_TRACES_SAMPLER_ARG=0.1
```

**Production:** 1% sampling for cost control
```bash
export OTEL_TRACES_SAMPLER_ARG=0.01
```

### Custom Instrumentation

```typescript
import { trace } from '@opentelemetry/api';

export async function processUserData(userId: string) {
  const tracer = trace.getTracer('greenmetrics');
  
  return tracer.startActiveSpan('process-user-data', async (span) => {
    span.setAttributes({
      'user.id': userId,
      'operation': 'data-processing'
    });
    
    try {
      // Your business logic here
      const result = await processData(userId);
      
      span.setAttributes({
        'result.count': result.length,
        'processing.success': true
      });
      
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Metrics

### Available Metrics

**HTTP Metrics:**
```
http_requests_total{route,method,status}     # Request counter
http_request_duration_ms{route,method}       # Response time histogram
```

**Business Metrics:**
```
pdf_exports_total{status}                    # PDF generation counter
pdf_render_duration_ms                       # PDF render time
billing_entitlement_denied_total             # Access denials
webhook_failures_total                       # Webhook errors
rate_limit_hits_total                        # Rate limiting
```

**Infrastructure Metrics:**
```
db_replication_lag_seconds                   # Database lag
active_sessions                              # Current sessions
queue_depth                                  # Background jobs
```

### Using Metrics in Code

```typescript
import { metrics } from '@/lib/observability/metrics';

// Count events
metrics.pdfExportsTotal.inc({ status: 'success' });

// Measure duration
const timer = Date.now();
// ... do work ...
metrics.pdfRenderDuration.observe(Date.now() - timer);

// Set gauge values
metrics.activeSessions.set(getCurrentSessionCount());
```

### Accessing Metrics

```bash
# Local development
curl -H "Authorization: Bearer dev-token" \
  http://localhost:3000/api/ops/metrics

# Production (requires valid token)
curl -H "Authorization: Bearer $METRICS_BEARER_TOKEN" \
  https://app.greenmetrics.com/api/ops/metrics
```

## Logging

### Log Structure

All logs follow a consistent JSON structure:

```json
{
  "ts": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "msg": "User action completed",
  "reqId": "req_abc123",
  "orgId": "org_xyz789",
  "route": "/api/exports/pdf",
  "region": "eu-west-3",
  "duration": 1250,
  "userId": "user_hash_abc",
  "action": "pdf_export",
  "status": "success"
}
```

### Using the Logger

```typescript
import { logger, createRequestLogger } from '@/lib/observability/logger';

// Basic logging
logger.info('Application started');
logger.error('Database connection failed', { error: dbError });

// Request-scoped logging
export async function handler(req: NextRequest) {
  const reqLogger = createRequestLogger(req);
  
  reqLogger.info('Processing request');
  
  try {
    const result = await processRequest();
    reqLogger.info('Request completed', { resultCount: result.length });
    return result;
  } catch (error) {
    reqLogger.error('Request failed', { error });
    throw error;
  }
}

// Performance timing
const timer = logger.time('pdf-generation');
await generatePDF();
timer.end('PDF generation completed', { pages: 5 });
```

### PII Redaction

The logger automatically redacts sensitive information:

```typescript
// This log entry...
logger.info('User login', {
  email: 'user@example.com',
  authorization: 'Bearer secret-token',
  password: 'user-password'
});

// ...becomes:
{
  "msg": "User login",
  "email": "[REDACTED_EMAIL]",
  "authorization": "Bearer [REDACTED_TOKEN]",
  "password": "[REDACTED]"
}
```

### Log Levels

- **debug**: Detailed diagnostic information
- **info**: General application flow
- **warn**: Potentially harmful situations
- **error**: Error events that don't stop execution

## Alerting

### Alert Configuration

Alerts are defined in `observability/alerts/prometheus-rules.yaml`:

```yaml
- alert: HighErrorRate
  expr: (
    sum(rate(http_requests_total{status=~"5.."}[5m])) /
    sum(rate(http_requests_total[5m]))
  ) > 0.02
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"
    runbook_url: "https://docs.greenmetrics.com/runbooks/high-error-rate"
```

### Alert Severity Levels

**Critical (Page immediately):**
- Service down
- High error rate (> 2%)
- Database replication lag (> 3 minutes)

**Warning (Investigate within 1 hour):**
- High latency (> 1.5s P95)
- Webhook failures
- Rate limit saturation

### Runbook Integration

Each alert includes a `runbook_url` linking to specific troubleshooting steps in our [monitoring runbook](./monitoring-runbook.md).

## Dashboards

### Service Overview
- Request rate and error rate
- Response time percentiles
- Status code distribution
- Key business metrics

### Database HA
- Replication lag monitoring
- Health check success rates
- Read/write operation split
- RPO/RTO compliance

### Business Metrics
- PDF export success rates
- Billing events and denials
- Webhook delivery status
- User activity patterns

## Development Best Practices

### 1. Request ID Propagation

Always include request IDs in logs and traces:

```typescript
export async function apiHandler(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateId();
  const reqLogger = logger.withRequest(requestId, req.url);
  
  // Log important events
  reqLogger.info('API request started');
  
  // Pass request ID to downstream calls
  const result = await externalService.call({
    headers: { 'x-request-id': requestId }
  });
  
  reqLogger.info('API request completed', { resultSize: result.length });
}
```

### 2. Error Context

Provide rich context in error logs:

```typescript
try {
  await processPayment(amount, customerId);
} catch (error) {
  logger.error('Payment processing failed', {
    error,
    amount,
    customerId: hashUserId(customerId), // Hash PII
    paymentMethod: 'stripe',
    context: 'checkout-flow'
  });
  throw error;
}
```

### 3. Performance Monitoring

Track performance for critical operations:

```typescript
export async function generateReport(reportId: string) {
  const timer = logger.time('report-generation');
  
  try {
    metrics.reportGenerationTotal.inc({ type: 'pdf' });
    
    const report = await createReport(reportId);
    
    const duration = timer.end('Report generated successfully');
    metrics.reportGenerationDuration.observe(duration);
    
    return report;
  } catch (error) {
    metrics.reportGenerationTotal.inc({ type: 'pdf', status: 'error' });
    timer.end('Report generation failed');
    throw error;
  }
}
```

### 4. Business Metrics

Track important business events:

```typescript
// Track successful PDF exports
metrics.pdfExportsTotal.inc({ 
  status: 'success', 
  type: 'sustainability-report' 
});

// Track billing events
metrics.billingEntitlementDeniedTotal.inc({ 
  reason: 'plan-limit-exceeded' 
});

// Track feature usage
metrics.featureUsageTotal.inc({ 
  feature: 'carbon-calculator',
  plan: 'premium'
});
```

## Monitoring Checklist

### For New Features

- [ ] Add appropriate metrics for success/failure rates
- [ ] Include performance timing measurements
- [ ] Add structured logging for important events
- [ ] Consider alert thresholds for failure scenarios
- [ ] Update dashboards if introducing new patterns

### For API Endpoints

- [ ] Request/response logging with sanitized data
- [ ] Error rate and latency metrics
- [ ] Authentication/authorization event tracking
- [ ] Rate limiting metrics
- [ ] Business logic success/failure tracking

### For Background Jobs

- [ ] Job execution metrics (success/failure/duration)
- [ ] Queue depth monitoring
- [ ] Error logging with job context
- [ ] Retry logic instrumentation
- [ ] Dead letter queue monitoring

## Troubleshooting

### Common Issues

**Metrics not appearing:**
```bash
# Check if metrics are enabled
echo $PROMETHEUS_METRICS_ENABLED

# Verify metrics endpoint
curl -H "Authorization: Bearer $METRICS_BEARER_TOKEN" \
  http://localhost:3000/api/ops/metrics

# Check for TypeScript errors
npm run typecheck
```

**Traces not being sent:**
```bash
# Verify OTEL configuration
echo $OTEL_ENABLED
echo $OTEL_EXPORTER_OTLP_ENDPOINT

# Check for network connectivity
curl -v $OTEL_EXPORTER_OTLP_ENDPOINT

# Check application logs for OTEL errors
grep -i "otel" logs.json
```

**High log volume:**
```bash
# Adjust log level
export LOG_LEVEL=warn

# Check for log loops
grep -c "timestamp" logs.json | head -10

# Review log redaction
export LOG_REDACT_KEYS='["password","token","secret","email"]'
```

### Performance Impact

**Tracing Overhead:**
- < 1% CPU impact with 1% sampling
- < 100KB memory per 1000 spans
- Network: ~1KB per span

**Metrics Overhead:**
- < 0.1% CPU impact
- ~10MB memory for metric storage
- Minimal network (pull-based)

**Logging Overhead:**
- JSON formatting: ~5-10% CPU
- I/O depends on log volume
- Use appropriate log levels

## Migration Guide

### From Console Logging

```typescript
// Before
console.log('User logged in:', userId);
console.error('Database error:', error);

// After
import { logger } from '@/lib/observability/logger';

logger.info('User logged in', { userId: hashUserId(userId) });
logger.error('Database error', { error, context: 'user-auth' });
```

### Adding Metrics to Existing Code

```typescript
// Before
export async function exportPDF(data: any) {
  return await generatePDF(data);
}

// After
import { metrics } from '@/lib/observability/metrics';

export async function exportPDF(data: any) {
  const start = Date.now();
  
  try {
    const result = await generatePDF(data);
    
    metrics.pdfExportsTotal.inc({ status: 'success' });
    metrics.pdfRenderDuration.observe(Date.now() - start);
    
    return result;
  } catch (error) {
    metrics.pdfExportsTotal.inc({ status: 'error' });
    throw error;
  }
}
```

## Resources

### Documentation
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)

### Tools
- [Prometheus Query Builder](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [OTEL Collector](https://opentelemetry.io/docs/collector/)
- [Jaeger UI](https://www.jaegertracing.io/docs/1.35/getting-started/)

### Support
- Internal: #observability Slack channel
- External: [OpenTelemetry Community](https://opentelemetry.io/community/)

---
*Last Updated: January 2025*  
*Next Review: February 2025*
