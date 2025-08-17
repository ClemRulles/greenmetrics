# Architecture Overview [DRAFT]

## 1) Stack (proposed)
- **Frontend/Full-stack**: Next.js (App Router) + TypeScript + Tailwind CSS (+ optional shadcn/ui).
- **i18n**: next-i18next (ICU formatting, locale subpaths: `/en`, `/fr`).
- **Forms/Validation**: React Hook Form + Zod.
- **API**: REST with OpenAPI 3.0 contract (JSON over HTTPS).
- **Auth**: NextAuth (email magic link; optional Google/Microsoft later); RBAC (OWNER/ADMIN/EDITOR/VIEWER).
- **DB**: PostgreSQL + Prisma ORM (migrations).
- **Storage**: Object storage for PDFs (Vercel Blob or S3-compatible).
- **Observability**: Sentry (errors), PostHog (product analytics), structured logs.
- **CI/CD**: GitHub Actions; preview deploys on Vercel; Playwright e2e.
- **Cache**: Redis (Upstash) optional for rate limiting and factor caching.

> See ADR-0001 for API style trade-offs (REST vs tRPC).

## 2) Components
- **Web App (Next.js)**: UI + server routes (/api) for REST endpoints.
- **Service layer**: input validation (Zod), calculations, factor resolution.
- **Data**: PostgreSQL (users, orgs, reports, metrics, factors, audit, dsr, exports).
- **PDF renderer**: server-side (React PDF or Headless Chrome/Playwright).
- **i18n**: translations in `/public/locales/en/*.json` and `/public/locales/fr/*.json`.

### ASCII Component Diagram

```
[Browser] --HTTPS--> [Next.js App Router]
  |                    |-- /api/auth (NextAuth)
  |                    |-- /api/reports, /api/metrics, /api/exports
  |                    |-- Services (validation, calc, i18n)
  |                    |-- Prisma Client --> [PostgreSQL]
  |                    |-- PDF Renderer --> [Object Storage]
  |                    |-- Sentry/PostHog --> [SaaS]
```

## 3) Key Sequences

### A) Generate Report (happy path)

```
User -> UI Wizard -> POST /api/reports (create draft)
User -> POST /api/reports/{id}/metrics (activity data)
API -> Resolve emission factors (by period/region/version)
API -> Compute CO2e (Scopes 1–2) + persist
API -> Render PDF (EN/FR) + store object
API -> Update report status=COMPLETED with export link
UI -> Show success + download/share
```

### B) DSR Export/Delete

```
User -> UI -> Request data export
API -> Enqueue job -> Compile JSON/CSV bundle -> Email secure link
User -> Request deletion -> Soft-delete immediately; hard-delete by retention policy
```

## 4) Data Model (ERD) — MVP

```
User (id, email, name, locale, createdAt)
Organization (id, name, country, industryNACE, createdAt)
Membership (userId, orgId, role) // OWNER|ADMIN|EDITOR|VIEWER

Report (id, orgId, periodStart, periodEnd, status, createdBy, createdAt, pdfUrl)
Metric (id, reportId, kind, unit, value, sourceNote) // kind: ELECTRICITY_KWH|FUEL_L|WASTE_TONNES|TRAVEL_KM|TRAINING_HOURS|WOMEN_PCT
EmissionFactor (id, kind, unit, factorKgCO2ePerUnit, geography, source, validFrom, validTo, version)
ComputationTrace (id, reportId, payloadJSON, factorsJSON, createdAt)

ExportJob (id, reportId, type, status, resultUrl, createdAt)
AuditLog (id, orgId, actorUserId, action, entity, entityId, at, metadataJSON)
DSRRequest (id, userId, orgId?, type=EXPORT|DELETE, status, createdAt)

Invitation (id, orgId, email, role, token, expiresAt)
Subscription (id, orgId, plan, provider=Stripe, status, currentPeriodEnd)
```

## 5) Migrations Plan
- Use Prisma Migrate with semantic migration titles.
- Seed script loads baseline emission factors and a demo org/report.

## 6) API Design
- REST with OpenAPI contract (`/docs/openapi.yaml`).
- Namespaced under `/api/v1/*`.
- Idempotency keys for create/report generation endpoints.
- Input validation with Zod; typed clients via OpenAPI generator.

## 7) i18n Strategy (summary)
- Path-based locales `/en/*` and `/fr/*`; cookie `lng` and Accept-Language fallback.
- All UI copy in JSON namespace files; ICU for pluralization/number/date.
- Server messages (validation errors) localized via i18next on server.

