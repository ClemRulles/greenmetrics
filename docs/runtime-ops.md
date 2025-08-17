# Runtime Operations Guide

This guide covers runtime operations, scaling, and incident response for the GreenMetrics platform.

## System Architecture

### Components
- **Web Application**: Next.js frontend + API routes
- **Database**: PostgreSQL with read replicas
- **Cache**: Redis for sessions and caching
- **Storage**: S3 for file uploads and exports
- **Monitoring**: Prometheus, Grafana, AlertManager

### Resource Specifications
```yaml
Web Pods:
  Requests: 200m CPU, 256Mi memory
  Limits: 800m CPU, 1Gi memory
  Replicas: 3-20 (HPA managed)

Database:
  Type: PostgreSQL 15
  Size: 2 vCPU, 8GB RAM minimum
  Storage: 100GB SSD (autoscaling)

Cache:
  Type: Redis 7
  Size: 1 vCPU, 2GB RAM
  Persistence: AOF enabled
```

## Horizontal Pod Autoscaler (HPA)

### Current Configuration
```yaml
Min Replicas: 3
Max Replicas: 20
CPU Target: 60%
Memory Target: 70%
Scale Up: +100% or +4 pods/30s (max)
Scale Down: -50% or -2 pods/60s (min)
```

### Tuning Guidelines

#### Conservative Scaling (Default)
- **Use when**: Steady traffic patterns, cost optimization priority
- **CPU Target**: 60-70%
- **Memory Target**: 70-80%
- **Scale Up Delay**: 30-60 seconds
- **Scale Down Delay**: 300 seconds (5 minutes)

#### Aggressive Scaling (High Traffic)
- **Use when**: Traffic spikes expected, performance priority
- **CPU Target**: 40-50%
- **Memory Target**: 50-60%
- **Scale Up Delay**: 15-30 seconds
- **Scale Down Delay**: 180 seconds (3 minutes)

#### Update HPA Configuration
```bash
# Conservative scaling
kubectl patch hpa greenmetrics-web-hpa -n greenmetrics --patch '
spec:
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60
'

# Aggressive scaling
kubectl patch hpa greenmetrics-web-hpa -n greenmetrics --patch '
spec:
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 40
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 15
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 180
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
'
```

## Resource Sizing Guidelines

### Pod Resource Requests/Limits

#### Development/Testing
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

#### Production (Default)
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "800m"
```

#### High Load Production
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1500m"
```

### Vertical Scaling
```bash
# Update resource limits
kubectl patch deployment greenmetrics-web -n greenmetrics --patch '
spec:
  template:
    spec:
      containers:
      - name: web
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1500m"
'

# Wait for rollout
kubectl rollout status deployment/greenmetrics-web -n greenmetrics
```

## Performance Monitoring

### Key Performance Indicators

#### Application Metrics
- **Response Time**: 
  - P50: < 100ms
  - P95: < 500ms
  - P99: < 1000ms
- **Throughput**: > 100 RPS per pod
- **Error Rate**: < 0.5%
- **Availability**: > 99.9%

#### Infrastructure Metrics
- **CPU Utilization**: 40-70% average
- **Memory Utilization**: 50-80% average
- **Disk I/O**: < 80% utilization
- **Network**: < 80% bandwidth utilization

#### Database Metrics
- **Connection Pool**: < 80% utilization
- **Query Time**: P95 < 100ms
- **Lock Wait Time**: < 10ms average
- **Replication Lag**: < 1 second

### Monitoring Queries

#### Prometheus Queries
```promql
# Average response time
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket{service="greenmetrics"}[5m])
)

# Error rate
rate(http_requests_total{service="greenmetrics",status=~"5.."}[5m]) / 
rate(http_requests_total{service="greenmetrics"}[5m])

# Pod CPU usage
rate(container_cpu_usage_seconds_total{pod=~"greenmetrics-web-.*"}[5m])

# Pod memory usage
container_memory_working_set_bytes{pod=~"greenmetrics-web-.*"} / 
container_spec_memory_limit_bytes{pod=~"greenmetrics-web-.*"}
```

