#!/usr/bin/env tsx

/**
 * Environment Validation Script
 * 
 * Validates environment configuration for GreenMetrics application.
 * Ensures all required environment variables are set and properly configured
 * for the target environment (development, staging, production).
 * 
 * Usage:
 *   npm run env:check
 *   npm run env:check -- --env=production
 *   npm run env:check -- --verbose
 */

import { z } from 'zod'
import chalk from 'chalk'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

// Environment schema definitions
const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'preview', 'staging', 'production']).default('development'),
  APP_BASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url(),
})

const databaseSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  DATABASE_URL_WRITE: z.string().url().startsWith('postgresql://').optional(),
  DATABASE_URL_READ: z.string().url().startsWith('postgresql://').optional(),
  DATABASE_POOL_MIN: z.coerce.number().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().min(5).default(10),
  DB_READ_REPLICA_ENABLED: z.coerce.boolean().default(false),
  PRIMARY_REGION: z.string().optional(),
  READ_AFTER_WRITE_MS: z.coerce.number().min(0).default(1500),
})

const redisSchema = z.object({
  REDIS_URL: z.string().url().startsWith('redis://'),
  REDIS_PREFIX: z.string().default('greenmetrics:dev'),
})

const storageSchema = z.object({
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_S3_BUCKET_EXPORTS: z.string().optional(),
  STORAGE_S3_BUCKET_EVIDENCE: z.string().optional(),
})

const securitySchema = z.object({
  SIGNED_URL_SECRET: z.string().min(32, 'Signed URL secret must be at least 32 characters'),
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  JOB_SECRET: z.string().min(32, 'Job secret must be at least 32 characters'),
})

const billingSchema = z.object({
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
})

const monitoringSchema = z.object({
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENV: z.string().optional(),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().optional(),
})

// Environment-specific validation rules
const developmentRequiredVars = [
  'APP_BASE_URL',
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
  'SIGNED_URL_SECRET',
  'JOB_SECRET',
]

const stagingRequiredVars = [
  ...developmentRequiredVars,
  'REDIS_URL',
  'SENTRY_DSN',
  'SENTRY_ENV',
  'DATABASE_URL_WRITE',
]

const productionRequiredVars = [
  ...stagingRequiredVars,
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'STORAGE_S3_BUCKET_EXPORTS',
  'STORAGE_S3_BUCKET_EVIDENCE',
  'POSTHOG_KEY',
  'DATABASE_URL_READ',
  'PRIMARY_REGION',
]

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  info: string[]
}

class EnvironmentValidator {
  private verbose: boolean
  private targetEnv: string

  constructor(options: { verbose?: boolean; env?: string } = {}) {
    this.verbose = options.verbose || false
    this.targetEnv = options.env || process.env.NODE_ENV || 'development'
  }

