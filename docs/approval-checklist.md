# GreenMetrics MVP Approval Checklist

## Technical Stack Decisions

### ✅ Core Architecture
- [ ] **Frontend Framework**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- [ ] **Database**: PostgreSQL with Prisma ORM
- [ ] **Authentication**: NextAuth.js with email magic links (no SSO in MVP)
- [ ] **Deployment**: Vercel with serverless functions
- [ ] **Caching**: Redis (Upstash) for rate limiting and session storage

### ✅ API & Integration
- [ ] **API Style**: REST with OpenAPI 3.0 specification (not tRPC)
- [ ] **Validation**: Zod schemas for input validation
- [ ] **PDF Generation**: React-PDF with synchronous generation (ADR-0002)
- [ ] **File Storage**: Vercel Blob for PDF exports with signed URLs

## Product Scope & Boundaries

### ✅ MVP Scope (In)
- [ ] **Emissions Coverage**: Scopes 1-2 only (electricity, fuel, waste, travel)
- [ ] **User Roles**: OWNER/ADMIN/EDITOR/VIEWER with RBAC
- [ ] **Data Entry**: Manual input and CSV upload
- [ ] **Reporting**: Bilingual PDF generation (EN/FR) + data exports
- [ ] **Compliance**: Basic CSRD/GRI alignment, EU emission factors

### ✅ MVP Boundaries (Out)
- [ ] **Scope 3**: Full Scope 3 categories (post-MVP)
- [ ] **Advanced Features**: OCR invoice processing, deep ERP integration
- [ ] **Marketplace**: Consultant directory and supplier portals
- [ ] **SSO**: Microsoft/Google authentication (post-MVP)

## Performance & Quality Targets

### ✅ Performance Requirements
- [ ] **Time-to-Value**: ≤30 minutes from sign-up to first PDF report
- [ ] **Page Load**: P95 TTFB < 1.5 seconds
- [ ] **Report Generation**: P95 < 10 seconds (8s threshold for background processing)
- [ ] **Failure Rate**: <1% for PDF generation
- [ ] **Availability**: 99.9% monthly uptime (best-effort)

### ✅ Accessibility & i18n
- [ ] **Accessibility**: WCAG 2.2 AA compliance for core user journeys
- [ ] **Internationalization**: EN/FR with path-based routing (`/en/*`, `/fr/*`)
- [ ] **ICU Formatting**: Proper pluralization, dates, numbers, currency
- [ ] **No Hard-coded Strings**: All UI text from i18n JSON files
- [ ] **i18n Namespaces**: Complete samples prepared in `/docs/locales-samples/` (EN=FR parity) — Pending sign-off to move into app in Phase 2

## Compliance & Security

### ✅ GDPR & Privacy
- [ ] **Data Hosting**: EU-based infrastructure (Vercel EU region)
- [ ] **Lawful Bases**: Contract, legal obligation, legitimate interest (opt-in analytics)
- [ ] **DSR Workflow**: Export/delete endpoints with ≤30 day SLA
- [ ] **Data Minimization**: Purpose-limited data collection
- [ ] **Retention**: 7 years default for reports, 90d app logs, 30d access logs

### ✅ Security Controls
- [ ] **OWASP ASVS L1+**: Input validation, output encoding, secure headers
- [ ] **CSP**: Nonce-based Content Security Policy (no unsafe-inline scripts)
- [ ] **Rate Limiting**: 5 auth attempts/15min, 100 API calls/min, 3 reports/hour
- [ ] **CSRF Protection**: NextAuth tokens + double-submit cookies
- [ ] **Audit Logging**: All sensitive actions with 90-day retention

## Data Architecture

### ✅ Database Design
- [ ] **Schema**: Prisma models for User, Organization, Report, Metric, EmissionFactor
- [ ] **RBAC**: Membership table with role-based access control
- [ ] **Audit Trail**: ComputationTrace for emission calculations, AuditLog for actions
- [ ] **Indices**: Optimized for common queries (org reports, factor lookup, audit timeline)

### ✅ Migration Strategy
- [ ] **Migration 001**: Core schema (User, Organization, Report, Metric)
- [ ] **Migration 002**: Emission factors with EU/FR/BE baseline data (2024)
- [ ] **Migration 003**: Audit system (AuditLog, DSRRequest, ExportJob)

## Testing & Quality Assurance

### ✅ Testing Strategy
- [ ] **Unit Tests**: Vitest for calculations, validation, RBAC logic
- [ ] **Integration**: API handlers with transactional test database
- [ ] **E2E Tests**: Playwright for critical user journeys (EN/FR)
- [ ] **Coverage**: ≥80% for calculation and security-critical flows
- [ ] **i18n Testing**: Key parity checks between EN/FR translations

### ✅ CI/CD Pipeline
- [ ] **GitHub Actions**: Lint, test, build, deploy pipeline
- [ ] **Preview Deployments**: Automatic Vercel preview for all PRs
- [ ] **Production Deploy**: Main branch auto-deploy with migration safety checks
- [ ] **Rollback**: Instant Vercel rollback capability

## Business Requirements

### ✅ Success Metrics
- [ ] **Activation**: ≥60% of new organizations complete first report within 7 days
- [ ] **Time-to-Value**: Median sign-up to PDF ≤30 minutes
- [ ] **Retention**: ≤20% churn rate at 6 months
- [ ] **NPS**: ≥40 after 2 months of usage

### ✅ User Experience
- [ ] **Primary Persona**: Sophie (SME COO/GM) with 30-minute first report goal
- [ ] **Data Entry**: Wizard-guided input with validation and progress saving
- [ ] **Report Quality**: Professional PDF with cover, methodology, data tables
- [ ] **Export Options**: PDF download + structured data (CSV/JSON)

## Risk Mitigation

### ✅ Technical Risks
- [ ] **PDF Timeouts**: Monitoring + feature flag for background processing (ADR-0002)
- [ ] **Factor Currency**: Manual updates with planned API integration
- [ ] **Serverless Limits**: Function timeout monitoring with fallback architecture

### ✅ Compliance Risks  
- [ ] **GDPR Violations**: Regular privacy impact assessments
- [ ] **Data Breaches**: Encryption at rest/transit + incident response plan
- [ ] **Accessibility**: WCAG audit before production launch

---

## Final Sign-off Required

**Product Owner**: [ ] Approve MVP scope and success metrics  
**Technical Lead**: [ ] Approve architecture and technology stack  
**Security Officer**: [ ] Approve security controls and GDPR compliance  
**Legal/Privacy**: [ ] Approve data handling and retention policies  
**UX/Accessibility**: [ ] Approve WCAG 2.2 AA compliance plan

**Release Authorization**: [ ] All acceptance gates passed - ready for development

## Documentation & CI Validation

- [ ] **Docs CI passes** (OpenAPI lint + i18n parity on samples) — **Pending sign-off**
  - Workflow: `.github/workflows/docs-ci.yml` (direct commands, no npm scripts)
  - Status: _Awaiting reviewer approval with green checks_

- [ ] Report specification (VSME Basic default, EN/FR) — Pending sign-off
- [ ] PDF style guide (A4, accessibility, export props) — Pending sign-off
- [ ] Factors & traceability (versioned, audit trail) — Pending sign-off
- [ ] VSME↔ESRS mapping (ESRS 2 + E1 minimal) — Pending sign-off
- [ ] OpenAPI export metadata (framework, versions, language) — Pending sign-off

---

*This checklist must be completed with all items checked before proceeding to feature development. Each decision point has been documented in the corresponding technical specifications.*
