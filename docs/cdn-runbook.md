# CDN Runbook

This runbook covers CDN operations, cache management, and troubleshooting for the GreenMetrics platform using Cloudflare.

## Architecture Overview

### CDN Stack
- **Provider**: Cloudflare
- **Zone**: example.com
- **CDN Host**: app.example.com
- **Origin**: Kubernetes cluster or Vercel deployment
- **Cache Strategy**: Layered caching with different TTLs per content type

### Cache Rules Summary
```yaml
Static Assets (_next/static/*):   31,536,000s (1 year) immutable
Images (*.jpg, *.png, etc.):      2,592,000s (30 days) + SWR
Certificate Pages:                3,600s (1 hour) + SWR
HTML Pages (public):              1,800s (30 min) + SWR
Auth Pages & APIs:                No cache (bypass)
Meta Files (favicon, manifest):  86,400s (1 day) + SWR
```

## Daily Operations

### Cache Warming
```bash
# Warm cache after deployment
node scripts/warm-cache.ts --base https://app.example.com --verify

# Warm specific pages
curl -H "User-Agent: GreenMetrics-CacheWarmer/1.0" https://app.example.com/en
curl -H "User-Agent: GreenMetrics-CacheWarmer/1.0" https://app.example.com/fr
```

### Cache Status Monitoring
```bash
# Check cache status for key pages
curl -I https://app.example.com/en | grep -i "cf-cache-status\|x-cache"
curl -I https://app.example.com/_next/static/chunks/main.js | grep -i "cf-cache-status"

# Expected responses:
# HIT = Cache hit
# MISS = Cache miss
# STALE = Stale content served while revalidating
# UPDATING = Cache updating in background
# BYPASS = Cache bypassed (auth pages, APIs)
```

### Performance Monitoring
```bash
# Run performance check
npm run perf:check

# Check Core Web Vitals
npx lighthouse https://app.example.com --only-categories=performance --chrome-flags="--headless"
```

## Cache Management

### Purge Cache (Emergency)
```bash
# Purge everything (use sparingly)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Purge specific URLs
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "files": [
      "https://app.example.com/en",
      "https://app.example.com/fr",
      "https://app.example.com/_next/static/css/app.css"
    ]
  }'

# Purge by tags (if configured)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"tags":["html","static"]}'
```

### Selective Cache Bypass
```bash
# Bypass cache for testing (add query param)
curl https://app.example.com/en?nocache=1

# Bypass cache with headers
curl -H "Cache-Control: no-cache" https://app.example.com/en
```

### Cache Preloading
```bash
# Preload critical resources after deployment
./scripts/warm-cache.ts --base https://app.example.com --concurrency 10

# Preload for different regions (if needed)
# Run from different geographic locations or use CF API
```

## Deployment Procedures

### Standard Deployment
1. **Deploy Application**
   ```bash
   # Deploy to staging first
   kubectl apply -f k8s/ -n greenmetrics-staging
   
   # Verify deployment
   kubectl rollout status deployment/greenmetrics-web -n greenmetrics-staging
   ```

2. **Warm Cache**
   ```bash
   # Wait for health checks to pass
   curl -f https://staging.example.com/api/ops/health
   
   # Warm staging cache
   node scripts/warm-cache.ts --base https://staging.example.com
   ```

3. **Run Performance Checks**
   ```bash
   # Run automated performance tests
   npm run perf:staging
   
   # Verify budgets pass
   npm run lighthouse:staging
   ```

4. **Deploy to Production**
   ```bash
   # Deploy to production
   kubectl apply -f k8s/ -n greenmetrics
   
   # Verify deployment
   kubectl rollout status deployment/greenmetrics-web -n greenmetrics
   ```

5. **Warm Production Cache**
   ```bash
   # Warm production cache
   node scripts/warm-cache.ts --base https://app.example.com --verify
   ```

