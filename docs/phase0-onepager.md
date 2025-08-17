# Phase 0 One-Pager: GreenMetrics ESG Reporting Platform

## Problem & Users

**Core Problem**: EU SMEs (10-200 employees) struggle to provide credible ESG/CO₂ data to retain contracts with large enterprises, facing consultant costs >€10k and Excel complexity barriers.

**Primary Personas:**

1. **Sophie (SME COO/GM)** - ~50 staff, supplier to large OEM
   - **JTBD #1**: Provide credible ESG/CO₂ figures to retain contracts
   - **JTBD #2**: Avoid consultant costs and Excel complexity  
   - **JTBD #3**: Generate consistent reports quickly (quarterly/annually)

2. **Accountant/Office Manager** - gathers invoices, fuel receipts
   - **JTBD**: Wants checklist-driven data entry and CSV imports

3. **Buyer at Large Enterprise** (recipient)
   - **JTBD**: Wants uniform reports/data export for ingestion

## Core Use Cases

**MVP In-Scope:**
- AuthN/AuthZ with roles (OWNER/ADMIN/EDITOR/VIEWER)
- Organization setup, period selection, data entry wizard
- Activity data: electricity kWh, fuels liters, waste tonnes, business travel km
- Optional social KPIs: training hours, % women
- Emission factor resolution (EU/UK default, versioned)
- **Scopes 1-2** calculations with QA checks (outlier flags vs sector medians)
- Bilingual PDF reports (EN/FR) + structured exports (CSV/JSON)
- Basic admin: factors viewer, org members, audit log (read-only)
- DSR endpoints (export/delete) and privacy notice

**Explicitly Out-of-Scope (MVP):**
- Full Scope 3 categories
- Custom frameworks beyond CSRD/GRI basics
- Deep supplier collection portal
- Complex ERP integrations
- Automated invoice OCR
- Marketplace of consultants

## Success Metrics

| Metric | Target | Timeline |
|--------|---------|----------|
| **Activation** | ≥60% of new orgs create first completed report | Within 7 days |
| **Time-to-Value** | Median sign-up to first PDF | ≤30 minutes |
| **Retention (6mo)** | Churn rate | ≤20% |
| **NPS** | Net Promoter Score | ≥40 after 2 months |
| **North Star** | ESG reports completed | Monthly growth |

*Assumption: Targets based on B2B SaaS benchmarks for SME tools*

## Non-Functional Requirements

**Performance:**
- P95 TTFB < 1.5s
- Report generation < 10s P95
- *Assumption: Typical SME report ~50 data points*

**Availability:**
- 99.9% monthly uptime (best-effort in MVP)
- *Assumption: Formal SLAs post-MVP*

**Accessibility:**
- **WCAG 2.2 AA compliance** for interactive flows
- Keyboard-first navigation, sufficient contrast, logical focus order
- *Assumption: Core user journeys prioritized for accessibility*

**Privacy/GDPR:**
- GDPR/UK GDPR compliant with DSR workflow
- Data minimization principles
- EU hosting requirement
- Lawful bases: contract (service), legal obligation (reporting), legitimate interest (analytics with opt-in)

**Security:**
- **OWASP ASVS L1+** controls
- Encryption in transit (TLS) and at rest
- Rate limiting, input validation, audit logging
- *Assumption: Security review before production*

**Internationalization:**
- **EN/FR coverage** including dates/numbers/currency
- ICU plural rules support
- No hard-coded strings in components
- Path-based locales: `/en/*`, `/fr/*`

**Scalability:**
- *Assumption: MVP targets <1000 organizations*
- PostgreSQL with connection pooling
- Vercel serverless architecture
