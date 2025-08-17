/**
 * Prometheus Metrics Endpoint
 * 
 * Exposes application metrics in Prometheus format.
 * Protected by bearer token authentication.
 * 
 * Runtime: Node.js (required for metrics collection)
 */

import { NextRequest, NextResponse } from 'next/server';
import { formatPrometheusMetrics, isMetricsEnabled } from '@/lib/observability/metrics';
import { logger } from '@/lib/observability/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const reqLogger = logger.withRequest(
    request.headers.get('x-request-id') || 'metrics-req',
    '/api/ops/metrics'
  );

  try {
    // Check if metrics are enabled
    if (!isMetricsEnabled()) {
      reqLogger.warn('Metrics endpoint called but metrics are disabled');
      return NextResponse.json(
        { error: 'Metrics collection is disabled' },
        { status: 503 }
      );
    }

    // Authenticate request
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.METRICS_BEARER_TOKEN;

    if (!expectedToken) {
      reqLogger.error('METRICS_BEARER_TOKEN not configured');
      return NextResponse.json(
        { error: 'Metrics endpoint not properly configured' },
        { status: 503 }
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reqLogger.warn('Metrics access attempt without bearer token');
      return NextResponse.json(
        { error: 'Bearer token required' },
        { status: 401 }
      );
    }

    const providedToken = authHeader.slice(7); // Remove 'Bearer ' prefix
    if (providedToken !== expectedToken) {
      reqLogger.warn('Metrics access attempt with invalid token');
      return NextResponse.json(
        { error: 'Invalid bearer token' },
        { status: 401 }
      );
    }

    // Generate metrics
    const metricsText = formatPrometheusMetrics();
    const duration = Date.now() - startTime;

    reqLogger.info('Metrics exported successfully', {
      duration,
      metricsSize: metricsText.length
    });

    return new NextResponse(metricsText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    reqLogger.error('Failed to export metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Disable other HTTP methods
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
