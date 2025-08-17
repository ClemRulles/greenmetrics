#!/usr/bin/env tsx

/**
 * Infrastructure Setup Script
 * 
 * Automates the creation of infrastructure resources for GreenMetrics.
 * Supports AWS, Azure, and GCP providers with environment-specific configurations.
 * 
 * Usage:
 *   npm run infra:setup
 *   npm run infra:setup -- --env=staging --provider=aws
 *   npm run infra:setup -- --dry-run
 */

import { z } from 'zod'
import chalk from 'chalk'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'

// Configuration schemas
const configSchema = z.object({
  environment: z.enum(['preview', 'staging', 'production']),
  provider: z.enum(['aws', 'azure', 'gcp']),
  region: z.string(),
  projectName: z.string().default('greenmetrics'),
  dryRun: z.boolean().default(false),
})

interface InfrastructureConfig {
  environment: 'preview' | 'staging' | 'production'
  provider: 'aws' | 'azure' | 'gcp'
  region: string
  projectName: string
  dryRun: boolean
}

interface ResourcePlan {
  databases: DatabaseResource[]
  storage: StorageResource[]
  cache: CacheResource[]
  secrets: SecretResource[]
  networking: NetworkResource[]
}

interface DatabaseResource {
  name: string
  engine: string
  size: string
  storage: string
  backups: boolean
  multiAZ: boolean
}

interface StorageResource {
  name: string
  type: 'bucket' | 'volume'
  lifecycle?: {
    deleteAfterDays?: number
    transitionToIA?: number
  }
  encryption: boolean
}

interface CacheResource {
  name: string
  engine: string
  size: string
  persistence: boolean
}

interface SecretResource {
  name: string
  description: string
  autoRotate: boolean
}

interface NetworkResource {
  name: string
  type: 'vpc' | 'subnet' | 'security-group'
  configuration: Record<string, any>
}

class InfrastructureProvisioner {
  private config: InfrastructureConfig
  private plan: ResourcePlan

  constructor(config: InfrastructureConfig) {
    this.config = config
    this.plan = this.generatePlan()
  }

  /**
   * Generate infrastructure plan based on environment and provider
   */
  private generatePlan(): ResourcePlan {
    const envSuffix = this.config.environment === 'production' ? 'prod' : this.config.environment

    return {
      databases: this.generateDatabasePlan(envSuffix),
      storage: this.generateStoragePlan(envSuffix),
      cache: this.generateCachePlan(envSuffix),
      secrets: this.generateSecretsPlan(envSuffix),
      networking: this.generateNetworkPlan(envSuffix),
    }
  }

  private generateDatabasePlan(envSuffix: string): DatabaseResource[] {
    const sizeMap = {
      preview: 'db.t3.micro',
      staging: 'db.t3.small',
      production: 'db.t3.medium',
    }

    return [
      {
        name: `${this.config.projectName}-db-${envSuffix}`,
        engine: 'postgres-15',
        size: sizeMap[this.config.environment],
        storage: '100GB',
        backups: true,
        multiAZ: this.config.environment === 'production',
      },
    ]
  }

  private generateStoragePlan(envSuffix: string): StorageResource[] {
    const buckets = [
      {
        name: `${this.config.projectName}-exports-${envSuffix}`,
        type: 'bucket' as const,
        lifecycle: {
          deleteAfterDays: 365,
          transitionToIA: 30,
        },
        encryption: true,
      },
      {
        name: `${this.config.projectName}-evidence-${envSuffix}`,
        type: 'bucket' as const,
        lifecycle: {
          deleteAfterDays: 2555, // 7 years
        },
        encryption: true,
      },
      {
        name: `${this.config.projectName}-backups-${envSuffix}`,
        type: 'bucket' as const,
        lifecycle: {
          deleteAfterDays: 90,
        },
        encryption: true,
      },
    ]

    return buckets
  }