### Rollback Procedure
```bash
# 1. Rollback application deployment
kubectl rollout undo deployment/greenmetrics-web -n greenmetrics

# 2. Purge CDN cache to ensure old content isn't served
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# 3. Warm cache with rolled-back version
sleep 30  # Wait for purge to propagate
node scripts/warm-cache.ts --base https://app.example.com

# 4. Verify rollback
curl -I https://app.example.com/api/ops/health
```

## Troubleshooting

### High Cache Miss Rate
**Symptoms**: Cache hit rate below 60%
**Causes**: 
- Incorrect cache rules
- Vary headers causing cache fragmentation
- User agents or cookies affecting caching

**Investigation**:
```bash
# Check cache status for different content types
curl -I https://app.example.com/_next/static/js/main.js | grep cf-cache-status
curl -I https://app.example.com/en | grep cf-cache-status
curl -I https://app.example.com/api/ops/health | grep cf-cache-status

# Check for Vary headers that might fragment cache
curl -I https://app.example.com/en | grep -i vary

# Check if cookies are affecting caching
curl -I https://app.example.com/en | grep -i set-cookie
```

**Solutions**:
```bash
# Review and update cache rules in Cloudflare dashboard
# Ensure static assets use cache-friendly headers
# Remove unnecessary Vary headers
# Use cache keys to ignore problematic headers/cookies
```

### Slow Origin Response Times
**Symptoms**: High TTFB (>300ms) even with cache hits
**Causes**:
- Origin server performance issues
- CDN configuration problems
- Network connectivity issues

**Investigation**:
```bash
# Test origin directly (bypass CDN)
curl -H "Host: app.example.com" http://ORIGIN_IP/en -w "TTFB: %{time_starttransfer}s\n"

# Compare CDN vs origin response times
time curl https://app.example.com/en  # CDN
time curl -H "Host: app.example.com" http://ORIGIN_IP/en  # Origin

# Check CDN PoP performance
curl -I https://app.example.com/en | grep cf-ray
```

**Solutions**:
```bash
# Scale up origin infrastructure
kubectl scale deployment greenmetrics-web --replicas=5 -n greenmetrics

# Enable additional CDN optimizations
# - Argo Smart Routing
# - HTTP/3
# - Early Hints
```

### Stale Content Issues
**Symptoms**: Users seeing old content after deployments
**Causes**:
- Long cache TTLs
- Stale-while-revalidate serving old content
- CDN edge servers not updated

**Investigation**:
```bash
# Check cache headers
curl -I https://app.example.com/en | grep -i "cache-control\|etag\|last-modified"

# Check different CDN edge servers
curl -H "CF-Connecting-IP: 203.0.113.1" https://app.example.com/en | grep version
curl -H "CF-Connecting-IP: 198.51.100.1" https://app.example.com/en | grep version

# Check cache age
curl -I https://app.example.com/en | grep -i age
```

**Solutions**:
```bash
# Purge specific URLs
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://app.example.com/en","https://app.example.com/fr"]}'

# Reduce cache TTL for problem pages
# Update cache rules in Cloudflare dashboard
```

### Certificate/TLS Issues
**Symptoms**: SSL errors, mixed content warnings
**Causes**:
- Certificate expiration
- Incorrect SSL mode
- HTTP resources on HTTPS pages

**Investigation**:
```bash
# Check certificate
openssl s_client -connect app.example.com:443 -servername app.example.com

# Check SSL Labs rating
curl "https://api.ssllabs.com/api/v3/analyze?host=app.example.com"

# Check for mixed content
curl -s https://app.example.com/en | grep -i "http://"
```

**Solutions**:
```bash
# Verify SSL mode is "Full (strict)" in Cloudflare
# Enable "Always Use HTTPS"
# Fix any http:// URLs in HTML/CSS
# Ensure origin server has valid certificate
```

### Performance Budget Failures
**Symptoms**: CI fails performance checks
**Causes**:
- Unoptimized assets
- JavaScript/CSS bloat
- Poor cache configuration

**Investigation**:
```bash
# Run detailed Lighthouse audit
npx lighthouse https://app.example.com --output=html --output-path=./lighthouse-report.html

# Check bundle sizes
npm run analyze

# Check image optimization
curl -I https://app.example.com/images/hero.jpg -H "Accept: image/webp"
```

