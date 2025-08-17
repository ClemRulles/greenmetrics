import { NextResponse } from 'next/server';

interface WebVitalMetric {
  name: string;
  value: number;
  route?: string;
  label?: string;
  timestamp?: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as WebVitalMetric;
    const { name, value, route, label, timestamp } = body;
    
    // Basic validation
    if (!name || typeof value !== 'number') {
      return NextResponse.json({ error: 'Invalid metric data' }, { status: 400 });
    }

    // Log the metric (in production, send to your analytics service)
    console.log('📊 Web Vital:', {
      metric: name,
      value: Math.round(value),
      route,
      label,
      timestamp: new Date(timestamp || Date.now()).toISOString(),
    });

    // In production, you would:
    // 1. Send to PostHog/Sentry/DataDog
    // 2. Store in your database
    // 3. Process for dashboards
    
    // Example: Send to PostHog (if configured and consent given)
    if (process.env.NEXT_PUBLIC_POSTHOG_HOST && process.env.POSTHOG_API_KEY) {
      // This would be the actual PostHog integration
      // await posthog.capture('web_vital', { name, value, route });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('RUM endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
