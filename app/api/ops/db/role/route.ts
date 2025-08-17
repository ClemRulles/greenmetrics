/**
 * Database Role Check API
 * 
 * Determines if the database is running as primary or replica.
 * Useful for monitoring and failover detection.
 * 
 * GET /api/ops/db/role
 */

import { NextRequest, NextResponse } from 'next/server'
import { prismaWrite, prismaRead, checkDatabaseRole } from '@/lib/db'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check write database role
    const writeRole = await checkDatabaseRole(prismaWrite)
    
    // Check read database role (if different from write)
    let readRole: { role: 'primary' | 'replica'; inRecovery: boolean } | null = null
    
    if (process.env.DB_READ_REPLICA_ENABLED === 'true') {
      readRole = await checkDatabaseRole(prismaRead)
    }
    
    const response = {
      timestamp: new Date().toISOString(),
      configuration: {
        readReplicaEnabled: process.env.DB_READ_REPLICA_ENABLED === 'true',
        primaryRegion: process.env.PRIMARY_REGION
      },
      databases: {
        write: {
          role: writeRole.role,
          inRecovery: writeRole.inRecovery,
          connection: 'primary'
        },
        read: readRole ? {
          role: readRole.role,
          inRecovery: readRole.inRecovery,
          connection: 'replica'
        } : {
          role: writeRole.role,
          inRecovery: writeRole.inRecovery,
          connection: 'same-as-write'
        }
      },
      topology: {
        type: process.env.DB_READ_REPLICA_ENABLED === 'true' ? 'primary-replica' : 'single-node',
        writeNode: writeRole.role,
        readNode: readRole?.role || writeRole.role
      }
    }
    
    return NextResponse.json(response, { status: 200 })
    
  } catch (error) {
    const errorResponse = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      databases: {
        write: { role: 'unknown', error: 'Role check failed' },
        read: { role: 'unknown', error: 'Role check failed' }
      }
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