**Solutions**:
```bash
# Optimize JavaScript bundles
npm run build -- --analyze

# Enable additional image optimizations in Cloudflare
# - Polish (lossless/lossy)
# - WebP/AVIF conversion
# - Mirage (automatic image resizing)

# Review and optimize critical rendering path
```

## Monitoring and Alerting

### Key Metrics to Monitor
- **Cache Hit Rate**: >80% target
- **Origin Response Time**: <200ms average
- **CDN Response Time**: <100ms average  
- **Error Rate**: <0.1%
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1

### Grafana Dashboards
- **CDN Performance**: Cache hit rates, response times by region
- **Core Web Vitals**: Real user monitoring metrics
- **Origin Health**: Backend performance and errors
- **Security**: Bot traffic, attack patterns

### Alert Conditions
```yaml
# High cache miss rate
cache_hit_rate < 0.6 for 5 minutes

# Slow response times  
response_time_p95 > 500ms for 2 minutes

# High error rate
error_rate > 0.01 for 1 minute

# Core Web Vitals degradation
lcp_p75 > 2500ms for 5 minutes
```

## Security Considerations

### Bot Protection
```bash
# Check bot traffic
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/analytics/dashboard" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq '.result.threats'

# Review security events
# Check Cloudflare Security Events dashboard
```

### DDoS Protection
```bash
# Check for ongoing attacks
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/analytics/dashboard" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq '.result.bandwidth'

# Enable Under Attack Mode if needed (emergency)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/security_level" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"under_attack"}'
```

### Rate Limiting
```bash
# Check rate limit hits
curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rate_limits" \
  -H "Authorization: Bearer $CF_API_TOKEN"

# Adjust rate limits if needed
# Use Cloudflare dashboard or API
```

## Emergency Procedures

### Complete CDN Bypass
```bash
# 1. Switch to origin-only mode
# Update DNS to point directly to origin
# OR set Cloudflare to "DNS only" (grey cloud)

# 2. Update application configuration
# Set CDN_HOST to origin hostname
# Update CSP and image domains

# 3. Deploy configuration change
kubectl set env deployment/greenmetrics-web CDN_HOST="" -n greenmetrics

# 4. Verify bypass
curl -I https://app.example.com/en | grep -v cf-
```

### Emergency Contact Information
- **Cloudflare Support**: Enterprise support (24/7)
- **Platform Team**: platform-team@company.com
- **On-Call Engineer**: +1-xxx-xxx-xxxx
- **Engineering Manager**: eng-manager@company.com

### Incident Response
1. **Assess Impact**: Check monitoring dashboards
2. **Immediate Mitigation**: Purge cache, enable bypass if needed
3. **Communication**: Update status page, notify stakeholders
4. **Investigation**: Check logs, metrics, recent changes
5. **Resolution**: Apply fix, verify resolution
6. **Post-Incident**: Write post-mortem, update runbooks

## Configuration Management

### Environment Variables
```bash
# Required for CDN configuration
CDN_PROVIDER=cloudflare
CDN_ZONE=example.com  
CDN_HOST=app.example.com
PUBLIC_BASE_URL=https://app.example.com

# Cloudflare API credentials (for automation)
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ZONE_ID=your-zone-id
```

### Terraform Configuration
```hcl
# If using Terraform for CDN management
resource "cloudflare_zone" "main" {
  zone = "example.com"
}

resource "cloudflare_zone_settings_override" "main" {
  zone_id = cloudflare_zone.main.id
  
  settings {
    ssl = "strict"
    always_use_https = "on"
    min_tls_version = "1.3"
    brotli = "on"
    minify {
      css = "on"
      js = "on" 
      html = "on"
    }
  }
}
```

### Version Control
- **CDN Configuration**: `infra/cdn/cloudflare.yaml`
- **Cache Rules**: Version controlled in Terraform or documented
- **Performance Budgets**: `.lighthouserc.json`
- **Scripts**: `scripts/warm-cache.ts`, `scripts/perf-check.ts`
