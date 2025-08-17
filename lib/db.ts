/**
 * Database Connection Management with Read/Write Split
 * 
 * This module provides separate Prisma clients for read and write operations,
 * enabling multi-region database setup with primary/replica architecture.
 * 
 * Features:
 * - Write operations always go to primary database
 * - Read operations can be routed to read replica when enabled
 * - Automatic fallback to primary when replica is unavailable
 * - Read-after-write consistency protection
 * - Connection pooling optimization
 */

import { PrismaClient } from '@prisma/client'

// Global declarations for development hot reloading
declare global {
  var __prismaWrite: PrismaClient | undefined
  var __prismaRead: PrismaClient | undefined
}

/**
 * Primary database client for write operations
 * Always connects to the primary database for consistency
 */
export const prismaWrite: PrismaClient = 
  globalThis.__prismaWrite ?? 
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL_WRITE || process.env.DATABASE_URL
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

/**
 * Read database client for read operations
 * Connects to read replica when enabled, falls back to primary
 */
export const prismaRead: PrismaClient =
  globalThis.__prismaRead ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DB_READ_REPLICA_ENABLED === 'true' 
          ? (process.env.DATABASE_URL_READ || process.env.DATABASE_URL_WRITE || process.env.DATABASE_URL)
          : (process.env.DATABASE_URL_WRITE || process.env.DATABASE_URL)
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// Prevent multiple instances during development hot reloading
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaWrite = prismaWrite
  globalThis.__prismaRead = prismaRead
}

/**
 * Database operation helpers
 */

/**
 * Get write database client
 * Always returns the primary database connection
 */
export function dbWrite(): PrismaClient {
  return prismaWrite
}

/**
 * Get read database client with consistency options
 * @param options - Read consistency options
 */
export function dbRead(options: {
  /**
   * Force read from primary database
   * Useful for read-after-write scenarios
   */
  forcePrimary?: boolean
  /**
   * Request context for consistency tracking
   */
  context?: {
    headers?: Record<string, string>
    recentWrite?: boolean
  }
} = {}): PrismaClient {
  // Force primary if explicitly requested
  if (options.forcePrimary) {
    return prismaWrite
  }

  // Check for read consistency header
  if (options.context?.headers?.['x-read-consistency'] === 'primary') {
    return prismaWrite
  }

  // Force primary if recent write detected in context
  if (options.context?.recentWrite) {
    return prismaWrite
  }

  // Use read replica if available, otherwise primary
  return process.env.DB_READ_REPLICA_ENABLED === 'true' ? prismaRead : prismaWrite
}

/**
 * Execute a database operation with automatic read/write routing
 * @param operation - Database operation function
 * @param options - Operation options
 */
export async function dbOperation<T>(
  operation: (client: PrismaClient) => Promise<T>,
  options: {
    type: 'read' | 'write'
    forcePrimary?: boolean
    context?: {
      headers?: Record<string, string>
      recentWrite?: boolean
    }
  }
): Promise<T> {
  const client = options.type === 'write' 
    ? dbWrite() 
    : dbRead({ 
        forcePrimary: options.forcePrimary,
        context: options.context 
      })

  try {
    return await operation(client)
  } catch (error) {
    // If read operation fails on replica, retry on primary
    if (options.type === 'read' && client === prismaRead && process.env.DB_READ_REPLICA_ENABLED === 'true') {
      console.warn('Read replica operation failed, falling back to primary:', error)
      return await operation(prismaWrite)
    }
    throw error
  }
}

/**
 * Health check utilities
 */

/**
 * Check database connection health
 * @param client - Prisma client to check
 */
export async function checkDatabaseHealth(client: PrismaClient): Promise<{
  ok: boolean
  latencyMs: number
  error?: string
}> {
  const start = Date.now()
  
  try {
    await client.$queryRaw`SELECT 1`
    return {
      ok: true,
      latencyMs: Date.now() - start
    }
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if database is in recovery mode (replica)
 * @param client - Prisma client to check
 */
export async function checkDatabaseRole(client: PrismaClient): Promise<{
  role: 'primary' | 'replica'
  inRecovery: boolean
}> {
  try {
    const result = await client.$queryRaw<{ pg_is_in_recovery: boolean }[]>`
      SELECT pg_is_in_recovery() as pg_is_in_recovery
    `
    
    const inRecovery = result[0]?.pg_is_in_recovery || false
    
    return {
      role: inRecovery ? 'replica' : 'primary',
      inRecovery
    }
  } catch (error) {
    // Fallback to primary assumption if query fails
    return {
      role: 'primary',
      inRecovery: false
    }
  }
}

/**
 * Check replication lag between primary and replica
 * @param writeClient - Primary database client
 * @param readClient - Replica database client
 */
export async function checkReplicationLag(
  writeClient: PrismaClient, 
  readClient: PrismaClient
): Promise<{
  lagSeconds: number | null
  error?: string
}> {
  try {
    // Get current LSN from primary
    const primaryResult = await writeClient.$queryRaw<{ pg_current_wal_lsn: string }[]>`
      SELECT pg_current_wal_lsn() as pg_current_wal_lsn
    `
    
    // Get last received LSN from replica
    const replicaResult = await readClient.$queryRaw<{ 
      pg_last_wal_receive_lsn: string,
      pg_wal_lsn_diff: number 
    }[]>`
      SELECT 
        pg_last_wal_receive_lsn() as pg_last_wal_receive_lsn,
        EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as pg_wal_lsn_diff
    `
    
    const lagSeconds = replicaResult[0]?.pg_wal_lsn_diff || 0
    
    return {
      lagSeconds: Number(lagSeconds)
    }
  } catch (error) {
    return {
      lagSeconds: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Graceful shutdown handler
 */
export async function disconnectDatabases(): Promise<void> {
  try {
    await Promise.all([
      prismaWrite.$disconnect(),
      prismaRead.$disconnect()
    ])
  } catch (error) {
    console.error('Error disconnecting from databases:', error)
  }
}

// Graceful shutdown on process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', disconnectDatabases)
  process.on('SIGINT', disconnectDatabases)
  process.on('SIGTERM', disconnectDatabases)
}

/**
 * Development utilities
 */
if (process.env.NODE_ENV === 'development') {
  // Log database configuration in development
  console.log('Database Configuration:', {
    readReplicaEnabled: process.env.DB_READ_REPLICA_ENABLED === 'true',
    primaryRegion: process.env.PRIMARY_REGION,
    readAfterWriteMs: process.env.READ_AFTER_WRITE_MS,
    writeUrl: process.env.DATABASE_URL_WRITE ? '***configured***' : 'not configured',
    readUrl: process.env.DATABASE_URL_READ ? '***configured***' : 'not configured'
  })
}
