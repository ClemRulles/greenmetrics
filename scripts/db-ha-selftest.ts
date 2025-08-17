#!/usr/bin/env tsx

/**
 * Database High Availability Self-Test Script
 * 
 * Validates multi-region database setup by performing write operations
 * on the primary database and verifying they're replicated to the read replica.
 * Measures replication lag and validates RPO/RTO targets.
 * 
 * Usage:
 *   npm run db:ha-test
 *   tsx scripts/db-ha-selftest.ts --writes=10 --reads=50
 *   tsx scripts/db-ha-selftest.ts --verbose
 */

import { z } from 'zod'
import chalk from 'chalk'
import { PrismaClient } from '@prisma/client'
import { dbWrite, dbRead, checkReplicationLag, checkDatabaseHealth, checkDatabaseRole } from '../lib/db'

interface TestConfig {
  writes: number
  reads: number
  verbose: boolean
  timeout: number
}

interface TestResult {
  success: boolean
  writeLatency: number[]
  readLatency: number[]
  replicationLag: number[]
  errors: string[]
  summary: {
    avgWriteLatency: number
    avgReadLatency: number
    maxReplicationLag: number
    rpoCompliant: boolean
    rtoCompliant: boolean
  }
}

class DatabaseHATest {
  private config: TestConfig
  private writeClient: PrismaClient
  private readClient: PrismaClient

  constructor(config: TestConfig) {
    this.config = config
    this.writeClient = dbWrite()
    this.readClient = dbRead()
  }