### Performance Tuning

#### Node.js Optimization
```bash
# Environment variables for production
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=1024"
UV_THREADPOOL_SIZE=16
```

#### Next.js Configuration
```javascript
// next.config.js optimizations
const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lodash-es', 'date-fns'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}
```

## Incident Response Procedures

### Severity Levels

#### Critical (P0) - Service Down
- **Response Time**: 15 minutes
- **Examples**: Complete outage, data loss
- **Actions**:
  1. Page on-call engineer immediately
  2. Create incident channel
  3. Begin immediate mitigation
  4. Escalate to management after 30 minutes

#### High (P1) - Significant Impact
- **Response Time**: 1 hour
- **Examples**: High error rates, major feature down
- **Actions**:
  1. Alert on-call engineer
  2. Create incident channel
  3. Begin investigation and mitigation
  4. Provide status updates every 30 minutes

#### Medium (P2) - Moderate Impact
- **Response Time**: 4 hours
- **Examples**: Performance degradation, minor feature issues
- **Actions**:
  1. Create ticket and assign to on-call
  2. Investigate during business hours
  3. Provide daily status updates

### Common Incident Scenarios

#### High Error Rate (>5%)
```bash
# 1. Check pod status
kubectl get pods -n greenmetrics

# 2. Check recent deployments
kubectl rollout history deployment/greenmetrics-web -n greenmetrics

# 3. Check pod logs
kubectl logs -l app.kubernetes.io/name=greenmetrics -n greenmetrics --tail=100

# 4. If recent deployment, rollback
kubectl rollout undo deployment/greenmetrics-web -n greenmetrics

# 5. Scale up if load related
kubectl scale deployment greenmetrics-web --replicas=10 -n greenmetrics
```

#### High Response Time (>1s P95)
```bash
# 1. Check resource utilization
kubectl top pods -n greenmetrics

# 2. Check HPA status
kubectl describe hpa greenmetrics-web-hpa -n greenmetrics

# 3. Manual scale if needed
kubectl scale deployment greenmetrics-web --replicas=8 -n greenmetrics

# 4. Check database performance
# (Connect to database monitoring dashboard)

# 5. Check for memory leaks
kubectl exec -it <pod-name> -n greenmetrics -- node -e "console.log(process.memoryUsage())"
```

#### Pod Crash Loop
```bash
# 1. Describe failing pod
kubectl describe pod <pod-name> -n greenmetrics

# 2. Check pod logs
kubectl logs <pod-name> -n greenmetrics --previous

# 3. Check resource limits
kubectl get pod <pod-name> -n greenmetrics -o yaml | grep -A 10 resources

# 4. Increase resources if OOM
kubectl patch deployment greenmetrics-web -n greenmetrics --patch '
spec:
  template:
    spec:
      containers:
      - name: web
        resources:
          limits:
            memory: "2Gi"
'
```

#### Database Connection Issues
```bash
# 1. Check database status
kubectl get pods -n database

# 2. Check service connectivity
kubectl run debug --image=busybox --rm -it -- nslookup postgres-service.database

# 3. Check connection pool
# (Review connection pool metrics in Grafana)

# 4. Restart pods to reset connections
kubectl rollout restart deployment/greenmetrics-web -n greenmetrics
```

## Load Testing

### Regular Load Testing
```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Ubuntu

# Run basic load test
k6 run --vus 50 --duration 5m scripts/load-test.js

# Progressive load test
k6 run --stage 1m:10,5m:50,1m:100,5m:100,1m:50,1m:0 scripts/load-test.js
```