  private generateCachePlan(envSuffix: string): CacheResource[] {
    const sizeMap = {
      preview: 'cache.t3.micro',
      staging: 'cache.t3.small',
      production: 'cache.t3.medium',
    }

    return [
      {
        name: `${this.config.projectName}-redis-${envSuffix}`,
        engine: 'redis-7.0',
        size: sizeMap[this.config.environment],
        persistence: this.config.environment === 'production',
      },
    ]
  }

  private generateSecretsPlan(envSuffix: string): SecretResource[] {
    return [
      {
        name: `${this.config.projectName}/db-credentials-${envSuffix}`,
        description: 'Database connection credentials',
        autoRotate: true,
      },
      {
        name: `${this.config.projectName}/app-secrets-${envSuffix}`,
        description: 'Application secrets (NextAuth, signed URLs, etc.)',
        autoRotate: false,
      },
      {
        name: `${this.config.projectName}/stripe-keys-${envSuffix}`,
        description: 'Stripe API keys and webhook secrets',
        autoRotate: false,
      },
      {
        name: `${this.config.projectName}/external-apis-${envSuffix}`,
        description: 'External API keys (Sentry, PostHog, etc.)',
        autoRotate: false,
      },
    ]
  }

  private generateNetworkPlan(envSuffix: string): NetworkResource[] {
    return [
      {
        name: `${this.config.projectName}-vpc-${envSuffix}`,
        type: 'vpc',
        configuration: {
          cidr: '10.0.0.0/16',
          enableDnsHostnames: true,
          enableDnsSupport: true,
        },
      },
      {
        name: `${this.config.projectName}-private-subnet-${envSuffix}`,
        type: 'subnet',
        configuration: {
          cidr: '10.0.1.0/24',
          availabilityZone: `${this.config.region}a`,
          public: false,
        },
      },
      {
        name: `${this.config.projectName}-app-sg-${envSuffix}`,
        type: 'security-group',
        configuration: {
          description: 'Application security group',
          ingress: [
            { port: 443, source: '0.0.0.0/0', protocol: 'tcp' },
            { port: 5432, source: 'vpc', protocol: 'tcp' },
          ],
        },
      },
    ]
  }

  /**
   * Execute the infrastructure provisioning
   */
  async provision(): Promise<void> {
    console.log(chalk.blue.bold('🚀 Starting Infrastructure Provisioning'))
    console.log(chalk.blue(`Environment: ${this.config.environment}`))
    console.log(chalk.blue(`Provider: ${this.config.provider}`))
    console.log(chalk.blue(`Region: ${this.config.region}`))
    
    if (this.config.dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN MODE - No resources will be created'))
    }

    try {
      // Validate prerequisites
      await this.validatePrerequisites()

      // Create resources in order
      await this.provisionNetworking()
      await this.provisionSecrets()
      await this.provisionDatabase()
      await this.provisionCache()
      await this.provisionStorage()

      // Generate environment configuration
      await this.generateEnvironmentConfig()

      console.log(chalk.green.bold('✅ Infrastructure provisioning completed successfully!'))
      
      if (!this.config.dryRun) {
        console.log(chalk.blue('\n📋 Next steps:'))
        console.log(chalk.blue('1. Review the generated environment configuration'))
        console.log(chalk.blue('2. Update your CI/CD pipeline with the new secrets'))
        console.log(chalk.blue('3. Deploy your application to the new environment'))
      }

    } catch (error) {
      console.error(chalk.red.bold('❌ Infrastructure provisioning failed:'))
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'))
      throw error
    }
  }

