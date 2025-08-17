# Database High Availability Runbook

## Overview

This runbook provides operational procedures for managing GreenMetrics' multi-region PostgreSQL database setup with primary-replica architecture.

**Architecture:**
- **Primary Region**: eu-west-3 (Paris) - All write operations
- **Replica Region**: eu-central-1 (Frankfurt) - Read operations and disaster recovery
- **Target RPO**: ≤ 5 minutes
- **Target RTO**: ≤ 15 minutes

## Architecture Diagram

```
┌─────────────────────────┐    ┌─────────────────────────┐
│     eu-west-3 (Paris)   │    │  eu-central-1 (Frankfurt)│
│                         │    │                         │
│  ┌─────────────────┐    │    │  ┌─────────────────┐    │
│  │   Primary DB    │    │    │  │   Read Replica  │    │
│  │   (Write/Read)  │◄───┼────┼──┤   (Read Only)   │    │
│  │                 │    │    │  │                 │    │
│  └─────────────────┘    │    │  └─────────────────┘    │
│                         │    │                         │
│  ┌─────────────────┐    │    │                         │
│  │   App Servers   │    │    │                         │
│  │   (Primary)     │    │    │                         │
│  └─────────────────┘    │    │                         │
└─────────────────────────┘    └─────────────────────────┘
```

## Database Configuration

### Connection URLs

```bash
# Primary database (all writes + consistent reads)
DATABASE_URL_WRITE=postgresql://user:pass@primary.eu-west-3.rds.amazonaws.com:5432/greenmetrics

# Read replica (read operations only)
DATABASE_URL_READ=postgresql://user:pass@replica.eu-central-1.rds.amazonaws.com:5432/greenmetrics

# Feature flag
DB_READ_REPLICA_ENABLED=true
PRIMARY_REGION=eu-west-3
READ_AFTER_WRITE_MS=1500
```

### Read/Write Split Rules

#### Always Use Primary (Write Client)
- **Authentication & Sessions**: User login, logout, session management
- **Stripe Webhooks**: Payment processing, subscription updates
- **Invitations**: Accepting/revoking invitations
- **Factor Imports**: Admin factor data imports
- **Background Jobs**: Seat snapshots, retention cleanup
- **Mutations**: Any CREATE, UPDATE, DELETE operations

#### Safe for Replica (Read Client)
- **Public Certificate Pages**: Certificate verification and display
- **Dashboard Listings**: Reports, targets, coverage data (eventual consistency OK)
- **PDF Generation**: Report data for PDF rendering (snapshot acceptable)
- **Search & Filtering**: Data browsing and exploration
- **Analytics**: Metrics and reporting data

#### Read-After-Write Protection
- **Immediate Queries**: Force primary for 1.5 seconds after writes
- **User Flows**: Profile updates → profile display
- **Data Creation**: Report creation → report listing

## Monitoring & Health Checks

### Health Check Endpoints

```bash
# Overall database health
curl -s https://app.greenmetrics.com/api/ops/db/health | jq

# Database roles (primary/replica)
curl -s https://app.greenmetrics.com/api/ops/db/role | jq
```

### Expected Health Response

```json
{
  "status": "healthy",
  "timestamp": "2025-08-16T10:30:00.000Z",
  "checks": {
    "write": {
      "ok": true,
      "latencyMs": 45,
      "database": "primary"
    },
    "read": {
      "ok": true,
      "latencyMs": 23,
      "database": "replica",
      "replicationEnabled": true
    }
  },
  "replication": {
    "lagSeconds": 2.5,
    "withinTarget": true
  },
  "configuration": {
    "readReplicaEnabled": true,
    "primaryRegion": "eu-west-3",
    "readAfterWriteMs": 1500
  }
}
```

### Automated Testing

```bash
# Run HA self-test
npm run db:ha-test

# Verbose testing with load
npm run db:ha-test:load --verbose

# Expected output
✅ All tests passed and compliance targets met!
RPO: 2.3s (target: ≤ 300s) ✓
RTO: 45ms avg write latency ✓
```

## Operational Procedures

### 1. Normal Operations

#### Daily Health Checks
```bash
# 1. Check overall health
curl -s https://app.greenmetrics.com/api/ops/db/health

# 2. Verify replication lag
npm run db:ha-test

# 3. Check connection pools
# Monitor CloudWatch metrics for connection count
```

