/**
 * Prometheus Metrics for GreenMetrics
 * 
 * Provides business and technical metrics in Prometheus format:
 * - HTTP request counters and histograms
 * - Database replication lag monitoring  
 * - Business KPIs (exports, billing, rate limits)
 * - Performance and error tracking
 */

import { randomUUID } from 'crypto';

// Metric interfaces
interface Counter {
  inc(labels?: Record<string, string>, value?: number): void;
  get(labels?: Record<string, string>): number;
}

interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): { count: number; sum: number; buckets: Record<string, number> };
}

interface Gauge {
  set(value: number, labels?: Record<string, string>): void;
  inc(labels?: Record<string, string>, value?: number): void;
  dec(labels?: Record<string, string>, value?: number): void;
  get(labels?: Record<string, string>): number;
}

// In-memory metric storage
class InMemoryCounter implements Counter {
  private values = new Map<string, number>();

  private getKey(labels?: Record<string, string>): string {
    if (!labels) return '';
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  inc(labels?: Record<string, string>, value = 1): void {
    const key = this.getKey(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }

  get(labels?: Record<string, string>): number {
    return this.values.get(this.getKey(labels)) || 0;
  }

  getAllValues(): Array<{ labels: string; value: number }> {
    return Array.from(this.values.entries()).map(([labels, value]) => ({
      labels,
      value
    }));
  }
}

class InMemoryHistogram implements Histogram {
  private buckets = [0.1, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  private values = new Map<string, { count: number; sum: number; buckets: Record<string, number> }>();

  private getKey(labels?: Record<string, string>): string {
    if (!labels) return '';
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  observe(value: number, labels?: Record<string, string>): void {
    const key = this.getKey(labels);
    const current = this.values.get(key) || { 
      count: 0, 
      sum: 0, 
      buckets: Object.fromEntries(this.buckets.map(b => [b.toString(), 0]))
    };

    current.count++;
    current.sum += value;

    // Update bucket counts
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        current.buckets[bucket.toString()]++;
      }
    }

    this.values.set(key, current);
  }

  get(labels?: Record<string, string>) {
    return this.values.get(this.getKey(labels)) || { 
      count: 0, 
      sum: 0, 
      buckets: Object.fromEntries(this.buckets.map(b => [b.toString(), 0]))
    };
  }

  getAllValues(): Array<{ labels: string; value: { count: number; sum: number; buckets: Record<string, number> } }> {
    return Array.from(this.values.entries()).map(([labels, value]) => ({
      labels,
      value
    }));
  }

  getBuckets(): number[] {
    return [...this.buckets];
  }
}

class InMemoryGauge implements Gauge {
  private values = new Map<string, number>();

  private getKey(labels?: Record<string, string>): string {
    if (!labels) return '';
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
  }

  set(value: number, labels?: Record<string, string>): void {
    const key = this.getKey(labels);
    this.values.set(key, value);
  }

  inc(labels?: Record<string, string>, value = 1): void {
    const key = this.getKey(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }

  dec(labels?: Record<string, string>, value = 1): void {
    const key = this.getKey(labels);
    this.values.set(key, (this.values.get(key) || 0) - value);
  }

  get(labels?: Record<string, string>): number {
    return this.values.get(this.getKey(labels)) || 0;
  }

  getAllValues(): Array<{ labels: string; value: number }> {
    return Array.from(this.values.entries()).map(([labels, value]) => ({
      labels,
      value
    }));
  }
}

// Metric registry
const counters = new Map<string, InMemoryCounter>();
const histograms = new Map<string, InMemoryHistogram>();
const gauges = new Map<string, InMemoryGauge>();

function getOrCreateCounter(name: string): InMemoryCounter {
  if (!counters.has(name)) {
    counters.set(name, new InMemoryCounter());
  }
  return counters.get(name)!;
}

function getOrCreateHistogram(name: string): InMemoryHistogram {
  if (!histograms.has(name)) {
    histograms.set(name, new InMemoryHistogram());
  }
  return histograms.get(name)!;
}

function getOrCreateGauge(name: string): InMemoryGauge {
  if (!gauges.has(name)) {
    gauges.set(name, new InMemoryGauge());
  }
  return gauges.get(name)!;
}

// Exported metrics
export const metrics = {
  // HTTP Metrics
  httpRequestsTotal: getOrCreateCounter('http_requests_total'),
  httpRequestDuration: getOrCreateHistogram('http_request_duration_ms'),

  // Rate Limiting
  rateLimitHitsTotal: getOrCreateCounter('rate_limit_hits_total'),
  
  // PDF/Export Metrics
  pdfExportsTotal: getOrCreateCounter('pdf_exports_total'),
  pdfRenderDuration: getOrCreateHistogram('pdf_render_duration_ms'),
  
  // Billing Metrics
  billingEntitlementDeniedTotal: getOrCreateCounter('billing_entitlement_denied_total'),
  
  // Webhook Metrics
  webhookFailuresTotal: getOrCreateCounter('webhook_failures_total'),
  
  // Compute Metrics
  computeDuration: getOrCreateHistogram('compute_duration_ms'),
  
  // Database Metrics
  dbReplicationLag: getOrCreateGauge('db_replication_lag_seconds'),
  
  // Session Metrics
  activeSessions: getOrCreateGauge('active_sessions'),
  
  // Queue Metrics (stub for future)
  queueDepth: getOrCreateGauge('queue_depth'),
};

/**
 * Format metrics in Prometheus exposition format
 */
export function formatPrometheusMetrics(): string {
  const lines: string[] = [];

  // Add metadata header
  lines.push('# HELP greenmetrics_build_info Build information');
  lines.push('# TYPE greenmetrics_build_info gauge');
  lines.push(`greenmetrics_build_info{version="${process.env.npm_package_version || '1.0.0'}",environment="${process.env.DEPLOY_ENV || 'development'}"} 1`);
  lines.push('');

  // Counters
  for (const [name, counter] of counters) {
    lines.push(`# HELP ${name} Total number of events`);
    lines.push(`# TYPE ${name} counter`);
    
    const values = counter.getAllValues();
    if (values.length === 0) {
      lines.push(`${name} 0`);
    } else {
      for (const { labels, value } of values) {
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${name}${labelStr} ${value}`);
      }
    }
    lines.push('');
  }

  // Histograms
  for (const [name, histogram] of histograms) {
    lines.push(`# HELP ${name} Request duration in milliseconds`);
    lines.push(`# TYPE ${name} histogram`);
    
    const values = histogram.getAllValues();
    const buckets = histogram.getBuckets();
    
    if (values.length === 0) {
      // Add zero values for all buckets
      for (const bucket of buckets) {
        lines.push(`${name}_bucket{le="${bucket}"} 0`);
      }
      lines.push(`${name}_bucket{le="+Inf"} 0`);
      lines.push(`${name}_count 0`);
      lines.push(`${name}_sum 0`);
    } else {
      for (const { labels, value } of values) {
        const labelPrefix = labels ? `{${labels},` : '{';
        const labelSuffix = labels ? '}' : '}';
        
        // Bucket counts
        for (const bucket of buckets) {
          lines.push(`${name}_bucket${labelPrefix}le="${bucket}"${labelSuffix} ${value.buckets[bucket.toString()] || 0}`);
        }
        lines.push(`${name}_bucket${labelPrefix}le="+Inf"${labelSuffix} ${value.count}`);
        lines.push(`${name}_count${labels ? `{${labels}}` : ''} ${value.count}`);
        lines.push(`${name}_sum${labels ? `{${labels}}` : ''} ${value.sum}`);
      }
    }
    lines.push('');
  }

  // Gauges
  for (const [name, gauge] of gauges) {
    lines.push(`# HELP ${name} Current value`);
    lines.push(`# TYPE ${name} gauge`);
    
    const values = gauge.getAllValues();
    if (values.length === 0) {
      lines.push(`${name} 0`);
    } else {
      for (const { labels, value } of values) {
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${name}${labelStr} ${value}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Check if metrics collection is enabled
 */
export function isMetricsEnabled(): boolean {
  return process.env.PROMETHEUS_METRICS_ENABLED !== 'false';
}

/**
 * Middleware to track HTTP requests
 */
export function createHttpMetricsMiddleware() {
  return (req: any, res: any, next: any) => {
    if (!isMetricsEnabled()) {
      return next();
    }

    const start = Date.now();
    const route = req.route?.path || req.url || 'unknown';
    const method = req.method || 'UNKNOWN';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode.toString();

      // Sanitize route to prevent cardinality explosion
      const sanitizedRoute = sanitizeRoute(route);

      metrics.httpRequestsTotal.inc({ 
        route: sanitizedRoute, 
        method, 
        status 
      });

      metrics.httpRequestDuration.observe(duration, { 
        route: sanitizedRoute, 
        method 
      });
    });

    next();
  };
}

/**
 * Sanitize route paths to prevent cardinality explosion
 */
function sanitizeRoute(route: string): string {
  return route
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9]{24}/g, '/:objectId')
    .replace(/\/[a-zA-Z0-9]{20,}/g, '/:token');
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  counters.clear();
  histograms.clear();
  gauges.clear();
}
