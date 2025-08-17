## PR #37 — Compute Enhancements: LB/MB, Intensity, Attribution (3.1), Grade A/B/C, Click-through Audit

### 🎯 **Objective**
Implement advanced carbon computation features with market-based/location-based grid selection, intensity calculations, attribution formulas, quality grading, and full audit traceability.

### 🏗️ **What to Build**

#### **Market-Based vs Location-Based (MB/LB)**
- **Default**: Scope 2 Location-Based grid factors
- **Market-Based**: When GO (Guarantee of Origin) or renewable energy contract evidence is present
- **Proof Linking**: Direct connection to document evidence for MB eligibility
- **Automatic Selection**: Smart switching based on available proof documents

#### **Intensity Calculations**
- **Site Level** (default): `intensity = (Scope1 + Scope2) / unitsProduced` per site
- **Family Level**: Aggregated intensity across product families
- **Persistence**: Store chosen calculation level for consistency
- **Period-based**: Calculate over specified time periods with proper aggregation

#### **Attribution Formula (GHG Protocol 3.1)**
```
attributed_tCO2e = intensity(kg/unit) × unitsPurchased ÷ 1000
```

#### **Quality Grading System**
- **Grade A**: Exact (SKU/family) + complete proofs
- **Grade B**: Site-level + reliable production data  
- **Grade C**: Estimated (fallback, missing documentation)
- **Automatic Assignment**: Based on data availability and proof quality

#### **Audit Chain & Traceability**
- **Full Trace**: Value → Factor Version → Document ID + Page
- **Click-through Navigation**: Dashboard links to source documents
- **Recomputation Path**: < 5 minutes from corrected data to updated certificate
- **Version Control**: Track all computation changes with timestamps

### 📁 **Files to Create/Update**

#### **Core Computation Modules**
1. **`lib/compute/mb-lb.ts`** - Market-based vs Location-based grid selection
2. **`lib/compute/intensity.ts`** - Site and family-level intensity calculations
3. **`lib/compute/grade.ts`** - Quality grading and assessment
4. **`lib/compute/attribution.ts`** - GHG Protocol 3.1 attribution formulas
5. **`lib/compute/audit-chain.ts`** - Traceability and audit trail

#### **Database Models**
6. **`prisma/schema.prisma`** - Extended with trace models and computation records
7. **`lib/types/computation.ts`** - TypeScript interfaces for computation data

#### **API Endpoints**
8. **`app/api/compute/recompute/route.ts`** - Trigger recomputation pipeline
9. **`app/api/compute/trace/route.ts`** - Audit trail retrieval
10. **`app/api/compute/intensity/route.ts`** - Intensity calculation endpoint

#### **UI Components**
11. **`components/audit/TraceViewer.tsx`** - Interactive audit chain navigation
12. **`components/compute/QualityBadge.tsx`** - Grade A/B/C visual indicators
13. **`components/compute/IntensitySelector.tsx`** - Site vs family selection

#### **Testing**
14. **`__tests__/compute/mb-lb.test.ts`** - Market-based/Location-based tests
15. **`__tests__/compute/intensity.test.ts`** - Intensity calculation validation
16. **`__tests__/compute/attribution.test.ts`** - Attribution formula tests
17. **`__tests__/compute/grade.test.ts`** - Quality grading logic
18. **`__tests__/compute/recompute.test.ts`** - Recomputation SLA validation

### 🔗 **Trace Data Models**

```typescript
// Enhanced computation trace
interface ComputationTrace {
  id: string;
  readingId: string;           // Source utility reading
  emissionFactorId: string;    // Factor used
  documentId?: string;         // Proof document
  pageNumber?: number;         // Specific page reference
  computationType: 'LB' | 'MB';
  intensity?: number;          // kg CO2e per unit
  attribution?: number;        // Final attributed emissions
  grade: 'A' | 'B' | 'C';     // Quality grade
  computedAt: Date;
  version: string;             // Computation version
}

// Intensity calculation record
interface IntensityRecord {
  id: string;
  siteId?: string;             // Site-level intensity
  familyId?: string;           // Family-level intensity
  period: { start: Date; end: Date };
  scope1Emissions: number;     // tCO2e
  scope2Emissions: number;     // tCO2e
  unitsProduced: number;
  intensity: number;           // kg CO2e per unit
  grade: 'A' | 'B' | 'C';
  supportingDocs: string[];    // Document references
}
```

### 🎯 **Acceptance Criteria**

#### **MB/LB Grid Selection**
- [ ] Location-based factors used by default for Scope 2
- [ ] Market-based factors when GO/contract evidence present
- [ ] Proof document linking for MB qualification
- [ ] Automatic switching based on evidence availability

#### **Intensity & Attribution**
- [ ] Site-level and family-level intensity calculations
- [ ] Formula: `intensity = (S1+S2) / unitsProduced`
- [ ] Attribution: `attributed_tCO2e = intensity × units ÷ 1000`
- [ ] Persistent calculation level selection

#### **Quality Grading**
- [ ] Grade A: Exact data + complete proofs
- [ ] Grade B: Site data + reliable production
- [ ] Grade C: Estimated/missing documentation
- [ ] Automatic grade assignment per rules

#### **Audit Chain & Traceability**
- [ ] Full trace: Value → Factor → Document + Page
- [ ] Click-through navigation from dashboard
- [ ] Complete audit trail with timestamps
- [ ] Navigable trace viewer interface

#### **Recomputation Performance**
- [ ] < 5 minutes from data correction to certificate
- [ ] Automated recomputation pipeline
- [ ] Version control for all changes
- [ ] SLA monitoring and alerts

### 🚀 **Implementation Priority**

**Phase 1: Core Computation** (Day 1)
- MB/LB grid selection logic
- Intensity calculation engine
- Attribution formula implementation

**Phase 2: Quality & Grading** (Day 2)
- Quality assessment rules
- Grade assignment automation
- Proof document validation

**Phase 3: Audit & UI** (Day 3)
- Audit chain implementation
- Trace viewer interface
- Recomputation pipeline

This establishes enterprise-grade carbon computation with full traceability and audit capabilities! 🔍📊
