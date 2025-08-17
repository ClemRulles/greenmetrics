# Framework Mapping Appendix

## Overview

This document maps GreenMetrics report sections and data fields to compliance frameworks: **VSME Basic** (primary), **VSME Comprehensive** (optional), and **ESRS 2/E1** (mapping hooks for CSRD transition).

## VSME Basic Mapping

### Core Requirements Coverage

| VSME Basic Requirement | GreenMetrics Section | Implementation Status |
|------------------------|---------------------|----------------------|
| Organization identification | Company Profile | ✅ MVP |
| Reporting period definition | Cover Page, Metadata | ✅ MVP |
| Operational boundaries | Reporting Boundary | ✅ MVP |
| GHG emissions inventory (Scopes 1-2) | CO₂e Results | ✅ MVP |
| Emission factors documentation | Methodology & Factors | ✅ MVP |
| Activity data transparency | Activity Data Tables | ✅ MVP |
| Calculation methodology | Methodology section | ✅ MVP |
| Data quality assessment | Traceability appendix | ✅ MVP |
| Management commitment | Management Statement | ✅ MVP |
| Annual reporting cadence | YoY Comparison | ✅ MVP |

### VSME Basic Data Fields

| Field Category | VSME Basic Field | GreenMetrics Field | Required |
|----------------|------------------|-------------------|----------|
| **Organization** | Legal name | `organization.name` | ✅ |
| | Business address | `organization.address` | ✅ |
| | Industry sector (NACE) | `organization.industry` | ✅ |
| | Number of employees | `organization.employees` | ✅ |
| **Reporting** | Reporting period start | `reportingPeriod.startDate` | ✅ |
| | Reporting period end | `reportingPeriod.endDate` | ✅ |
| | Base year | `baseYear` | ✅ |
| | Operational control approach | `boundaryApproach` | ✅ |
| **Emissions** | Scope 1 total (tCO₂e) | `results.scope1Total` | ✅ |
| | Scope 2 total (tCO₂e) | `results.scope2Total` | ✅ |
| | Total GHG emissions | `results.totalEmissions` | ✅ |
| | Emission factors used | `factors[]` | ✅ |

## VSME Comprehensive Mapping (Optional)

### Extended Requirements

| VSME Comprehensive Requirement | GreenMetrics Implementation | Status |
|--------------------------------|----------------------------|--------|
| Scope 3 emissions (15 categories) | *Out of MVP scope* | 🔄 Future |
| Uncertainty analysis | Quality indicators in traceability | 🔄 Partial |
| Third-party verification | Assurance/readiness note | ✅ MVP |
| Target setting (SBTi alignment) | Actions/targets section | ✅ MVP |
| Progress tracking | YoY comparison | ✅ MVP |
| Value chain engagement | *Out of MVP scope* | 🔄 Future |
| Climate risk assessment | *Out of MVP scope* | 🔄 Future |
| Financial quantification | *Out of MVP scope* | 🔄 Future |

### Optional Data Fields

| Field Category | VSME Comprehensive Field | GreenMetrics Field | Status |
|----------------|-------------------------|-------------------|--------|
| **Targets** | Reduction target % | `targets.reductionPct` | ✅ Optional |
| | Target year | `targets.targetYear` | ✅ Optional |
| | Science-based target status | `targets.sbtiStatus` | 🔄 Future |
| **Verification** | Assurance provider | `assurance.provider` | ✅ Optional |
| | Assurance level | `assurance.level` | ✅ Optional |
| | Verification statement | `assurance.statement` | ✅ Optional |

## ESRS 2 (General Disclosures) Mapping

### Cross-cutting Requirements

| ESRS 2 Requirement | GreenMetrics Equivalent | Coverage Level |
|--------------------|-----------------------|----------------|
| **BP-1**: General basis for preparation | Report metadata + methodology | ✅ Full |
| **BP-2**: Disclosures in relation to specific circumstances | Boundary + exclusions | ✅ Full |
| **GOV-1**: Role of administrative/supervisory bodies | Management statement | 🔄 Minimal |
| **GOV-2**: Information provided to governance bodies | *Out of MVP scope* | ❌ Not covered |
| **GOV-3**: Integration of sustainability performance | Actions/targets section | 🔄 Minimal |
| **SBM-1**: Market position, strategy, business model | Company profile | 🔄 Minimal |
| **SBM-2**: Interests and views of stakeholders | *Out of MVP scope* | ❌ Not covered |
| **SBM-3**: Material impacts, risks, opportunities | *Out of MVP scope* | ❌ Not covered |
| **IRO-1**: Description of processes to identify impacts | *Out of MVP scope* | ❌ Not covered |
| **IRO-2**: Disclosure requirements in ESRS standards | Methodology section | 🔄 Minimal |

**Note**: ESRS 2 requirements are extensive. GreenMetrics provides hooks for basic compliance but full ESRS 2 implementation is beyond MVP scope.

## ESRS E1 (Climate Change) Mapping

### Minimum Climate Disclosures