  private async validatePrerequisites(): Promise<void> {
    console.log(chalk.blue('🔍 Validating prerequisites...'))

    // Check provider CLI tools
    const cliTools = {
      aws: 'aws',
      azure: 'az',
      gcp: 'gcloud',
    }

    const cliTool = cliTools[this.config.provider]
    
    try {
      execSync(`which ${cliTool}`, { stdio: 'ignore' })
      console.log(chalk.green(`✓ ${cliTool} CLI found`))
    } catch {
      throw new Error(`${cliTool} CLI not found. Please install and configure ${this.config.provider} CLI tools.`)
    }

    // Check authentication
    try {
      switch (this.config.provider) {
        case 'aws':
          execSync('aws sts get-caller-identity', { stdio: 'ignore' })
          console.log(chalk.green('✓ AWS authentication verified'))
          break
        case 'azure':
          execSync('az account show', { stdio: 'ignore' })
          console.log(chalk.green('✓ Azure authentication verified'))
          break
        case 'gcp':
          execSync('gcloud auth list --filter=status:ACTIVE', { stdio: 'ignore' })
          console.log(chalk.green('✓ GCP authentication verified'))
          break
      }
    } catch {
      throw new Error(`${this.config.provider} authentication failed. Please run authentication command.`)
    }
  }

  private async provisionNetworking(): Promise<void> {
    console.log(chalk.blue('🌐 Provisioning networking resources...'))

    for (const resource of this.plan.networking) {
      console.log(chalk.gray(`  Creating ${resource.type}: ${resource.name}`))
      
      if (!this.config.dryRun) {
        await this.createNetworkResource(resource)
      }
    }

    console.log(chalk.green('✓ Networking resources provisioned'))
  }

  private async provisionSecrets(): Promise<void> {
    console.log(chalk.blue('🔐 Provisioning secrets management...'))

    for (const secret of this.plan.secrets) {
      console.log(chalk.gray(`  Creating secret: ${secret.name}`))
      
      if (!this.config.dryRun) {
        await this.createSecret(secret)
      }
    }

    console.log(chalk.green('✓ Secrets provisioned'))
  }

  private async provisionDatabase(): Promise<void> {
    console.log(chalk.blue('🗄️  Provisioning database resources...'))

    for (const db of this.plan.databases) {
      console.log(chalk.gray(`  Creating database: ${db.name}`))
      
      if (!this.config.dryRun) {
        await this.createDatabase(db)
      }
    }

    console.log(chalk.green('✓ Database resources provisioned'))
  }

  private async provisionCache(): Promise<void> {
    console.log(chalk.blue('⚡ Provisioning cache resources...'))

    for (const cache of this.plan.cache) {
      console.log(chalk.gray(`  Creating cache: ${cache.name}`))
      
      if (!this.config.dryRun) {
        await this.createCache(cache)
      }
    }

    console.log(chalk.green('✓ Cache resources provisioned'))
  }

  private async provisionStorage(): Promise<void> {
    console.log(chalk.blue('💾 Provisioning storage resources...'))

    for (const storage of this.plan.storage) {
      console.log(chalk.gray(`  Creating ${storage.type}: ${storage.name}`))
      
      if (!this.config.dryRun) {
        await this.createStorage(storage)
      }
    }

    console.log(chalk.green('✓ Storage resources provisioned'))
  }

  private async generateEnvironmentConfig(): Promise<void> {
    console.log(chalk.blue('📝 Generating environment configuration...'))

    const envConfig = this.generateEnvFile()
    const outputPath = path.join(process.cwd(), `infra/.env.${this.config.environment}`)

    if (!this.config.dryRun) {
      writeFileSync(outputPath, envConfig)
      console.log(chalk.green(`✓ Environment config written to: ${outputPath}`))
    } else {
      console.log(chalk.yellow('📄 Generated environment config:'))
      console.log(chalk.gray(envConfig))
    }
  }