### Load Test Script Example
```javascript
// scripts/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

export default function() {
  let response = http.get('https://app.example.com/api/ops/db/health');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### Load Test Monitoring
```bash
# Monitor during load test
kubectl top pods -n greenmetrics
kubectl get hpa greenmetrics-web-hpa -n greenmetrics -w

# Check pod scaling
watch kubectl get pods -n greenmetrics
```

## Capacity Planning

### Growth Projections
- **Traffic Growth**: 20% month-over-month
- **Data Growth**: 50GB per month
- **User Growth**: 15% month-over-month

### Scaling Thresholds
- **Scale Up**: CPU > 70% for 2 minutes
- **Scale Down**: CPU < 30% for 5 minutes
- **Max Pods**: 20 (adjust based on node capacity)
- **Min Pods**: 3 (for high availability)

### Resource Planning
```bash
# Current resource usage
kubectl top nodes
kubectl top pods -n greenmetrics --sort-by=memory

# Resource requests vs limits
kubectl describe nodes | grep -A 5 "Allocated resources"

# Storage usage
df -h  # On database nodes
```

## Backup and Recovery

### Database Backups
```bash
# Manual backup
kubectl exec -it postgres-primary -n database -- pg_dump -U postgres greenmetrics > backup.sql

# Automated backups (via CronJob)
kubectl get cronjob -n database

# Restore from backup
kubectl exec -i postgres-primary -n database -- psql -U postgres greenmetrics < backup.sql
```

### Application State
```bash
# Export configurations
kubectl get configmap greenmetrics-config -n greenmetrics -o yaml > config-backup.yaml
kubectl get secret greenmetrics-secrets -n greenmetrics -o yaml > secrets-backup.yaml

# Backup persistent volumes
kubectl get pv,pvc -n greenmetrics
```

## Security Operations

### Security Monitoring
- **Pod Security Standards**: Restricted policy enforced
- **Network Policies**: Deny-all with explicit allows
- **RBAC**: Least privilege access
- **Image Scanning**: Automated vulnerability scans

### Security Incident Response
```bash
# Check for security violations
kubectl get events -n greenmetrics --field-selector=type=Warning

# Review security audit logs
kubectl logs -n kube-system -l component=audit

# Check pod security context
kubectl get pod <pod-name> -n greenmetrics -o yaml | grep -A 10 securityContext
```

## Disaster Recovery

### RTO/RPO Targets
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour

### DR Procedures
1. **Assess Impact**: Determine scope of failure
2. **Activate DR Site**: Switch to backup region/cluster
3. **Restore Data**: From latest backup within RPO
4. **Validate**: Run smoke tests and health checks
5. **Communicate**: Update status page and stakeholders

### DR Testing
```bash
# Monthly DR drill
# 1. Scale down production to 0
kubectl scale deployment greenmetrics-web --replicas=0 -n greenmetrics

# 2. Activate DR environment
kubectl config use-context dr-cluster

# 3. Deploy latest version
kubectl apply -f k8s/ -n greenmetrics

# 4. Validate functionality
curl -f https://dr-app.example.com/api/ops/db/health
```

## Maintenance Windows

### Planned Maintenance
- **Frequency**: Monthly, 2nd Saturday 02:00-06:00 UTC
- **Duration**: 4 hours maximum
- **Notification**: 72 hours advance notice

### Maintenance Checklist
- [ ] Schedule announcement sent
- [ ] Change management approval
- [ ] Backup verification
- [ ] Rollback plan prepared
- [ ] On-call engineer assigned
- [ ] Monitoring dashboard prepared

## Contact Information

### Escalation Chain
1. **On-Call Engineer**: platform-oncall@company.com
2. **Platform Lead**: platform-lead@company.com  
3. **Engineering Manager**: eng-manager@company.com
4. **CTO**: cto@company.com

### External Vendors
- **Cloud Provider**: AWS Support (Enterprise)
- **Database**: PostgreSQL Professional Support
- **Monitoring**: Grafana Cloud Support
- **CDN**: CloudFlare Support