| ESRS E1 Disclosure | GreenMetrics Section | Coverage Level | Notes |
|-------------------|---------------------|----------------|-------|
| **E1-1**: Transition plan for climate neutrality | Actions/targets | 🔄 Minimal | Optional section |
| **E1-2**: Policies for climate mitigation/adaptation | *Out of MVP scope* | ❌ Not covered | Post-MVP |
| **E1-3**: Actions and resources (climate) | Actions/targets | 🔄 Minimal | Optional section |
| **E1-4**: Targets for climate mitigation/adaptation | Actions/targets | 🔄 Minimal | Optional section |
| **E1-5**: Energy consumption and mix | Activity data (electricity/gas) | ✅ Partial | Scopes 1-2 only |
| **E1-6**: Gross Scopes 1, 2, 3 GHG emissions | CO₂e results | ✅ Partial | Scopes 1-2 only |
| **E1-7**: GHG removals and storage | *Out of MVP scope* | ❌ Not covered | Post-MVP |
| **E1-8**: Internal carbon pricing | *Out of MVP scope* | ❌ Not covered | Post-MVP |
| **E1-9**: Anticipated financial effects | *Out of MVP scope* | ❌ Not covered | Post-MVP |

### E1-6 GHG Emissions Detailed Mapping

| ESRS E1-6 Requirement | GreenMetrics Field | Status |
|-----------------------|-------------------|--------|
| Gross Scope 1 emissions (tCO₂e) | `results.scope1Total` | ✅ MVP |
| Gross Scope 2 emissions (tCO₂e) | `results.scope2Total` | ✅ MVP |
| Gross Scope 3 emissions (tCO₂e) | *Out of MVP scope* | 🔄 Future |
| Total GHG emissions | `results.totalEmissions` | ✅ MVP (Scopes 1-2) |
| Percentage by scope | Calculated from scope totals | ✅ MVP |
| Emissions by country/region | Factor geography metadata | ✅ MVP |
| Emissions by business unit | *Out of MVP scope* | 🔄 Future |
| Base year recalculations | YoY comparison notes | 🔄 Partial |

## Implementation Priority

### MVP (Phase 1-3)
- ✅ **VSME Basic**: Full compliance 
- 🔄 **VSME Comprehensive**: Optional fields only
- 🔄 **ESRS 2**: Minimal hooks for future expansion
- 🔄 **ESRS E1**: Scopes 1-2 emissions only

### Post-MVP (Phase 4+)
- **VSME Comprehensive**: Scope 3, verification, targets
- **ESRS 2**: Full general disclosures
- **ESRS E1**: Complete climate disclosures including Scope 3
- **Additional frameworks**: GRI, CDP, TCFD mapping

## Recipient Guidance Notes

### For Small/Medium Enterprises (VSME Focus)

**English:**
```
This report follows VSME Basic standards, designed for small and medium enterprises. 
It provides essential GHG emissions data without overwhelming complexity.
For enhanced reporting, VSME Comprehensive options are available.
```

**French:**  
```
Ce rapport suit les standards VSME Basic, conçus pour les petites et moyennes entreprises.
Il fournit les données essentielles d'émissions GES sans complexité excessive.
Pour un reporting renforcé, les options VSME Comprehensive sont disponibles.
```

### For CSRD-Eligible Organizations (ESRS Hooks)

**English:**
```
This report provides foundational climate data compatible with ESRS E1 requirements.
Additional disclosures may be needed for full CSRD compliance.
Contact us for ESRS-complete reporting options.
```

**French:**
```
Ce rapport fournit des données climatiques de base compatibles avec les exigences ESRS E1.
Des divulgations supplémentaires peuvent être nécessaires pour une conformité CSRD complète.
Contactez-nous pour les options de reporting ESRS complet.
```

### Proportionality Notes

**English:**
```
Reporting requirements scale with organization size and complexity.
SMEs benefit from streamlined VSME approach while maintaining audit readiness.
Larger organizations can leverage ESRS mapping for regulatory compliance.
```

**French:**
```
Les exigences de reporting s'adaptent à la taille et complexité de l'organisation.
Les PME bénéficient de l'approche simplifiée VSME tout en restant prêtes pour l'audit.
Les grandes organisations peuvent utiliser le mapping ESRS pour la conformité réglementaire.
```

## Acceptance Criteria

### VSME Basic Compliance
- [ ] **All Required Fields**: Every VSME Basic field mapped and implemented
- [ ] **Calculation Methods**: Approved methodologies used for all emissions
- [ ] **Boundary Definition**: Clear operational control boundaries stated
- [ ] **Data Quality**: Factor sources and uncertainty documented
- [ ] **Annual Cadence**: YoY comparison capability demonstrated

### ESRS Mapping Accuracy  
- [ ] **E1-6 Coverage**: Scopes 1-2 emissions fully aligned with ESRS E1-6
- [ ] **Metadata Links**: Report metadata supports ESRS BP-1 requirements
- [ ] **Future Hooks**: Clear path identified for full ESRS implementation
- [ ] **Gap Documentation**: Missing ESRS elements clearly marked as "Out of scope"
- [ ] **Proportionality**: SME vs. large enterprise guidance provided

### Framework Flexibility
- [ ] **Multi-framework**: Same data supports VSME and ESRS outputs
- [ ] **Version Control**: Framework versions tracked in metadata
- [ ] **Export Options**: Different framework views available via API
- [ ] **Upgrade Path**: Clear migration from VSME Basic → Comprehensive → ESRS
- [ ] **Compliance Labels**: Reports clearly indicate framework compliance level