#### Weekly Validation
```bash
# 1. Full HA test suite
npm run db:ha-test:load --verbose

# 2. Verify backup integrity
# Check RDS automated backups

# 3. Review performance metrics
# Analyze slow query logs and connection patterns
```

### 2. Failover Procedures

#### Automatic Failover (RDS Multi-AZ)
RDS handles automatic failover for Multi-AZ deployments:

1. **Detection**: RDS detects primary failure (typically 60-120 seconds)
2. **DNS Update**: RDS updates DNS to point to standby (30-60 seconds)
3. **Application Recovery**: Apps reconnect automatically
4. **Total RTO**: Typically 2-3 minutes

#### Manual Failover (Cross-Region)

**Scenario**: Complete eu-west-3 region failure

```bash
# 1. Promote read replica to primary
aws rds promote-read-replica \
  --db-instance-identifier greenmetrics-replica-eu-central-1 \
  --region eu-central-1

# 2. Update DNS/Load Balancer
# Point write traffic to eu-central-1

# 3. Update application configuration
export DATABASE_URL_WRITE="postgresql://user:pass@new-primary.eu-central-1.rds.amazonaws.com:5432/greenmetrics"

# 4. Restart application servers
kubectl rollout restart deployment greenmetrics-app

# 5. Verify functionality
npm run db:ha-test
curl -s https://app.greenmetrics.com/api/ops/db/role
```

### 3. Recovery Procedures

#### Point-in-Time Recovery

```bash
# 1. Identify recovery point
# Review application logs and determine last known good state

# 2. Create new instance from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier greenmetrics-recovery \
  --db-snapshot-identifier greenmetrics-backup-2025-08-16 \
  --target-custom-availability-zone eu-west-3a

# 3. Verify data integrity
npm run db:ha-test --target=recovery-instance

# 4. Switch traffic (if needed)
# Update DNS/configuration to point to recovery instance
```

#### Data Corruption Recovery

```bash
# 1. Stop write operations immediately
kubectl scale deployment greenmetrics-app --replicas=0

# 2. Assess corruption scope
# Connect to replica and verify data consistency

# 3. Restore from backup
# Use point-in-time recovery to time before corruption

# 4. Rebuild replica
# Create new read replica from recovered primary

# 5. Resume operations
kubectl scale deployment greenmetrics-app --replicas=3
```

### 4. Maintenance Procedures

#### Planned Maintenance Window

```bash
# 1. Pre-maintenance checks
npm run db:ha-test
curl -s https://app.greenmetrics.com/api/ops/db/health

# 2. Scale down non-essential operations
# Disable background jobs
export CRON_ENABLED=false

# 3. Enable read-only mode (if needed)
export DB_READ_REPLICA_ENABLED=false
export DATABASE_URL_READ=$DATABASE_URL_WRITE

# 4. Perform maintenance
# RDS maintenance, instance upgrades, etc.

# 5. Re-enable full operations
export DB_READ_REPLICA_ENABLED=true
export CRON_ENABLED=true

# 6. Post-maintenance validation
npm run db:ha-test:load
```

#### Schema Migrations

```bash
# 1. Always run migrations on primary
npm run db:migrate:write

# 2. Verify replication
sleep 10
npm run db:ha-test

# 3. Check for replication lag
curl -s https://app.greenmetrics.com/api/ops/db/health | jq '.replication.lagSeconds'
```

## Troubleshooting

### Common Issues

#### High Replication Lag

**Symptoms**: 
- Replication lag > 30 seconds
- Users seeing stale data
- Health check warnings

**Investigation**:
```bash
# Check replication status
npm run db:ha-test --verbose

# Monitor CloudWatch metrics
# - DatabaseConnections
# - ReplicaLag
# - CPUUtilization

# Check slow queries
# Review PostgreSQL slow query log
```

**Resolution**:
```bash
# 1. Identify bottleneck
# Heavy read queries, insufficient replica resources

# 2. Scale replica if needed
aws rds modify-db-instance \
  --db-instance-identifier greenmetrics-replica \
  --db-instance-class db.r5.xlarge \
  --apply-immediately

# 3. Optimize queries
# Add indexes, optimize heavy queries

# 4. Temporary: Force primary reads
export DB_READ_REPLICA_ENABLED=false
```

#### Connection Pool Exhaustion

**Symptoms**:
- Connection timeout errors
- High connection count metrics
- Application performance degradation

