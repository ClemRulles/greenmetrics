---
name: Production Infrastructure PR
about: Template for production infrastructure and deployment PRs
title: 'PR #XX: [Title]'
labels: infrastructure, production, deployment
assignees: ''
---

## 🚀 Production Infrastructure PR

### PR Information
- **PR Number**: #XX
- **Environment**: [development/staging/production]
- **Infrastructure Component**: [database/storage/cache/monitoring/security]
- **Dependencies**: [List any PR dependencies]

### 📝 Description
<!-- Provide a clear and concise description of the infrastructure changes -->

### 🏗️ Infrastructure Changes
- [ ] Database provisioning/configuration
- [ ] Storage bucket setup
- [ ] Cache/Redis configuration
- [ ] Security/secrets management
- [ ] Monitoring/observability setup
- [ ] Network/DNS configuration
- [ ] CI/CD pipeline updates

### ✅ Testing Checklist
- [ ] Environment validation script passes (`npm run env:check`)
- [ ] Infrastructure setup script tested (`npm run infra:setup:dry-run`)
- [ ] All required environment variables documented
- [ ] Security configurations validated
- [ ] Backup and recovery procedures tested
- [ ] Performance benchmarks established
- [ ] Monitoring and alerting configured

### 🔒 Security Checklist
- [ ] Secrets properly stored in secure manager
- [ ] Access controls configured (IAM/RBAC)
- [ ] Network security groups configured
- [ ] Encryption at rest enabled
- [ ] Encryption in transit enabled
- [ ] Audit logging enabled
- [ ] Compliance requirements met (GDPR/SOC2)

### 📊 Performance & Scaling
- [ ] Resource sizing appropriate for environment
- [ ] Auto-scaling configured where applicable
- [ ] Connection pooling optimized
- [ ] Cache strategies implemented
- [ ] CDN configuration optimized
- [ ] Database performance monitoring setup

### 🔍 Validation Steps
1. [ ] Pre-deployment validation
   ```bash
   npm run env:check:prod
   npm run infra:setup:dry-run --env=production
   ```

2. [ ] Post-deployment verification
   ```bash
   # Verify database connectivity
   npm run db:test-connection
   
   # Verify storage access
   npm run storage:test-upload
   
   # Verify cache functionality
   npm run cache:test-connectivity
   
   # Run health checks
   npm run health:check
   ```

3. [ ] End-to-end testing
   ```bash
   npm run e2e:production
   npm run lighthouse:production
   ```

### 📚 Documentation Updates
- [ ] Environment configuration documented
- [ ] Infrastructure architecture updated
- [ ] Deployment procedures documented
- [ ] Troubleshooting guide updated
- [ ] Rollback procedures documented

### 🚨 Rollback Plan
<!-- Describe the rollback procedure if issues arise -->
1. [ ] Rollback trigger conditions defined
2. [ ] Database rollback procedure tested
3. [ ] Application rollback procedure tested
4. [ ] DNS/traffic rollback procedure ready
5. [ ] Monitoring for rollback triggers configured

### 🔗 Related Resources
- Infrastructure Documentation: `infra/README.md`
- Environment Configuration: `.env.example`
- Deployment Guide: `docs/deployment.md`
- Monitoring Dashboard: [Link to dashboard]

### 📋 Deployment Checklist
- [ ] Staging environment tested
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Stakeholder approval obtained

### 🎯 Acceptance Criteria
<!-- List specific criteria that must be met for this PR to be considered complete -->
- [ ] All infrastructure resources provisioned successfully
- [ ] Environment passes all validation checks
- [ ] Security requirements met
- [ ] Performance targets achieved
- [ ] Monitoring and alerting functional
- [ ] Documentation complete and accurate

### 🏷️ Environment Variables Added/Modified
<!-- List any new or modified environment variables -->
```bash
# New variables
NEW_VAR_NAME=description of purpose

# Modified variables
MODIFIED_VAR=description of changes
```

### 📸 Screenshots/Evidence
<!-- Include screenshots of dashboards, configurations, or test results -->

### 💬 Additional Notes
<!-- Any additional information, context, or special considerations -->

---

**Reviewer Checklist:**
- [ ] Infrastructure changes reviewed and approved
- [ ] Security configurations verified
- [ ] Documentation is complete and accurate
- [ ] Testing procedures validated
- [ ] Rollback plan is viable
- [ ] Performance impact assessed
- [ ] Compliance requirements verified
