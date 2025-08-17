# Security & Privacy Checklist [DRAFT]

## Security Controls (OWASP ASVS L1+)
- TLS everywhere; HSTS; secure cookies; SameSite=Lax.
- Auth: NextAuth email; optional OAuth; brute-force protection (rate limit).
- RBAC: OWNER/ADMIN/EDITOR/VIEWER; server-enforced.
- Input validation (Zod); output encoding; CSP; no eval.
- SSRF/XML external fetch disabled; allowlist for webhooks (future).
- Dependency scanning; SCA in CI; renovate/dependabot.

## Content Security Policy (Nonce-Based)

**CSP Header Template:**
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}' https://cdn.vercel-insights.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.posthog.com;
  frame-ancestors 'none';
  base-uri 'self';
  object-src 'none';
```

**Next.js Nonce Implementation:**
- Generate unique nonce per request in middleware
- Pass nonce to components via context/props
- Apply to inline scripts and style tags
- **Plan**: Remove 'unsafe-inline' for styles post-MVP by extracting to CSS files

## CSRF Protection
- **NextAuth Built-in**: Automatic CSRF tokens for authentication flows
- **API Endpoints**: Double-submit cookie pattern for state-changing operations
- **Origin Validation**: Strict origin/referer checks for sensitive actions (report export, DSR requests)
- **SameSite Cookies**: Lax setting prevents cross-site request inclusion

## Rate Limiting Buckets
- **Authentication**: 5 attempts per 15 minutes per IP address
- **API Endpoints**: 100 requests per minute per authenticated user
- **Report Generation**: 3 reports per hour per organization
- **DSR Requests**: 1 request per 24 hours per user
- **Implementation**: Redis-based sliding window with Upstash

## Audit Events (Logged)
- **Authentication**: login success/failure, logout, failed attempts with IP
- **Organization**: create, update, member invite/remove, role changes
- **Reports**: create, update, metrics added, computation triggered, PDF export
- **DSR Requests**: create, processing updates, completion
- **Invitations**: create, accept, revoke with email redaction for privacy

## Invitation Security Controls (PR #14)

### Data Handling
- **Email Storage**: Invitation emails stored lowercase for case-insensitive matching
- **Token Generation**: 24-byte cryptographically secure random tokens (base64url encoded)
- **Token Security**: Never returned in API responses after creation
- **Email Redaction**: Audit logs use 'redacted' placeholder for email addresses

### Access Controls
- **Creation**: ADMIN+ role required for organization
- **Acceptance**: Must authenticate with exact matching email address
- **Revocation**: ADMIN+ role required for invitation's organization
- **Listing**: ADMIN+ role required, organization-scoped results only

### Expiry & Cleanup
- **TTL**: Configurable expiration (default 14 days via INVITE_TTL_DAYS)
- **Validation**: Automatic expiry check during acceptance
- **Cleanup**: Manual deletion after acceptance/revocation (automated cleanup can be added)

### Email Security
- **Transport**: Configurable SMTP with fallback to console logging (dev)
- **Templates**: Bilingual support (EN/FR) with no sensitive data in email body
- **Links**: Contain only token, no personal information embedded

### Audit Trail
- **INVITE_CREATE**: Records role and redacted email
- **INVITE_ACCEPT**: Records accepted role and user ID
- **INVITE_REVOKE**: Records revocation action and admin user
- **Organization Scoped**: All audit entries tied to specific organization
- **Admin Actions**: emission factor updates, organization suspension
- **Retention**: 90 days (application logs), 30 days (access logs)

## Data Retention Schedule

| Entity | Retention Period | Rationale | Deletion Method |
|--------|------------------|-----------|-----------------|
| **User** | Until account deletion | Account lifecycle | Soft delete → hard delete (30 days) |
| **Organization** | Until account deletion | Business relationship | Cascade with user deletion |
| **Report** | 7 years default (configurable) | Accounting/compliance requirements | Configurable per organization |
| **Metric** | Same as parent Report | Data dependency | Cascade with report |
| **ComputationTrace** | Same as parent Report | Audit trail | Cascade with report |
| **EmissionFactor** | Indefinite | Reference data | Manual archival only |
| **AuditLog** | 90 days | Security monitoring | Automated cleanup |
| **DSRRequest** | 3 years | Legal compliance | Automated archival |
| **ExportJob** | 30 days | Temporary processing | Automated cleanup |
| **Invitation** | 7 days after expiry | Temporary tokens | Automated cleanup |

## Data Inventory
- **Personal Data**: user email, name, role, org membership.
- **Business Data**: org name, country, industry, activity data (kWh, liters, etc.), computed CO₂e, reports.
- **Special Categories**: none.
- **Storage locations**: Postgres (EU), object storage for PDFs (EU).
- **Retention** (proposed):
  - Accounts: until deletion.
  - Reports & metrics: default **7 years** (accounting-alike) or configurable per org.
  - Logs: 90 days (app), 30 days (access).
- **Deletion**:
  - Soft-delete immediately on user request; queued hard-delete within 30 days (except legal hold).

## Lawful Basis & Transparency
- Contract performance (core processing).
- Legitimate interest for product analytics (opt-in, anonymize IP).
- Privacy Notice, DPA, SCCs for processors; Records of Processing.

## DSR Workflow
- Endpoints/UI to request: access/export (JSON/CSV), rectification (edit), deletion.
- SLA: respond ≤ 30 days.
- Verified identity via logged-in account + email challenge.

## Cookies & Consent
- Essential cookies only by default.
- PostHog only after consent; respect Do Not Track.

## Data Protection Impact Assessment (DPIA-lite)

### Processing Purposes & Lawful Bases
- [ ] **Core Service**: ESG report generation → Contract performance (Art. 6(1)(b))
- [ ] **Account Management**: User authentication, organization membership → Contract performance
- [ ] **Legal Compliance**: Audit logs, DSR processing → Legal obligation (Art. 6(1)(c))  
- [ ] **Product Analytics**: Usage statistics, performance monitoring → Legitimate interest (Art. 6(1)(f)) with opt-in

### Data Categories Processed
- [ ] **Personal Data**: Email, name, role, organization membership
- [ ] **Business Data**: Organization details, activity metrics (kWh, liters, km), computed emissions
- [ ] **Technical Data**: Session tokens, audit logs, IP addresses (rate limiting only)
- [ ] **Special Categories**: None processed

### Third-Party Processors
- [ ] **Vercel**: Application hosting, EU region (DPA signed)
- [ ] **Database Provider**: PostgreSQL hosting, EU region (Neon/Supabase - DPA required)
- [ ] **Sentry**: Error monitoring, data residency controls enabled
- [ ] **PostHog**: Product analytics, GDPR mode with IP anonymization

### Risk Assessment & Mitigations
- [ ] **Data Breach Risk**: Encryption at rest/transit, access controls, audit logging
- [ ] **Unauthorized Access**: RBAC, session management, rate limiting
- [ ] **Data Loss**: Automated backups, disaster recovery procedures
- [ ] **Vendor Lock-in**: Data export capabilities, standard formats (CSV/JSON)

### Residual Risk Level
- [ ] **Low Risk**: Minimal personal data, EU hosting, strong technical controls
- [ ] **Mitigation Complete**: All identified risks have appropriate controls

### Sign-off Required
- [ ] **Data Controller**: Business stakeholder approval
- [ ] **DPO/Privacy**: Legal compliance verification  
- [ ] **Technical Lead**: Security controls implementation confirmation