  /**
   * Validate environment configuration
   */
  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
    }

    try {
      // Validate base configuration
      const baseValidation = this.validateBase()
      this.mergeResults(result, baseValidation)

      // Validate database configuration
      const dbValidation = this.validateDatabase()
      this.mergeResults(result, dbValidation)

      // Validate Redis if required
      if (this.isRedisRequired()) {
        const redisValidation = this.validateRedis()
        this.mergeResults(result, redisValidation)
      }

      // Validate storage configuration
      const storageValidation = this.validateStorage()
      this.mergeResults(result, storageValidation)

      // Validate security configuration
      const securityValidation = this.validateSecurity()
      this.mergeResults(result, securityValidation)

      // Environment-specific validations
      if (this.targetEnv === 'production') {
        const prodValidation = this.validateProduction()
        this.mergeResults(result, prodValidation)
      }

      // Validate required variables for environment
      const requiredValidation = this.validateRequiredVariables()
      this.mergeResults(result, requiredValidation)

      // Additional checks
      const additionalValidation = this.validateAdditional()
      this.mergeResults(result, additionalValidation)

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.valid = false
    }

    return result
  }

  private validateBase(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [], info: [] }

    try {
      baseSchema.parse(process.env)
      result.info.push('✓ Base configuration valid')
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          result.errors.push(`Base config: ${err.path.join('.')} - ${err.message}`)
        })
      }
      result.valid = false
    }

    return result
  }

  private validateDatabase(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [], info: [] }

    try {
      const config = databaseSchema.parse(process.env)
      result.info.push('✓ Database configuration valid')

      // Validate read replica configuration
      if (config.DB_READ_REPLICA_ENABLED) {
        if (!config.DATABASE_URL_READ) {
          result.errors.push('DATABASE_URL_READ is required when DB_READ_REPLICA_ENABLED=true')
          result.valid = false
        } else {
          result.info.push('✓ Read replica configuration valid')
        }

        if (!config.PRIMARY_REGION) {
          result.warnings.push('PRIMARY_REGION should be set when using read replicas')
        }
      } else {
        if (config.DATABASE_URL_READ) {
          result.warnings.push('DATABASE_URL_READ is set but DB_READ_REPLICA_ENABLED=false')
        }
      }

      // Check database connectivity
      if (this.verbose) {
        result.info.push(`Database URL: ${this.maskUrl(process.env.DATABASE_URL || '')}`)
        if (config.DATABASE_URL_WRITE) {
          result.info.push(`Write Database URL: ${this.maskUrl(config.DATABASE_URL_WRITE)}`)
        }
        if (config.DATABASE_URL_READ) {
          result.info.push(`Read Database URL: ${this.maskUrl(config.DATABASE_URL_READ)}`)
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          result.errors.push(`Database: ${err.path.join('.')} - ${err.message}`)
        })
      }
      result.valid = false
    }

    return result
  }

  private validateRedis(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [], info: [] }

    try {
      redisSchema.parse(process.env)
      result.info.push('✓ Redis configuration valid')

      if (this.verbose) {
        result.info.push(`Redis URL: ${this.maskUrl(process.env.REDIS_URL || '')}`)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          result.errors.push(`Redis: ${err.path.join('.')} - ${err.message}`)
        })
      }
      result.valid = false
    }

    return result
  }

  private validateStorage(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [], info: [] }

    try {
      const config = storageSchema.parse(process.env)
      
      if (config.STORAGE_DRIVER === 's3') {
        // Validate S3 configuration
        const s3Required = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
        const missing = s3Required.filter(key => !process.env[key])
        
        if (missing.length > 0) {
          result.errors.push(`S3 storage requires: ${missing.join(', ')}`)
          result.valid = false
        } else {
          result.info.push('✓ S3 storage configuration valid')
        }
      } else {
        result.info.push('✓ Local storage configuration valid')
        
        if (!process.env.STORAGE_LOCAL_DIR) {
          result.warnings.push('STORAGE_LOCAL_DIR not set, using default: .data/exports')
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          result.errors.push(`Storage: ${err.path.join('.')} - ${err.message}`)
        })
      }
      result.valid = false
    }

    return result
  }

  private validateSecurity(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [], info: [] }

    try {
      securitySchema.parse(process.env)
      result.info.push('✓ Security configuration valid')

      // Check for weak secrets
      const secrets = [
        { name: 'NEXTAUTH_SECRET', value: process.env.NEXTAUTH_SECRET },
        { name: 'SIGNED_URL_SECRET', value: process.env.SIGNED_URL_SECRET },
        { name: 'JOB_SECRET', value: process.env.JOB_SECRET },
      ]

      secrets.forEach(({ name, value }) => {
        if (value && this.isWeakSecret(value)) {
          result.warnings.push(`${name} appears to be weak or default - consider generating a stronger secret`)
        }
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          result.errors.push(`Security: ${err.path.join('.')} - ${err.message}`)
        })
      }
      result.valid = false
    }

    return result
  }

  private validateProduction(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [], info: [] }

    // Production-specific checks
    if (process.env.NODE_ENV !== 'production') {
      result.warnings.push('NODE_ENV is not set to "production"')
    }

    if (process.env.NEXTAUTH_URL?.includes('localhost')) {
      result.errors.push('NEXTAUTH_URL cannot use localhost in production')
      result.valid = false
    }

    if (process.env.APP_BASE_URL?.includes('localhost')) {
      result.errors.push('APP_BASE_URL cannot use localhost in production')
      result.valid = false
    }

    // Check for secure protocols
    if (process.env.FORCE_HTTPS !== 'true') {
      result.warnings.push('FORCE_HTTPS should be enabled in production')
    }

    if (process.env.SECURE_COOKIES !== 'true') {
      result.warnings.push('SECURE_COOKIES should be enabled in production')
    }

    result.info.push('✓ Production environment checks completed')
    return result
  }

  private validateRequiredVariables(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [], info: [] }

    let requiredVars: string[]
    
    switch (this.targetEnv) {
      case 'production':
        requiredVars = productionRequiredVars
        break
      case 'staging':
        requiredVars = stagingRequiredVars
        break
      default:
        requiredVars = developmentRequiredVars
    }

    const missing = requiredVars.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      result.errors.push(`Missing required variables for ${this.targetEnv}: ${missing.join(', ')}`)
      result.valid = false
    } else {
      result.info.push(`✓ All required variables present for ${this.targetEnv} environment`)
    }

    return result
  }

  private validateAdditional(): ValidationResult {
    const result: ValidationResult = { valid: true, errors: [], warnings: [], info: [] }

    // Check for deprecated variables
    const deprecated = [
      'LEGACY_AUTH_ENABLED',
      'OLD_DATABASE_URL',
      'DEPRECATED_API_KEY',
    ]

    deprecated.forEach(key => {
      if (process.env[key]) {
        result.warnings.push(`Deprecated variable found: ${key}`)
      }
    })

    // Check for environment mismatches
    if (process.env.NODE_ENV !== process.env.APP_ENV && process.env.APP_ENV !== 'preview') {
      result.warnings.push('NODE_ENV and APP_ENV mismatch (ignoring preview environment)')
    }

    return result
  }

  private isRedisRequired(): boolean {
    return this.targetEnv === 'staging' || this.targetEnv === 'production'
  }

  private isWeakSecret(secret: string): boolean {
    const weakPatterns = [
      'secret',
      'password',
      'change',
      'default',
      'test',
      '123',
      'your-',
    ]

    return weakPatterns.some(pattern => 
      secret.toLowerCase().includes(pattern)
    ) || secret.length < 32
  }

  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url)
      if (parsed.password) {
        parsed.password = '***'
      }
      if (parsed.username) {
        parsed.username = '***'
      }
      return parsed.toString()
    } catch {
      return url.replace(/\/\/[^@]+@/, '//***:***@')
    }
  }

  private mergeResults(target: ValidationResult, source: ValidationResult): void {
    target.valid = target.valid && source.valid
    target.errors.push(...source.errors)
    target.warnings.push(...source.warnings)
    target.info.push(...source.info)
  }
}