**Investigation**:
```bash
# Check connection status
curl -s https://app.greenmetrics.com/api/ops/db/health

# Review application logs
kubectl logs -f deployment/greenmetrics-app | grep "connection"
```

**Resolution**:
```bash
# 1. Increase connection limits temporarily
export DATABASE_POOL_MAX=20
export DATABASE_READ_POOL_MAX=30

# 2. Restart application
kubectl rollout restart deployment greenmetrics-app

# 3. Monitor and tune
# Adjust based on actual usage patterns

# 4. Long-term: Consider connection pooling proxy
# Implement RDS Proxy or pgbouncer
```

#### Primary Database Failure

**Symptoms**:
- All database operations failing
- Health checks returning errors
- Application unavailable

**Immediate Response**:
```bash
# 1. Check RDS console for automatic failover
# Multi-AZ should handle automatically

# 2. If no automatic failover, promote replica
aws rds promote-read-replica \
  --db-instance-identifier greenmetrics-replica-eu-central-1

# 3. Update application configuration
# Point all traffic to promoted instance

# 4. Scale up new primary if needed
aws rds modify-db-instance \
  --db-instance-identifier greenmetrics-replica-eu-central-1 \
  --db-instance-class db.r5.large
```

### Performance Optimization

#### Query Optimization

```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

#### Connection Monitoring

```bash
# Current connections
SELECT count(*) as connections, state 
FROM pg_stat_activity 
GROUP BY state;

# Long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

## Alerting Rules

### Critical Alerts (PagerDuty)

- Database primary unavailable > 2 minutes
- Replication lag > 10 minutes
- Connection pool exhaustion
- Failover initiated

### Warning Alerts (Slack)

- Replication lag > 5 minutes
- High connection count (> 80% of max)
- Slow query detected (> 30 seconds)
- Backup failure

### Monitoring Metrics

```bash
# Key metrics to monitor
- rds.database_connections
- rds.replica_lag
- rds.cpu_utilization
- rds.freeable_memory
- rds.read_throughput
- rds.write_throughput
```

## Security Considerations

### Network Security

- Primary and replica in private subnets
- Security groups restrict access to application servers
- Encryption in transit (SSL/TLS)
- Encryption at rest (KMS)

### Access Control

- Separate credentials for read and write operations
- Principle of least privilege
- Regular credential rotation
- VPC endpoints for secure communication

### Compliance

- Audit logging enabled
- Data residency (EU regions only)
- GDPR-compliant data handling
- Backup encryption and retention

## Contact Information

### Escalation Matrix

1. **On-Call Engineer**: Check PagerDuty schedule
2. **Database Team Lead**: @db-team-lead
3. **Infrastructure Team**: @infra-team
4. **CTO**: For major incidents only

### External Contacts

- **AWS Support**: Enterprise support case
- **Database Consultant**: For complex recovery scenarios

## Appendix

### Configuration Examples

#### Production Configuration
```bash
# eu-west-3 (Primary)
DATABASE_URL_WRITE=postgresql://greenmetrics_user:***@greenmetrics-primary.eu-west-3.rds.amazonaws.com:5432/greenmetrics

# eu-central-1 (Replica)
DATABASE_URL_READ=postgresql://greenmetrics_readonly:***@greenmetrics-replica.eu-central-1.rds.amazonaws.com:5432/greenmetrics

DB_READ_REPLICA_ENABLED=true
PRIMARY_REGION=eu-west-3
READ_AFTER_WRITE_MS=1500
```

#### Staging Configuration
```bash
# Single region for staging
DATABASE_URL=postgresql://greenmetrics_staging:***@greenmetrics-staging.eu-west-3.rds.amazonaws.com:5432/greenmetrics_staging
DATABASE_URL_WRITE=$DATABASE_URL
DATABASE_URL_READ=$DATABASE_URL

DB_READ_REPLICA_ENABLED=false
PRIMARY_REGION=eu-west-3
```

### Useful Commands

```bash
# Health check shortcut
alias db-health="curl -s https://app.greenmetrics.com/api/ops/db/health | jq"

# HA test shortcut
alias db-test="npm run db:ha-test"

# Connection monitoring
alias db-connections="psql -c \"SELECT count(*) as connections, state FROM pg_stat_activity GROUP BY state;\""

# Replication status
alias db-lag="curl -s https://app.greenmetrics.com/api/ops/db/health | jq '.replication.lagSeconds'"
```
