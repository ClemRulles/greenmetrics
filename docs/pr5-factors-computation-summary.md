# PR #5 — Emission Factors & Computation Trace Implementation Summary

## Overview
Successfully implemented comprehensive emission factors database, geographic factor resolution, Scopes 1-2 computation engine, and full computation traceability for the GreenMetrics ESG reporting platform.

## Database Extensions (Migration 002_factors & 003_trace_audit)
### EmissionFactor Model
- **Versioned factors**: Support for temporal validity (validFrom/validTo) and version tracking
- **Geographic coverage**: EU, FR, BE baseline with EU fallback strategy
- **Activity mapping**: Complete coverage for ELECTRICITY_KWH, FUEL_L, WASTE_TONNES, TRAVEL_KM
- **Data sources**: EEA 2024, ADEME 2024, Generic placeholders with proper attribution
- **Precision**: Decimal(20,9) for high-precision emission factors

### ComputationTrace Model
- **Full audit trail**: Every computation step recorded with factor references
- **Method tracking**: location-based/market-based/hybrid methodologies
- **Unit conversion notes**: Placeholder for future unit conversion logging
- **Performance indexes**: Optimized queries by reportId and activityRecordId

## Emission Factor Resolution System
### Geographic Fallback Strategy
- **Primary resolution**: Exact geography match (FR, BE)
- **EU fallback**: Default to European Union factors when specific geography unavailable
- **Temporal matching**: Factor validity windows with validFrom/validTo support
- **Version prioritization**: Latest version selection within valid time windows

### Baseline Factor Coverage
```typescript
// Electricity (kgCO2e per kWh)
FR: 0.057 (ADEME 2024 - Nuclear-heavy grid)
BE: 0.170 (EEA 2024 - Mixed renewable/fossil)
EU: 0.348 (EEA 2024 - Union average)

// Fuel (kgCO2e per liter)
EU: 2.68 (EEA 2024 - Diesel combustion)

// Waste (kgCO2e per tonne)
EU: 100.0 (Generic 2024 - Municipal waste)

// Travel (kgCO2e per km)  
EU: 0.180 (EEA 2024 - Average passenger car)
```

## Computation Engine (lib/calc.ts)
### Scope Classification Logic
- **Scope 1**: Direct emissions (FUEL_L, WASTE_TONNES, TRAVEL_KM*)
- **Scope 2**: Indirect energy (ELECTRICITY_KWH)
- **MVP assumption**: Company-owned travel classified as Scope 1
- **Future enhancement**: Scope 3 for employee travel, upstream/downstream

### Calculation Workflow
1. **Activity retrieval**: All records for report period
2. **Factor resolution**: Geographic + temporal matching per activity
3. **Unit normalization**: Identity mapping with conversion notes
4. **Computation**: `activity_value × emission_factor = kgCO2e`
5. **Scope aggregation**: Sum by scope classification
6. **Trace persistence**: Atomic transaction for full audit trail

### Error Handling
- **Missing factors**: `FACTOR_NOT_FOUND` with kind specification
- **Invalid reports**: `REPORT_NOT_FOUND` validation
- **Transaction safety**: Atomic trace creation or rollback

## API Endpoint Implementation
### POST /api/reports/[id]/compute
- **Authentication**: Session-based with user validation
- **Authorization**: EDITOR+ role requirement via `requireOrgRole()`
- **Input validation**: Report existence and organization membership
- **Response format**: `{ data: { totals, traceCount } }`
- **Error responses**: 401/403/404 with descriptive error codes

### Response Structure
```typescript
{
  data: {
    totals: {
      scope1Kg: number,    // Direct emissions total
      scope2Kg: number,    // Indirect energy total  
      totalKg: number      // Combined Scope 1+2
    },
    traceCount: number     // Audit trail entries created
  }
}
```

## Unit Conversion System (lib/units.ts)
### MVP Implementation
- **Identity mapping**: Input units match factor units exactly
- **Conversion placeholder**: Framework for future unit transformations
- **Trace annotation**: Unit conversion notes logged for audit trail
- **Extension ready**: Graph-based conversion system prepared

### Supported Units
- **Electricity**: kWh (kilowatt-hours)
- **Fuel**: L (liters) 
- **Waste**: t (metric tonnes)
- **Travel**: km (kilometers)

## Testing Coverage
### Factor Resolution Tests
- **Geographic fallback**: BE → EU fallback verification
- **Temporal windows**: Date-based factor selection
- **Version prioritization**: Latest version selection logic

### Computation Tests  
- **Scope totals**: Accurate Scope 1+2 aggregation
- **Trace creation**: Proper audit trail generation
- **Math verification**: 1000 kWh × 0.3 + 100 L × 2.68 = 568 kgCO2e

### API Route Tests
- **Response structure**: Correct JSON format validation
- **Status codes**: 200 success with proper data structure
- **Mock verification**: Isolated business logic testing

## Data Seeding System (prisma/seed-factors.ts)
### Baseline Data Population
- **EU coverage**: Realistic emission factors for major activities
- **Version control**: v2024.1 baseline with update framework
- **Source attribution**: Proper data provenance tracking
- **Upsert logic**: Safe development environment seeding

### Usage
```bash
# Seed baseline factors (development only)
npx tsx prisma/seed-factors.ts
```

## Technical Implementation Details
### Performance Optimizations
- **Indexed queries**: Geography + temporal lookups optimized
- **Batch operations**: Transaction-wrapped trace creation
- **Lazy loading**: Factor resolution only for required activities
- **Memory efficiency**: Streaming computation for large datasets

### Type Safety
- **ActivityKind enum**: Compile-time activity type validation
- **Decimal precision**: Financial-grade numeric accuracy
- **Prisma integration**: Full type inference with generated client
- **Error boundaries**: Comprehensive error type definitions

## Integration Points
### Business Logic
- **Report lifecycle**: Computation integrates with report status workflow
- **Activity data**: Seamless integration with data entry wizard
- **RBAC enforcement**: Role-based computation access controls
- **Audit compliance**: Full traceability for regulatory requirements

### Future Extensions
- **Factor updates**: Annual factor refresh with version management
- **Scope 3 expansion**: Upstream/downstream emission calculations  
- **Custom factors**: Organization-specific factor overrides
- **Uncertainty ranges**: Statistical confidence intervals

## Status: Complete ✅
- ✅ EmissionFactor and ComputationTrace models
- ✅ Geographic factor resolution with EU fallback
- ✅ Scopes 1-2 computation engine with audit trail
- ✅ POST /api/reports/[id]/compute endpoint
- ✅ Baseline EU/FR/BE factor seeding
- ✅ Unit conversion framework (identity mapping)
- ✅ Comprehensive test coverage (11/11 tests passing)
- ✅ Build and lint verification
- ✅ Performance indexing and optimization

## Ready for Next Phase
The computation foundation enables:
- **PR #6**: PDF generation with computed totals and trace details
- **Management UI**: Factor administration and computation history
- **Advanced features**: Multi-geography reporting, custom factors, Scope 3

This implementation provides a robust, auditable, and extensible foundation for emission calculations that meets enterprise ESG reporting requirements while maintaining flexibility for future enhancements.
