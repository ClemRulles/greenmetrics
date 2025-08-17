# Deployment Runbook

This runbook covers deployment procedures for the GreenMetrics platform on Kubernetes.

## Quick Reference

- **Staging**: `greenmetrics-staging` namespace
- **Production**: `greenmetrics` namespace
- **Registry**: `ghcr.io/your-org/greenmetrics`
- **Monitoring**: Prometheus + Grafana

## Pre-Deployment Checklist

### 1. Prerequisites
- [ ] Kubernetes cluster access configured (`kubectl` working)
- [ ] Docker registry credentials set up
- [ ] Secrets properly configured in cluster
- [ ] Monitoring stack deployed (Prometheus, Grafana)
- [ ] Ingress controller running (NGINX)
- [ ] cert-manager configured for TLS

### 2. Environment Verification
```bash
# Check cluster connection
kubectl cluster-info

# Verify namespace exists
kubectl get namespace greenmetrics

# Check secrets
kubectl get secrets -n greenmetrics

# Verify ingress controller
kubectl get pods -n ingress-nginx
```

## Deployment Procedures

### Automatic Deployment (Staging)
Staging deployments happen automatically on push to `main`:

1. **Build & Security Scan**: Container image built with SBOM and vulnerability scan
2. **Deploy**: Rolling deployment to staging environment
3. **Health Check**: Automated smoke tests run
4. **Notification**: Slack/Teams notification sent

### Manual Deployment (Production)

#### Method 1: GitHub Actions (Recommended)
```bash
# Navigate to Actions tab in GitHub
# Select "Deploy to Kubernetes" workflow
# Click "Run workflow"
# Select "production" environment
# Click "Run workflow"
```

#### Method 2: Direct kubectl
```bash
# 1. Build and push image
docker build -t ghcr.io/your-org/greenmetrics:v1.2.3 .
docker push ghcr.io/your-org/greenmetrics:v1.2.3

# 2. Update image in deployment
kubectl set image deployment/greenmetrics-web \
  web=ghcr.io/your-org/greenmetrics:v1.2.3 \
  -n greenmetrics

# 3. Monitor rollout
kubectl rollout status deployment/greenmetrics-web -n greenmetrics
```

### Blue-Green Deployment (Advanced)
```bash
# 1. Create new deployment with different name
sed 's/greenmetrics-web/greenmetrics-web-blue/g' k8s/deployment-web.yaml | kubectl apply -f -

# 2. Wait for pods to be ready
kubectl wait --for=condition=available deployment/greenmetrics-web-blue -n greenmetrics

# 3. Update service selector
kubectl patch service greenmetrics-web -n greenmetrics -p '{"spec":{"selector":{"version":"blue"}}}'

# 4. Remove old deployment
kubectl delete deployment greenmetrics-web-green -n greenmetrics
```

## Rollback Procedures

### Quick Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/greenmetrics-web -n greenmetrics

# Rollback to specific revision
kubectl rollout undo deployment/greenmetrics-web --to-revision=2 -n greenmetrics

# Check rollout status
kubectl rollout status deployment/greenmetrics-web -n greenmetrics
```

### Emergency Rollback
```bash
# Scale down problematic deployment
kubectl scale deployment greenmetrics-web --replicas=0 -n greenmetrics

# Deploy known good image
kubectl set image deployment/greenmetrics-web \
  web=ghcr.io/your-org/greenmetrics:last-known-good \
  -n greenmetrics

# Scale back up
kubectl scale deployment greenmetrics-web --replicas=3 -n greenmetrics
```

## Canary Deployment

### 1. Deploy Canary
```bash
# Create canary deployment (10% traffic)
kubectl apply -f k8s/deployment-web-canary.yaml

# Create canary service
kubectl apply -f k8s/service-web-canary.yaml

# Update ingress for traffic splitting
kubectl apply -f k8s/ingress-canary.yaml
```

### 2. Monitor Canary
```bash
# Check pod status
kubectl get pods -l version=canary -n greenmetrics

# Monitor error rates in Grafana
# URL: https://grafana.example.com/d/greenmetrics-overview

# Check logs
kubectl logs -l version=canary -n greenmetrics --tail=100
```

### 3. Promote or Rollback Canary
```bash
# Promote: Increase canary traffic to 100%
kubectl patch ingress greenmetrics-ingress -n greenmetrics \
  --type='json' -p='[{"op": "replace", "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1canary-weight", "value": "100"}]'

# Rollback: Remove canary
kubectl delete deployment greenmetrics-web-canary -n greenmetrics
kubectl delete service greenmetrics-web-canary -n greenmetrics
```

## Post-Deployment Verification

### 1. Health Checks
```bash
# Check deployment status
kubectl get deployments -n greenmetrics

# Verify pods are running
kubectl get pods -n greenmetrics

# Check service endpoints
kubectl get endpoints -n greenmetrics