## 8) Security
- NextAuth + database sessions; short-lived session tokens; anti-CSRF for POST.
- RBAC middleware on server routes.
- Rate limiting per-IP/per-user (Redis).
- Input validation with Zod; output filtering; secure headers (Helmet).
- File exports with signed URLs; PDFs private by default.
- Audit logging for sensitive actions.

## 9) Privacy & Compliance
- GDPR lawful bases: contract (service), legal obligation (reporting), legitimate interest (product analytics — opt-in in the EU).
- Data minimization; EU hosting; DSR endpoints; retention schedule documented.
- Cookie banner only if using non-essential trackers (PostHog consent mode).

## 10) Observability
- Sentry DSN, source maps; PostHog autocapture; p95 timings reported.
- Structured logs (JSON) with request IDs; correlation in Sentry.

## 11) Feature Flags & Config
- `NEXT_PUBLIC_` flags for client-safe features; server-side env for sensitive.
- Simple DB-backed flags for selective rollouts.

## 12) Data & Indices Strategy

### Database Indices Plan
```sql
-- Report queries (org dashboard, status filtering)
CREATE INDEX idx_reports_org_created ON Report(orgId, createdAt DESC);
CREATE INDEX idx_reports_status ON Report(status);

-- Metric queries (report detail, kind filtering)  
CREATE INDEX idx_metrics_report_kind ON Metric(reportId, kind);

-- Emission factor resolution (core calculation path)
CREATE INDEX idx_factors_lookup ON EmissionFactor(kind, geography, validFrom);
CREATE INDEX idx_factors_validity ON EmissionFactor(validTo, validFrom);

-- Audit queries (org timeline, security monitoring)
CREATE INDEX idx_audit_org_time ON AuditLog(orgId, at DESC);
CREATE INDEX idx_audit_actor ON AuditLog(actorUserId, at DESC);

-- DSR processing (user privacy requests)
CREATE INDEX idx_dsr_user_created ON DSRRequest(userId, createdAt DESC);
CREATE INDEX idx_dsr_status ON DSRRequest(status, createdAt);
```

### Migration Sequence
1. **`001_init_core_schema`** - Core tables: User, Organization, Membership, Report, Metric
2. **`002_add_emission_factors`** - EmissionFactor table with baseline EU/member state data
3. **`003_add_audit_dsr_system`** - AuditLog, DSRRequest, ComputationTrace, ExportJob + indices

### Emission Factors Seed Strategy
```typescript
// Baseline emission factors for MVP (2024 data)
const seedEmissionFactors = [
  // EU Average Electricity
  {
    kind: 'ELECTRICITY_KWH',
    unit: 'kWh',
    factorKgCO2ePerUnit: 0.348,
    geography: 'EU',
    source: 'EEA European Environment Agency 2024',
    validFrom: '2024-01-01',
    validTo: '2024-12-31',
    version: 'v2024.1'
  },
  // France Electricity (low carbon due to nuclear)
  {
    kind: 'ELECTRICITY_KWH', 
    unit: 'kWh',
    factorKgCO2ePerUnit: 0.057,
    geography: 'FR',
    source: 'ADEME Base Carbone 2024',
    validFrom: '2024-01-01',
    validTo: '2024-12-31',
    version: 'v2024.1'
  },
  // Belgium Electricity
  {
    kind: 'ELECTRICITY_KWH',
    unit: 'kWh', 
    factorKgCO2ePerUnit: 0.167,
    geography: 'BE',
    source: 'Federal Public Service Health Belgium 2024',
    validFrom: '2024-01-01',
    validTo: '2024-12-31', 
    version: 'v2024.1'
  },
  // Diesel Fuel (EU average)
  {
    kind: 'FUEL_L',
    unit: 'L',
    factorKgCO2ePerUnit: 2.51,
    geography: 'EU',
    source: 'DEFRA 2024 Conversion Factors',
    validFrom: '2024-01-01',
    validTo: '2024-12-31',
    version: 'v2024.1'  
  },
  // Business Travel (car, average EU)
  {
    kind: 'TRAVEL_KM',
    unit: 'km',
    factorKgCO2ePerUnit: 0.171,
    geography: 'EU', 
    source: 'DEFRA 2024 - Average Car',
    validFrom: '2024-01-01',
    validTo: '2024-12-31',
    version: 'v2024.1'
  }
];
```
