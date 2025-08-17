// Client-side Core Web Vitals reporting with consent gating
// Used by Next.js to send performance metrics to analytics

export interface WebVitalMetric {
  id: string;
  name: string;
  value: number;
  label: 'web-vital' | 'custom';
  rating: 'good' | 'needs-improvement' | 'poor';
}

export function reportWebVitals(metric: WebVitalMetric) {
  try {
    // Only report if user has given consent for analytics
    const consent = document.cookie.includes('consent=accepted');
    if (!consent) return;

    // Report to our RUM endpoint with minimal data
    const data = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      label: metric.label,
      route: window.location.pathname,
      timestamp: Date.now(),
    };

    // Use sendBeacon for reliability (works even during page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/rum', JSON.stringify(data));
    } else {
      // Fallback for older browsers
      fetch('/api/rum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {
        // Silent fail - performance metrics are not critical
      });
    }
  } catch {
    // Silently fail to avoid impacting user experience
    console.warn('Failed to report web vital');
  }
}