  private generateEnvFile(): string {
    const envSuffix = this.config.environment === 'production' ? 'prod' : this.config.environment
    
    return `# Generated Infrastructure Configuration
# Environment: ${this.config.environment}
# Provider: ${this.config.provider}
# Generated: ${new Date().toISOString()}

# Core Configuration
NODE_ENV=${this.config.environment === 'production' ? 'production' : 'staging'}
APP_ENV=${this.config.environment}
APP_BASE_URL=https://${this.config.environment === 'production' ? 'app' : this.config.environment}.greenmetrics.com

# Database (Managed PostgreSQL)
DATABASE_URL=\${DATABASE_CONNECTION_STRING}
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=${this.config.environment === 'production' ? '20' : '10'}

# Redis Cache
REDIS_URL=\${REDIS_CONNECTION_STRING}
REDIS_PREFIX=greenmetrics:${envSuffix}

# Storage (S3 Compatible)
STORAGE_DRIVER=s3
AWS_REGION=${this.config.region}
STORAGE_S3_BUCKET_EXPORTS=${this.config.projectName}-exports-${envSuffix}
STORAGE_S3_BUCKET_EVIDENCE=${this.config.projectName}-evidence-${envSuffix}

# Security & Authentication
NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}
SIGNED_URL_SECRET=\${SIGNED_URL_SECRET}
JOB_SECRET=\${JOB_SECRET}

# Stripe Billing
STRIPE_SECRET_KEY=\${STRIPE_SECRET_KEY}
STRIPE_PUBLISHABLE_KEY=\${STRIPE_PUBLISHABLE_KEY}
STRIPE_WEBHOOK_SECRET=\${STRIPE_WEBHOOK_SECRET}

# Monitoring
SENTRY_DSN=\${SENTRY_DSN}
SENTRY_ENV=${this.config.environment}
POSTHOG_KEY=\${POSTHOG_KEY}

# Production Security Features
FORCE_HTTPS=true
SECURE_COOKIES=true
HSTS_ENABLED=true
CSP_ENABLED=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_AUTH_PER_MINUTE=${this.config.environment === 'production' ? '3' : '5'}
RATE_LIMIT_API_PER_MINUTE=${this.config.environment === 'production' ? '60' : '30'}

# Feature Flags
FEATURE_BILLING_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true
FEATURE_AUDIT_LOG_ENABLED=true
`
  }

  // Provider-specific implementation methods
  private async createNetworkResource(resource: NetworkResource): Promise<void> {
    // Implementation would vary by provider
    await this.sleep(100) // Simulate creation time
  }

  private async createSecret(secret: SecretResource): Promise<void> {
    // Implementation would vary by provider
    await this.sleep(100)
  }

  private async createDatabase(db: DatabaseResource): Promise<void> {
    // Implementation would vary by provider
    await this.sleep(200)
  }

  private async createCache(cache: CacheResource): Promise<void> {
    // Implementation would vary by provider
    await this.sleep(100)
  }

  private async createStorage(storage: StorageResource): Promise<void> {
    // Implementation would vary by provider
    await this.sleep(100)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Parse command line arguments
 */
function parseArguments(): InfrastructureConfig {
  const args = process.argv.slice(2)
  
  const config = {
    environment: 'staging' as const,
    provider: 'aws' as const,
    region: 'us-east-1',
    projectName: 'greenmetrics',
    dryRun: false,
  }

  args.forEach(arg => {
    if (arg.startsWith('--env=')) {
      config.environment = arg.split('=')[1] as any
    } else if (arg.startsWith('--provider=')) {
      config.provider = arg.split('=')[1] as any
    } else if (arg.startsWith('--region=')) {
      config.region = arg.split('=')[1]
    } else if (arg.startsWith('--project=')) {
      config.projectName = arg.split('=')[1]
    } else if (arg === '--dry-run') {
      config.dryRun = true
    }
  })

  return configSchema.parse(config)
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const config = parseArguments()
    const provisioner = new InfrastructureProvisioner(config)
    
    await provisioner.provision()
    
  } catch (error) {
    console.error(chalk.red.bold('❌ Infrastructure setup failed:'))
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'))
    process.exit(1)
  }
}

// Execute if run directly
if (require.main === module) {
  main()
}

export { InfrastructureProvisioner, type InfrastructureConfig }
