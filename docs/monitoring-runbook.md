# GreenMetrics Monitoring Runbook

## Overview

This runbook provides guidance for responding to monitoring alerts and troubleshooting common issues in the GreenMetrics production environment.

## Quick Response Guide

### 🚨 Critical Alerts (Immediate Response Required)

| Alert | Response Time | Action |
|-------|--------------|--------|
| Service Down | < 5 minutes | [Service Down Response](#service-down) |
| High Error Rate | < 10 minutes | [Error Rate Response](#high-error-rate) |
| Database Replication Lag | < 15 minutes | [Replication Lag Response](#database-replication-lag) |

### ⚠️ Warning Alerts (Response within 1 hour)

| Alert | Response Time | Action |
|-------|--------------|--------|
| High Latency | < 1 hour | [Latency Response](#high-latency) |
| Webhook Failures | < 1 hour | [Webhook Response](#webhook-failures) |
| Rate Limit Saturation | < 1 hour | [Rate Limit Response](#rate-limit-saturation) |

## Alert Response Procedures

### Service Down

**Symptoms:** Service is unreachable, health checks failing

**Immediate Actions:**
1. **Verify the alert** - Check multiple sources
   ```bash
   curl -f https://app.greenmetrics.com/api/ops/db/health
   curl -f https://app.greenmetrics.com/en
   ```

2. **Check infrastructure status**
   - Vercel/hosting provider dashboard
   - Database provider status (Neon/PlanetScale)
   - CDN status

3. **Review recent deployments**
   - Check last deployment time vs. incident start
   - Review deployment logs for errors
   - Consider rollback if recent deployment

4. **Escalation path**
   - Notify team in #production-alerts
   - Page on-call engineer if no response in 10 minutes
   - Update status page

**Recovery Steps:**
```bash
# If deployment issue, rollback
vercel --prod rollback

# If database issue, check connection
npm run db:ha-test

# If infrastructure issue, contact provider
```

### High Error Rate

**Symptoms:** 5xx error rate > 2% for 5+ minutes

**Investigation Steps:**
1. **Identify error patterns**
   ```bash
   # Check error logs
   kubectl logs -f deployment/greenmetrics --tail=100 | grep ERROR
   
   # Or check Grafana dashboard for error breakdown by route
   ```

2. **Common causes:**
   - Database connection issues
   - External API failures (Stripe, email provider)
   - Memory/resource exhaustion
   - Configuration errors

3. **Immediate mitigation:**
   - Enable circuit breakers for failing external services
   - Scale up resources if load-related
   - Disable non-critical features

**Recovery Steps:**
```bash
# Check database health
curl https://app.greenmetrics.com/api/ops/db/health

# Check resource usage
kubectl top pods

# Scale if needed
kubectl scale deployment/greenmetrics --replicas=5
```

### Database Replication Lag

**Symptoms:** Replication lag > 3 minutes (RPO breach)

**Immediate Actions:**
1. **Assess impact severity**
   - Check current lag: `db_replication_lag_seconds` metric
   - Determine if approaching RTO limit (15 minutes)

2. **Check database provider status**
   - Neon/PlanetScale dashboard
   - Network connectivity between regions
   - Recent database maintenance

3. **Mitigation options:**
   ```bash
   # Temporarily disable read replica if severely lagged
   export DB_READ_REPLICA_ENABLED=false
   
   # Force read from primary for critical operations
   # (automatic fallback should handle this)
   ```

4. **Monitor recovery:**
   - Track lag reduction over time
   - Verify read operations work correctly
   - Re-enable replica when lag < 1 minute

### High Latency

**Symptoms:** P95 latency > 1.5 seconds for 10+ minutes

**Investigation Steps:**
1. **Identify slow endpoints**
   - Check Grafana "Response Time Percentiles" panel
   - Look for specific routes with high latency

2. **Common causes:**
   - Database query performance
   - PDF generation timeouts
   - External API slow responses
   - Resource contention

3. **Quick wins:**
   ```bash
   # Check database performance
   npm run db:ha-test
   
   # Check for expensive queries in logs
   grep "duration.*[5-9][0-9][0-9][0-9]" logs.json
   
   # Scale resources
   kubectl scale deployment/greenmetrics --replicas=3
   ```

### Webhook Failures

**Symptoms:** Webhook failure rate > 10/minute

**Investigation Steps:**
1. **Check webhook destinations**
   - Stripe webhook status
   - Customer webhook endpoints
   - Network connectivity

2. **Review failure patterns**
   ```bash
   # Check webhook logs
   grep "webhook.*fail" logs.json | tail -20
   
   # Check specific error types
   curl -H "Authorization: Bearer $METRICS_TOKEN" \
     https://app.greenmetrics.com/api/ops/metrics | grep webhook
   ```

3. **Mitigation:**
   - Implement exponential backoff
   - Disable problematic webhook endpoints
   - Queue webhooks for retry

### Rate Limit Saturation

**Symptoms:** Rate limit hit rate > 10%

**Investigation Steps:**
1. **Identify sources**
   - Check IP addresses hitting limits
   - Review user agent patterns
   - Look for API abuse

2. **Immediate actions:**
   ```bash
   # Check rate limit metrics
   curl -H "Authorization: Bearer $METRICS_TOKEN" \
     https://app.greenmetrics.com/api/ops/metrics | grep rate_limit
   
   # Review top IPs in logs
   grep "rate.*limit" logs.json | \
     jq -r '.clientIp' | sort | uniq -c | sort -nr | head -10
   ```

3. **Mitigation:**
   - Temporarily block abusive IPs
   - Adjust rate limit thresholds
   - Implement more granular rate limiting

## Dashboard Guide

### Service Overview Dashboard

**Key Metrics:**
- **Request Rate:** Should be steady during business hours
- **Error Rate:** Should be < 1% normally, < 2% always
- **P95 Latency:** Should be < 1000ms normally, < 1500ms always
- **Database Lag:** Should be < 60s normally, < 180s always

**What to Look For:**
- Sharp spikes in error rate
- Sustained high latency
- Request rate anomalies (DDoS or traffic drops)

### Database HA Dashboard

**Key Metrics:**
- **Replication Lag:** Monitor for RPO compliance (< 5 minutes)
- **Health Check Success Rate:** Should be 100%
- **Database Operations:** Monitor read/write split effectiveness

### Business Metrics Dashboard

**Key Metrics:**
- **PDF Export Success Rate:** Should be > 95%
- **Average Render Time:** Should be < 5 seconds
- **Billing Denials:** Watch for spikes indicating entitlement issues

## SLO & Error Budget

### Service Level Objectives

| SLO | Target | Error Budget | Measurement Window |
|-----|--------|--------------|-------------------|
| Availability | 99.9% | 43.8 minutes/month | 30 days |
| Latency P95 | < 1.5s | 5% of requests | 7 days |
| Error Rate | < 1% | 1% of requests | 7 days |

### Error Budget Policy

**Burn Rate Thresholds:**
- **Critical (1% burn in 1 hour):** Page immediately, incident response
- **High (2% burn in 6 hours):** Developer investigation required
- **Medium (5% burn in 3 days):** Team review, process improvement

**Actions by Budget Status:**
- **Budget remaining > 50%:** Normal release velocity
- **Budget remaining 10-50%:** Increase testing, reduce risky changes
- **Budget remaining < 10%:** Freeze non-critical features, focus on reliability

## Common Issues & Solutions

### PDF Generation Timeouts

**Symptoms:** High PDF render times, timeouts

**Solutions:**
```bash
# Check PDF service health
curl https://app.greenmetrics.com/api/ops/health

# Scale PDF workers
kubectl scale deployment/pdf-renderer --replicas=5

# Monitor render times
grep "pdf.*render.*duration" logs.json | jq '.duration' | sort -n
```

### Database Connection Pool Exhaustion

**Symptoms:** Database connection errors, timeouts

**Solutions:**
```bash
# Check active connections
npm run db:ha-test --verbose

# Scale application instances
kubectl scale deployment/greenmetrics --replicas=3

# Increase connection pool size (if needed)
export DATABASE_CONNECTION_LIMIT=20
```

### Memory Leaks

**Symptoms:** Gradually increasing memory usage, OOM kills

**Solutions:**
```bash
# Check memory usage
kubectl top pods

# Restart affected pods
kubectl rollout restart deployment/greenmetrics

# Enable memory profiling
export NODE_OPTIONS="--max-old-space-size=2048"
```

## Escalation Procedures

### Severity Levels

**P0 - Critical (< 15 minutes response)**
- Complete service outage
- Data loss or corruption
- Security breach

**P1 - High (< 1 hour response)**
- Significant feature degradation
- Performance severely impacted
- Error rate > 5%

**P2 - Medium (< 4 hours response)**
- Minor feature issues
- Performance slightly degraded
- Error rate 1-5%

### Contact Information

**On-Call Rotation:**
- Primary: Check PagerDuty schedule
- Secondary: Check team calendar
- Escalation: Engineering Manager

**Communication Channels:**
- Immediate: #production-alerts (Slack)
- Updates: #engineering (Slack)
- External: Status page updates

### Status Page Updates

**Template:**
```
Title: [INVESTIGATING] Service Performance Issues
Message: We are investigating reports of increased response times and errors. 
We will provide updates as we learn more.
Status: Investigating
```

## Post-Incident Procedures

### Immediate (within 2 hours)
1. Ensure service is fully recovered
2. Document timeline in incident channel
3. Identify immediate action items
4. Update status page with resolution

### Short-term (within 24 hours)
1. Create incident report
2. Schedule post-mortem meeting
3. Implement immediate fixes
4. Update monitoring/alerting if needed

### Long-term (within 1 week)
1. Conduct blameless post-mortem
2. Implement prevention measures
3. Update runbooks
4. Share learnings with team

## Monitoring Tools & Access

### Dashboards
- **Grafana:** https://grafana.greenmetrics.com
- **Prometheus:** https://prometheus.greenmetrics.com
- **Application:** https://app.greenmetrics.com

### Log Access
```bash
# Application logs
kubectl logs -f deployment/greenmetrics

# Database logs
# Check provider dashboard

# Infrastructure logs
# Check hosting provider logs
```

### Useful Commands

```bash
# Check service health
curl -f https://app.greenmetrics.com/api/ops/db/health

# Get metrics
curl -H "Authorization: Bearer $METRICS_TOKEN" \
  https://app.greenmetrics.com/api/ops/metrics

# Test database HA
npm run db:ha-test

# Environment validation
npm run env:check:prod
```

---

## Emergency Contacts

**During Business Hours (9 AM - 6 PM UTC):**
- Slack: #production-alerts
- Email: engineering@greenmetrics.com

**After Hours/Weekends:**
- PagerDuty: Page on-call engineer
- Emergency Phone: +1-xxx-xxx-xxxx

**External Dependencies:**
- Hosting Provider Support: [Contact Info]
- Database Provider Support: [Contact Info]
- CDN Provider Support: [Contact Info]

---
*Last Updated: [Current Date]*  
*Next Review: [Next Month]*
