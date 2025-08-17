/**
 * Database Health Check API
 * 
 * Provides health status for both write (primary) and read (replica) databases.
 * Includes latency measurements and replication lag monitoring.
 * Updates Prometheus metrics for monitoring and alerting.
 * 
 * GET /api/ops/db/health
 */

import { NextRequest, NextResponse } from 'next/server'
import { prismaWrite, prismaRead, checkDatabaseHealth, checkReplicationLag } from '@/lib/db'
import { metrics, isMetricsEnabled } from '@/lib/observability/metrics'
import { logger } from '@/lib/observability/logger'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const reqLogger = logger.withRequest(
    request.headers.get('x-request-id') || 'health-req',
    '/api/ops/db/health'
  )

  try {
    reqLogger.info('Starting database health check')

    // Check write database health
    const writeHealth = await checkDatabaseHealth(prismaWrite)
    
    // Check read database health
    const readHealth = await checkDatabaseHealth(prismaRead)
    
    // Check replication lag if replica is enabled
    let replicationLag: { lagSeconds: number | null; error?: string } | null = null
    
    if (process.env.DB_READ_REPLICA_ENABLED === 'true') {
      replicationLag = await checkReplicationLag(prismaWrite, prismaRead)
      
      // Update replication lag metric
      if (isMetricsEnabled() && replicationLag.lagSeconds !== null) {
        metrics.dbReplicationLag.set(replicationLag.lagSeconds)
        reqLogger.debug('Updated replication lag metric', { 
          lagSeconds: replicationLag.lagSeconds 
        })
      }
    }
    
    // Overall health status
    const isHealthy = writeHealth.ok && readHealth.ok
    const status = isHealthy ? 200 : 503
    
    // Log health check results
    const duration = Date.now() - startTime
    reqLogger.info('Database health check completed', {
      isHealthy,
      writeOk: writeHealth.ok,
      readOk: readHealth.ok,
      replicationLagSeconds: replicationLag?.lagSeconds,
      duration
    })

    // Update HTTP metrics if enabled
    if (isMetricsEnabled()) {
      metrics.httpRequestsTotal.inc({ 
        route: '/api/ops/db/health', 
        method: 'GET',
        status: status.toString()
      })
      metrics.httpRequestDuration.observe(duration, { 
        route: '/api/ops/db/health', 
        method: 'GET' 
      })
    }
    
    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        write: {
          ok: writeHealth.ok,
          latencyMs: writeHealth.latencyMs,
          error: writeHealth.error,
          database: 'primary'
        },
        read: {
          ok: readHealth.ok,
          latencyMs: readHealth.latencyMs,
          error: readHealth.error,
          database: process.env.DB_READ_REPLICA_ENABLED === 'true' ? 'replica' : 'primary',
          replicationEnabled: process.env.DB_READ_REPLICA_ENABLED === 'true'
        }
      },
      replication: replicationLag ? {
        lagSeconds: replicationLag.lagSeconds,
        error: replicationLag.error,
        withinTarget: replicationLag.lagSeconds !== null ? replicationLag.lagSeconds <= 300 : null // 5 minutes RPO
      } : undefined,
      configuration: {
        readReplicaEnabled: process.env.DB_READ_REPLICA_ENABLED === 'true',
        primaryRegion: process.env.PRIMARY_REGION,
        readAfterWriteMs: Number(process.env.READ_AFTER_WRITE_MS || 1500)
      }
    }
    
    return NextResponse.json(response, { status })
    
  } catch (error) {
    const duration = Date.now() - startTime
    const reqLogger = logger.withRequest(
      request.headers.get('x-request-id') || 'health-req',
      '/api/ops/db/health'
    )

    reqLogger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    })

    // Update error metrics if enabled
    if (isMetricsEnabled()) {
      metrics.httpRequestsTotal.inc({ 
        route: '/api/ops/db/health', 
        method: 'GET',
        status: '500'
      })
      metrics.httpRequestDuration.observe(duration, { 
        route: '/api/ops/db/health', 
        method: 'GET' 
      })
    }

    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        write: { ok: false, error: 'Health check failed' },
        read: { ok: false, error: 'Health check failed' }
      }
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
