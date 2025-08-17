# Production Infrastructure Provisioning

This document outlines the infrastructure provisioning requirements for GreenMetrics production deployment.

## Core Infrastructure Components

### 1. Managed PostgreSQL Database (High Availability)

#### Primary Database (eu-west-3 - Paris)
- **Provider**: AWS RDS PostgreSQL 15+ with Multi-AZ
- **Sizing**: 
  - Preview: db.t3.micro (2 vCPU, 1GB RAM)
  - Staging: db.t3.small (2 vCPU, 2GB RAM)  
  - Production: db.t3.large (2 vCPU, 8GB RAM)
- **Storage**: 100GB GP3 with encryption at rest
- **Backups**: 30-day retention with point-in-time recovery
- **Multi-AZ**: Required for production (automatic failover)

#### Read Replica (eu-central-1 - Frankfurt)
- **Purpose**: Read scaling and disaster recovery
- **Sizing**: Same as primary for production readiness
- **Replication**: Asynchronous streaming replication
- **Target RPO**: ≤ 5 minutes
- **Target RTO**: ≤ 15 minutes

#### High Availability Features
- **Read/Write Split**: Automatic routing based on operation type
- **Connection Pooling**: Optimized for both primary and replica
- **Health Monitoring**: Real-time lag and performance monitoring
- **Automatic Failover**: Cross-region promotion capabilities

### 2. S3 Storage Buckets
- **Exports Bucket**: `greenmetrics-exports-{env}`
  - Purpose: Report exports, certificate PDFs
  - Lifecycle: 90-day transition to IA, 365-day deletion
  - Versioning: Enabled
  
- **Evidence Bucket**: `greenmetrics-evidence-{env}`
  - Purpose: Supplier proof uploads, attestation documents
  - Lifecycle: 7-year retention for compliance
  - Encryption: SSE-S3 with customer-managed keys

### 3. Redis Cache & Queue
- **Provider**: AWS ElastiCache Redis 7.0+ or equivalent
- **Sizing**:
  - Preview: cache.t3.micro (1 vCPU, 0.5GB RAM)
  - Staging: cache.t3.small (1 vCPU, 1.5GB RAM)
  - Production: cache.t3.medium (2 vCPU, 3.2GB RAM)
- **Purpose**: Rate limiting, job queues, session cache
- **Persistence**: AOF enabled for job durability

## Environment Configuration

### Preview Environment
- **Purpose**: Feature previews, PR testing
- **URL**: `https://preview-{pr-number}.greenmetrics.app`
- **Database**: Shared staging DB with isolated schemas
- **Lifecycle**: Auto-cleanup after 7 days

### Staging Environment  
- **Purpose**: Pre-production validation, client demos
- **URL**: `https://staging.greenmetrics.app`
- **Database**: Production-like data (anonymized)
- **Sync**: Daily refresh from production (sanitized)

### Production Environment
- **Purpose**: Live customer environment
- **URL**: `https://app.greenmetrics.com`
- **Database**: Primary production instance
- **Monitoring**: Full observability stack

## DNS & TLS Configuration

### Domain Setup
```
# Production
app.greenmetrics.com     -> Vercel/AWS ALB
api.greenmetrics.com     -> API gateway (if separate)

# Staging  
staging.greenmetrics.app -> Staging deployment

# Preview
*.preview.greenmetrics.app -> Preview deployments
```

### TLS Requirements
- Wildcard certificates for `*.greenmetrics.com` and `*.greenmetrics.app`
- HSTS preload list inclusion
- TLS 1.2+ only, secure cipher suites

## Security Configuration

### Network Security
- VPC with private subnets for databases
- Security groups restricting access to known IPs
- NAT Gateway for outbound connectivity

### Access Control
- IAM roles with least-privilege principles
- Service accounts for application access
- MFA required for administrative access

### Secrets Management
- AWS Secrets Manager or equivalent
- Automatic rotation for database credentials
- Environment-specific secret isolation

## Monitoring & Alerting

### Infrastructure Monitoring
- CloudWatch/equivalent for system metrics
- Database performance monitoring
- Storage utilization alerts

### Application Monitoring  
- Sentry for error tracking
- PostHog for analytics (consent-gated)
- Custom metrics for business KPIs

## Deployment Pipeline

### CI/CD Requirements
- Automated testing (unit, integration, E2E)
- Security scanning (SAST, dependency check)
- Performance budgets enforcement
- Staged deployments with rollback capability

### Environment Promotion
```
Feature Branch -> Preview -> Staging -> Production
```

## Cost Optimization

### Resource Scaling
- Auto-scaling for compute resources
- Database connection pooling
- CDN for static asset delivery

### Cost Monitoring
- Budget alerts for unexpected usage
- Resource tagging for cost allocation
- Regular rightsizing reviews

## Compliance & Backup

### Data Protection
- GDPR compliance for EU customer data
- Data residency requirements
- Backup encryption and testing

### Business Continuity
- RTO: 4 hours
- RPO: 15 minutes
- Disaster recovery procedures documented

## Provisioning Checklist

### Database Setup
- [ ] PostgreSQL instance provisioned
- [ ] Connection pooling configured
- [ ] Backup retention policy set
- [ ] Performance monitoring enabled

### Storage Setup  
- [ ] S3 buckets created with proper naming
- [ ] Lifecycle policies configured
- [ ] IAM policies for service access
- [ ] Encryption keys configured

### Cache Setup
- [ ] Redis cluster provisioned
- [ ] Connection limits configured
- [ ] Persistence settings verified
- [ ] Failover testing completed

### Security Setup
- [ ] Secrets stored in secure manager
- [ ] Network security groups configured
- [ ] SSL certificates installed
- [ ] Access logging enabled

### Monitoring Setup
- [ ] CloudWatch/monitoring agents installed
- [ ] Alert rules configured
- [ ] Log aggregation setup
- [ ] Performance dashboards created

## Environment Variables Required

See `.env.example` for complete list of required environment variables for each environment.