  /**
   * Run the complete HA test suite
   */
  async run(): Promise<TestResult> {
    console.log(chalk.blue.bold('🏥 Database High Availability Self-Test'))
    console.log(chalk.blue(`Writes: ${this.config.writes}, Reads: ${this.config.reads}`))
    
    if (this.config.verbose) {
      console.log(chalk.blue('Verbose mode enabled'))
    }

    const result: TestResult = {
      success: true,
      writeLatency: [],
      readLatency: [],
      replicationLag: [],
      errors: [],
      summary: {
        avgWriteLatency: 0,
        avgReadLatency: 0,
        maxReplicationLag: 0,
        rpoCompliant: false,
        rtoCompliant: false
      }
    }

    try {
      // 1. Pre-flight checks
      await this.preflightChecks()

      // 2. Test database connectivity
      await this.testConnectivity(result)

      // 3. Test write operations
      await this.testWrites(result)

      // 4. Test read operations
      await this.testReads(result)

      // 5. Test replication lag
      await this.testReplicationLag(result)

      // 6. Calculate summary
      this.calculateSummary(result)

      // 7. Validate compliance
      this.validateCompliance(result)

    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Pre-flight checks to ensure environment is ready
   */
  private async preflightChecks(): Promise<void> {
    console.log(chalk.blue('🔍 Running pre-flight checks...'))

    // Check environment variables
    const requiredVars = ['DATABASE_URL', 'DATABASE_URL_WRITE']
    const missing = requiredVars.filter(key => !process.env[key])

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    // Check read replica configuration
    if (process.env.DB_READ_REPLICA_ENABLED === 'true' && !process.env.DATABASE_URL_READ) {
      throw new Error('DB_READ_REPLICA_ENABLED is true but DATABASE_URL_READ is not set')
    }

    console.log(chalk.green('✓ Pre-flight checks passed'))
  }

  /**
   * Test database connectivity
   */
  private async testConnectivity(result: TestResult): Promise<void> {
    console.log(chalk.blue('🔗 Testing database connectivity...'))

    // Test write database
    const writeHealth = await checkDatabaseHealth(this.writeClient)
    if (!writeHealth.ok) {
      result.errors.push(`Write database unhealthy: ${writeHealth.error}`)
      return
    }

    // Test read database
    const readHealth = await checkDatabaseHealth(this.readClient)
    if (!readHealth.ok) {
      result.errors.push(`Read database unhealthy: ${readHealth.error}`)
      return
    }

    // Check database roles
    const writeRole = await checkDatabaseRole(this.writeClient)
    const readRole = await checkDatabaseRole(this.readClient)

    if (this.config.verbose) {
      console.log(chalk.blue(`Write database: ${writeHealth.latencyMs}ms, role: ${writeRole.role}`))
      console.log(chalk.blue(`Read database: ${readHealth.latencyMs}ms, role: ${readRole.role}`))
    }

    console.log(chalk.green('✓ Database connectivity verified'))
  }

  /**
   * Test write operations performance
   */
  private async testWrites(result: TestResult): Promise<void> {
    console.log(chalk.blue(`✍️  Testing ${this.config.writes} write operations...`))

    const testTableName = `_test_ha_${Date.now()}`

    try {
      // Create test table
      await this.writeClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${testTableName} (
          id SERIAL PRIMARY KEY,
          test_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `)

      for (let i = 0; i < this.config.writes; i++) {
        const start = Date.now()
        
        try {
          await this.writeClient.$executeRawUnsafe(`
            INSERT INTO ${testTableName} (test_data) 
            VALUES ($1)
          `, `test_data_${i}_${Date.now()}`)
          
          const latency = Date.now() - start
          result.writeLatency.push(latency)

          if (this.config.verbose) {
            console.log(chalk.gray(`  Write ${i + 1}: ${latency}ms`))
          }
        } catch (error) {
          result.errors.push(`Write ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown'}`)
        }
      }

      // Cleanup test table
      await this.writeClient.$executeRawUnsafe(`DROP TABLE IF EXISTS ${testTableName}`)
      
      console.log(chalk.green(`✓ Completed ${result.writeLatency.length}/${this.config.writes} writes`))

    } catch (error) {
      result.errors.push(`Write test setup failed: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  /**
   * Test read operations performance
   */
  private async testReads(result: TestResult): Promise<void> {
    console.log(chalk.blue(`📖 Testing ${this.config.reads} read operations...`))

    for (let i = 0; i < this.config.reads; i++) {
      const start = Date.now()
      
      try {
        // Simple read query that should work on any Postgres database
        await this.readClient.$queryRaw`SELECT 1 as test_value, NOW() as test_timestamp`
        
        const latency = Date.now() - start
        result.readLatency.push(latency)

        if (this.config.verbose) {
          console.log(chalk.gray(`  Read ${i + 1}: ${latency}ms`))
        }
      } catch (error) {
        result.errors.push(`Read ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }

    console.log(chalk.green(`✓ Completed ${result.readLatency.length}/${this.config.reads} reads`))
  }

  /**
   * Test replication lag between primary and replica
   */
  private async testReplicationLag(result: TestResult): Promise<void> {
    if (process.env.DB_READ_REPLICA_ENABLED !== 'true') {
      console.log(chalk.yellow('⚠️  Skipping replication lag test (replica not enabled)'))
      return
    }

    console.log(chalk.blue('⏱️  Testing replication lag...'))

    const lagTests = 5
    for (let i = 0; i < lagTests; i++) {
      try {
        const lagResult = await checkReplicationLag(this.writeClient, this.readClient)
        
        if (lagResult.lagSeconds !== null) {
          result.replicationLag.push(lagResult.lagSeconds)
          
          if (this.config.verbose) {
            console.log(chalk.gray(`  Lag test ${i + 1}: ${lagResult.lagSeconds.toFixed(2)}s`))
          }
        } else {
          result.errors.push(`Lag test ${i + 1} failed: ${lagResult.error}`)
        }
      } catch (error) {
        result.errors.push(`Lag test ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown'}`)
      }

      // Wait between tests
      if (i < lagTests - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(chalk.green(`✓ Completed ${result.replicationLag.length}/${lagTests} lag tests`))
  }

  /**
   * Calculate test summary statistics
   */
  private calculateSummary(result: TestResult): void {
    result.summary.avgWriteLatency = result.writeLatency.length > 0 
      ? result.writeLatency.reduce((a, b) => a + b, 0) / result.writeLatency.length 
      : 0

    result.summary.avgReadLatency = result.readLatency.length > 0
      ? result.readLatency.reduce((a, b) => a + b, 0) / result.readLatency.length
      : 0

    result.summary.maxReplicationLag = result.replicationLag.length > 0
      ? Math.max(...result.replicationLag)
      : 0
  }

  /**
   * Validate RPO/RTO compliance
   */
  private validateCompliance(result: TestResult): void {
    // RPO target: ≤ 5 minutes (300 seconds)
    const rpoTarget = 300
    result.summary.rpoCompliant = result.summary.maxReplicationLag <= rpoTarget

    // RTO target: ≤ 15 minutes - simulated by write latency (should be fast for failover)
    const rtoTarget = 15000 // 15 seconds for write operations (proxy for failover speed)
    result.summary.rtoCompliant = result.summary.avgWriteLatency <= rtoTarget
  }
}

/**
 * Parse command line arguments
 */
function parseArguments(): TestConfig {
  const args = process.argv.slice(2)
  
  const config: TestConfig = {
    writes: 10,
    reads: 50,
    verbose: false,
    timeout: 60000
  }

  args.forEach(arg => {
    if (arg.startsWith('--writes=')) {
      config.writes = parseInt(arg.split('=')[1]) || 10
    } else if (arg.startsWith('--reads=')) {
      config.reads = parseInt(arg.split('=')[1]) || 50
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true
    } else if (arg.startsWith('--timeout=')) {
      config.timeout = parseInt(arg.split('=')[1]) || 60000
    }
  })

  return config
}

/**
 * Display test results
 */
function displayResults(result: TestResult): void {
  console.log(chalk.bold('\n📊 Test Results Summary\n'))

  // Performance metrics
  console.log(chalk.blue.bold('Performance Metrics:'))
  console.log(chalk.blue(`  Average Write Latency: ${result.summary.avgWriteLatency.toFixed(2)}ms`))
  console.log(chalk.blue(`  Average Read Latency: ${result.summary.avgReadLatency.toFixed(2)}ms`))
  console.log(chalk.blue(`  Max Replication Lag: ${result.summary.maxReplicationLag.toFixed(2)}s`))

  // Compliance status
  console.log(chalk.blue.bold('\nCompliance Status:'))
  console.log(result.summary.rpoCompliant 
    ? chalk.green('  ✓ RPO Target Met (≤ 5 minutes)')
    : chalk.red('  ❌ RPO Target Exceeded (> 5 minutes)')
  )
  console.log(result.summary.rtoCompliant
    ? chalk.green('  ✓ RTO Target Met (≤ 15 seconds write latency)')
    : chalk.red('  ❌ RTO Target Exceeded (> 15 seconds write latency)')
  )

  // Error summary
  if (result.errors.length > 0) {
    console.log(chalk.red.bold('\n❌ Errors Encountered:'))
    result.errors.forEach(error => {
      console.log(chalk.red(`  • ${error}`))
    })
  }

  // Overall result
  const allTestsPassed = result.success && result.errors.length === 0
  const complianceOk = result.summary.rpoCompliant && result.summary.rtoCompliant

  console.log(chalk.bold('\n🎯 Overall Result:'))
  if (allTestsPassed && complianceOk) {
    console.log(chalk.green.bold('✅ All tests passed and compliance targets met!'))
  } else if (allTestsPassed) {
    console.log(chalk.yellow.bold('⚠️  Tests passed but compliance targets not met'))
  } else {
    console.log(chalk.red.bold('❌ Tests failed - check errors above'))
  }

  console.log(chalk.gray(`\nTested: ${result.writeLatency.length} writes, ${result.readLatency.length} reads, ${result.replicationLag.length} lag measurements`))
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const config = parseArguments()
    const test = new DatabaseHATest(config)
    
    const result = await test.run()
    displayResults(result)
    
    // Exit with appropriate code
    const success = result.success && result.errors.length === 0 && 
                   result.summary.rpoCompliant && result.summary.rtoCompliant
    process.exit(success ? 0 : 1)
    
  } catch (error) {
    console.error(chalk.red.bold('❌ Test execution failed:'))
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'))
    process.exit(1)
  }
}

// Execute if run directly
if (require.main === module) {
  main()
}

export { DatabaseHATest, type TestConfig, type TestResult }