# Test health endpoint
kubectl port-forward svc/greenmetrics-web 8080:3000 -n greenmetrics &
curl -f http://localhost:8080/api/ops/db/health
```

### 2. Performance Verification
```bash
# Check HPA status
kubectl get hpa -n greenmetrics

# Monitor resource usage
kubectl top pods -n greenmetrics

# Check ingress
kubectl get ingress -n greenmetrics
```

### 3. Integration Tests
```bash
# Run smoke tests
npm run e2e:smoke

# Check external integrations
curl -I https://app.example.com/api/ops/db/health
```

## Troubleshooting

### Pod Issues
```bash
# Check pod events
kubectl describe pod <pod-name> -n greenmetrics

# Check logs
kubectl logs <pod-name> -n greenmetrics --previous

# Debug with shell
kubectl exec -it <pod-name> -n greenmetrics -- /bin/sh
```

### Service Issues
```bash
# Check service endpoints
kubectl get endpoints greenmetrics-web -n greenmetrics

# Test service connectivity
kubectl run debug --image=busybox --rm -it -- wget -qO- greenmetrics-web.greenmetrics:3000/api/ops/db/health
```

### Ingress Issues
```bash
# Check ingress status
kubectl describe ingress greenmetrics-ingress -n greenmetrics

# Check nginx logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

## Monitoring & Alerts

### Key Metrics to Watch
- **Pod restarts**: Should be minimal
- **Response time**: < 200ms p95
- **Error rate**: < 1%
- **Memory usage**: < 80% of limit
- **CPU usage**: < 70% of limit

### Alert Channels
- **Critical**: PagerDuty → On-call engineer
- **Warning**: Slack #alerts channel
- **Info**: Grafana annotations

### Grafana Dashboards
- **Service Overview**: https://grafana.example.com/d/greenmetrics-overview
- **Infrastructure**: https://grafana.example.com/d/kubernetes-cluster
- **Business Metrics**: https://grafana.example.com/d/greenmetrics-business

## Scaling Operations

### Manual Scaling
```bash
# Scale up for high load
kubectl scale deployment greenmetrics-web --replicas=10 -n greenmetrics

# Scale down during maintenance
kubectl scale deployment greenmetrics-web --replicas=1 -n greenmetrics
```

### HPA Configuration
```bash
# Check current HPA settings
kubectl describe hpa greenmetrics-web-hpa -n greenmetrics

# Update HPA target
kubectl patch hpa greenmetrics-web-hpa -n greenmetrics \
  --patch '{"spec":{"metrics":[{"type":"Resource","resource":{"name":"cpu","target":{"type":"Utilization","averageUtilization":50}}}]}}'
```

## Maintenance Windows

### 1. Pre-Maintenance
```bash
# Set maintenance mode (if available)
kubectl annotate deployment greenmetrics-web -n greenmetrics maintenance=true

# Increase replica count for redundancy
kubectl scale deployment greenmetrics-web --replicas=5 -n greenmetrics
```

### 2. During Maintenance
```bash
# Monitor pod distribution
kubectl get pods -n greenmetrics -o wide

# Cordón nodes if needed
kubectl cordon <node-name>

# Update cluster components
# (Follow cluster-specific procedures)
```

### 3. Post-Maintenance
```bash
# Remove maintenance annotation
kubectl annotate deployment greenmetrics-web -n greenmetrics maintenance-

# Verify all systems operational
kubectl get all -n greenmetrics

# Uncordon nodes
kubectl uncordon <node-name>
```

## Security Procedures

### Certificate Rotation
```bash
# Check cert expiry
kubectl describe certificate greenmetrics-tls -n greenmetrics

# Force renewal
kubectl delete certificaterequest -n greenmetrics -l cert-manager.io/certificate-name=greenmetrics-tls
```

### Secret Rotation
```bash
# Update database password
kubectl create secret generic greenmetrics-secrets-new -n greenmetrics \
  --from-literal=DATABASE_URL="postgresql://user:newpass@host:5432/db"

# Update deployment to use new secret
kubectl patch deployment greenmetrics-web -n greenmetrics \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"web","envFrom":[{"secretRef":{"name":"greenmetrics-secrets-new"}}]}]}}}}'

# Remove old secret
kubectl delete secret greenmetrics-secrets -n greenmetrics
```

## Emergency Contacts

- **Platform Team**: platform-team@company.com
- **On-Call Engineer**: +1-555-ON-CALL
- **Security Team**: security@company.com
- **Management**: engineering-managers@company.com

## Appendix

### Useful Commands
```bash
# Get all resources in namespace
kubectl get all -n greenmetrics

# Watch deployment rollout
kubectl rollout status deployment/greenmetrics-web -n greenmetrics -w

# Get resource usage
kubectl top pods -n greenmetrics --sort-by=memory

# Check node capacity
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### External Dependencies
- **Database**: PostgreSQL cluster
- **Cache**: Redis cluster
- **Storage**: S3 bucket
- **DNS**: CloudFlare
- **CDN**: CloudFront
- **Monitoring**: Prometheus/Grafana stack