/**
 * Format and display validation results
 */
function displayResults(result: ValidationResult, verbose: boolean): void {
  console.log(chalk.bold('\n🔍 Environment Validation Results\n'))

  // Display errors
  if (result.errors.length > 0) {
    console.log(chalk.red.bold('❌ Errors:'))
    result.errors.forEach(error => {
      console.log(chalk.red(`  • ${error}`))
    })
    console.log()
  }

  // Display warnings
  if (result.warnings.length > 0) {
    console.log(chalk.yellow.bold('⚠️  Warnings:'))
    result.warnings.forEach(warning => {
      console.log(chalk.yellow(`  • ${warning}`))
    })
    console.log()
  }

  // Display info (only in verbose mode)
  if (verbose && result.info.length > 0) {
    console.log(chalk.blue.bold('ℹ️  Information:'))
    result.info.forEach(info => {
      console.log(chalk.blue(`  • ${info}`))
    })
    console.log()
  }

  // Display summary
  if (result.valid) {
    console.log(chalk.green.bold('✅ Environment validation passed!'))
  } else {
    console.log(chalk.red.bold('❌ Environment validation failed!'))
    console.log(chalk.red('Please fix the errors above before proceeding.'))
  }

  console.log(chalk.gray(`\nValidated ${result.errors.length + result.warnings.length + result.info.length} checks`))
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose') || args.includes('-v')
  const envArg = args.find(arg => arg.startsWith('--env='))
  const targetEnv = envArg ? envArg.split('=')[1] : undefined

  console.log(chalk.blue.bold('🌍 GreenMetrics Environment Validator'))
  
  if (targetEnv) {
    console.log(chalk.blue(`Target Environment: ${targetEnv}`))
  }
  
  if (verbose) {
    console.log(chalk.blue('Verbose mode enabled'))
  }

  const validator = new EnvironmentValidator({ verbose, env: targetEnv })
  const result = await validator.validate()

  displayResults(result, verbose)

  // Exit with appropriate code
  process.exit(result.valid ? 0 : 1)
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red.bold('❌ Validation script failed:'))
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'))
    process.exit(1)
  })
}

export { EnvironmentValidator, type ValidationResult }
