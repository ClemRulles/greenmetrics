# GreenMetrics — Product Requirements Document (PRD) [DRAFT]

## 0) Summary
GreenMetrics is a bilingual (EN/FR) web app that helps EU SMEs (10–200 employees) collect ESG inputs, compute Scopes 1–2 CO₂e with up-to-date factors, and generate a compliant, shareable PDF report aligned to CSRD/GRI basics. MVP optimizes for simplicity, speed to first report, and data minimization.

## 1) Problem & Users
- **Primary persona**: Sophie (SME COO/GM, ~50 staff, supplier to large OEM). Jobs-to-be-done:
  - Provide credible ESG/CO₂ figures to retain contracts.
  - Avoid consultant costs (>€10k) and Excel complexity.
  - Generate a consistent report quickly (quarterly/annually).
- **Secondary personas**:
  - **Accountant/Office Manager**: gathers invoices, fuel receipts; wants a checklist and imports.
  - **Buyer at Large Enterprise (recipient)**: wants uniform reports/data export to ingest.

## 2) Goals
- Reduce time-to-first-report to < **30 minutes** for a typical SME with basic data at hand.
- Provide one-click **PDF** + **structured export** (CSV/JSON) aligned to a simple CSRD/GRI subset.
- Keep cost low (plans from €19–€99/mo) with **no vendor lock-in** (exports anytime).

## 3) In-Scope (MVP)
- AuthN/AuthZ (email, roles: OWNER/ADMIN/EDITOR/VIEWER).
- Organization setup, period selection, data entry wizard (electricity kWh, fuels liters, waste tonnes, business travel km, optional social KPIs like training hours, % women).
- Emission factor resolution (EU/UK default; versioned with validity range).
- Calculations for **Scopes 1–2** with QA checks (outlier flags vs sector medians).
- Report generator: bilingual PDF (tables + clear narrative); data exports.
- Basic admin screens: factors viewer, organization members, audit log (read).
- DSR endpoints/process (export/delete) and privacy notice surfaces.

**Out-of-scope (MVP)**:
- Full Scope 3 categories, custom frameworks, deep supplier collection portal, complex integrations (ERP), marketplace of consultants (post-MVP).
- Automated invoice OCR (future) — MVP accepts CSV/manual.

## 4) User Stories (selected)
- As **Sophie**, I create an organization, choose a reporting period, and enter energy/fuel/waste data to get a PDF report (EN/FR) I can send to customers.
- As **Sophie**, I upload a CSV of electricity consumption by month; the system aggregates and computes CO₂e with correct factors.
- As an **Editor**, I preview and regenerate the report narrative (AI-assisted) and edit text before export.
- As an **Owner**, I invite a colleague with EDITOR role and manage access.
- As a **User**, I can export all my raw inputs and computed outputs in CSV/JSON.

## 5) Acceptance Criteria (examples)
- Data entry wizard blocks on missing required fields; inline validation messages localized EN/FR.
- Emission factors are versioned; the chosen factor is recorded on each computation (immutably).
- Generated PDF includes: cover, methodology, activity data table, CO₂e summary by Scope 1/2, caveats, date/time, org details.
- Report generation < **10 seconds** for typical inputs at P95.
- All UI strings sourced from i18n JSON; no literals in components.

## 6) Success Metrics
- **Activation**: ≥60% of new orgs create a first completed report within 7 days.
- **Time-to-Value**: median time from sign-up to first PDF ≤ 30 minutes.
- **Retention (6 mo)**: churn ≤ 15–25% (target ≤20%).
- **NPS**: ≥ 40 after 2 months of use.
- **North Star**: # of ESG reports completed per month.

## 7) Non-Functional Requirements
- **Performance**: P95 TTFB < 1.5s; report generation < 10s P95.
- **Availability**: 99.9% monthly (best-effort in MVP; formal SLOs later).
- **Security**: OWASP ASVS L1+ controls, per-security checklist; encryption in transit (TLS) and at rest.
- **Privacy**: GDPR/UK GDPR compliant; DSR workflow; data minimization; EU hosting.
- **Accessibility**: WCAG 2.2 AA for interactive flows; keyboard-first, sufficient contrast, focus order.
- **Internationalization**: EN/FR coverage incl. dates/numbers/currency & plural rules (ICU).
