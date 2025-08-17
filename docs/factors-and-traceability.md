# Emission Factors & Computation Traceability

## Factor Versioning Schema

### Required Fields

Each emission factor must include the following versioned metadata:

```typescript
interface EmissionFactor {
  id: string;                    // Unique factor identifier
  kind: string;                  // "ELECTRICITY" | "NATURAL_GAS" | "DIESEL" | etc.
  unit: string;                  // "kWh" | "m3" | "L" | "km" | etc.
  factorKgCO2ePerUnit: number;   // CO₂e factor per unit
  geography: string;             // ISO 3166-1 alpha-2 country code
  source: string;                // "ADEME_BASE_CARBONE" | "EPA_EGRID" | etc.
  validFrom: string;             // ISO 8601 date
  validTo?: string;              // ISO 8601 date (null = current)
  version: string;               // "23.0", "2024.1", etc.
  sourceUrl?: string;            // Reference URL
  methodology: string;           // Brief methodology description
  uncertainty?: number;          // Percentage uncertainty if available
  lastUpdated: string;           // ISO 8601 timestamp
}
```

### Example Factor Records

#### French Electricity (ADEME)
```json
{
  "id": "ademe_elec_fr_2024",
  "kind": "ELECTRICITY",
  "unit": "kWh", 
  "factorKgCO2ePerUnit": 0.0549,
  "geography": "FR",
  "source": "ADEME_BASE_CARBONE",
  "validFrom": "2024-01-01",
  "validTo": "2024-12-31",
  "version": "23.0",
  "sourceUrl": "https://base-carbone.ademe.fr/",
  "methodology": "Average emission factor for French electricity grid mix",
  "uncertainty": 5.2,
  "lastUpdated": "2024-01-15T10:00:00Z"
}
```

#### Diesel Fuel (ADEME)
```json
{
  "id": "ademe_diesel_fr_2024",
  "kind": "DIESEL", 
  "unit": "L",
  "factorKgCO2ePerUnit": 2.671,
  "geography": "FR",
  "source": "ADEME_BASE_CARBONE",
  "validFrom": "2024-01-01", 
  "validTo": "2024-12-31",
  "version": "23.0",
  "sourceUrl": "https://base-carbone.ademe.fr/",
  "methodology": "Combustion + upstream (well-to-tank)",
  "uncertainty": 3.1,
  "lastUpdated": "2024-01-15T10:00:00Z"
}
```

## Factor Update Policy

### Update Frequency
- **ADEME Base Carbone**: Annual updates (typically January)
- **EPA eGRID**: Annual updates (typically October)
- **Custom Factors**: As needed based on supplier data

### Version Control Process
1. **New Factor Available**: Source publishes updated factors
2. **Validation**: Review factor changes and methodology updates
3. **Database Update**: Add new factor versions with `validFrom` date
4. **Deprecation**: Set `validTo` date on previous versions
5. **Report Impact**: Flag existing reports using outdated factors
6. **Communication**: Notify users of available updates

### Change Tracking
```typescript
interface FactorUpdate {
  factorId: string;
  oldVersion: string;
  newVersion: string;
  changePct: number;           // Percentage change in factor value
  changeReason: string;        // "METHODOLOGY_UPDATE" | "DATA_REFRESH" | etc.
  impactedReports: string[];   // List of report IDs using old factor
  updatedAt: string;           // ISO 8601 timestamp
}
```

## Computation Traceability

### Calculation Audit Trail

Every emission calculation must be traceable to its inputs and factors:

```typescript
interface ComputationTrace {
  id: string;                  // Unique trace ID
  reportId: string;            // Parent report ID
  activityCategory: string;    // "ELECTRICITY" | "TRANSPORT" | etc.
  inputValue: number;          // Activity data quantity
  inputUnit: string;           // Activity data unit
  factorId: string;            // Emission factor used
  factorValue: number;         // Factor value at calculation time
  unitConversion?: number;     // Conversion factor if units differ
  result: number;              // Calculated CO₂e
  calculatedAt: string;        // ISO 8601 timestamp
  calculationFormula: string;  // Human-readable formula
}
```

### Example Calculation Trace

#### Electricity Consumption Calculation
```json
{
  "id": "calc_elec_001",
  "reportId": "rpt_2024_ecotech",
  "activityCategory": "ELECTRICITY",
  "inputValue": 45230,
  "inputUnit": "kWh",
  "factorId": "ademe_elec_fr_2024", 
  "factorValue": 0.0549,
  "unitConversion": null,
  "result": 2.483,
  "calculatedAt": "2024-03-15T14:30:00Z",
  "calculationFormula": "45,230 kWh × 0.0549 kgCO₂e/kWh = 2.483 tCO₂e"
}
```

#### Diesel Vehicle Calculation  
```json
{
  "id": "calc_diesel_001",
  "reportId": "rpt_2024_ecotech",
  "activityCategory": "TRANSPORT",
  "inputValue": 8760,
  "inputUnit": "L",
  "factorId": "ademe_diesel_fr_2024",
  "factorValue": 2.671, 
  "unitConversion": null,
  "result": 23.398,
  "calculatedAt": "2024-03-15T14:31:00Z",
  "calculationFormula": "8,760 L × 2.671 kgCO₂e/L = 23.398 tCO₂e"
}
```

## PDF Traceability Appendix

### Calculation Details Section

Each PDF report includes an appendix with full calculation traceability:

#### English Format
```
APPENDIX: Calculation Details

Electricity Consumption
Input: 45,230 kWh
Factor: 0.0549 kgCO₂e/kWh (ADEME Base Carbone v23.0, France, 2024)
Calculation: 45,230 × 0.0549 = 2.48 tCO₂e
Trace ID: calc_elec_001

Company Vehicles (Diesel)  
Input: 8,760 L
Factor: 2.671 kgCO₂e/L (ADEME Base Carbone v23.0, France, 2024)
Calculation: 8,760 × 2.671 = 23.40 tCO₂e
Trace ID: calc_diesel_001
```

#### French Format
```
ANNEXE : Détails des calculs

Consommation électrique
Entrée : 45 230 kWh
Facteur : 0,0549 kgCO₂e/kWh (ADEME Base Carbone v23.0, France, 2024)
Calcul : 45 230 × 0,0549 = 2,48 tCO₂e
ID trace : calc_elec_001

Véhicules d'entreprise (Diesel)
Entrée : 8 760 L  
Facteur : 2,671 kgCO₂e/L (ADEME Base Carbone v23.0, France, 2024)
Calcul : 8 760 × 2,671 = 23,40 tCO₂e
ID trace : calc_diesel_001
```

### Factor Reference Table

#### English Format
```
EMISSION FACTORS USED

Factor ID: ademe_elec_fr_2024
Category: Electricity
Value: 0.0549 kgCO₂e/kWh
Source: ADEME Base Carbone v23.0
Geography: France
Valid Period: 2024-01-01 to 2024-12-31
Methodology: Average emission factor for French electricity grid mix
```

#### French Format  
```
FACTEURS D'ÉMISSION UTILISÉS

ID facteur : ademe_elec_fr_2024
Catégorie : Électricité
Valeur : 0,0549 kgCO₂e/kWh
Source : ADEME Base Carbone v23.0
Géographie : France
Période de validité : 01/01/2024 au 31/12/2024
Méthodologie : Facteur d'émission moyen du mix électrique français
```

## Data Quality Indicators

### Factor Quality Metrics
- **Uncertainty Level**: Percentage uncertainty from source
- **Geographic Specificity**: Country > Region > Global
- **Temporal Relevance**: Current year > Previous year > Older
- **Methodology Transparency**: Documented > Estimated > Unknown

### Calculation Quality Flags
```typescript
interface QualityIndicator {
  traceId: string;
  dataQuality: "HIGH" | "MEDIUM" | "LOW";
  uncertaintyPct: number;
  flags: string[];           // ["ESTIMATED_DATA", "OLD_FACTOR", etc.]
  confidenceLevel: number;   // 0-100%
}
```

## Acceptance Criteria

### Factor Database Requirements
- [ ] **Complete Metadata**: All required fields populated for every factor
- [ ] **Version Control**: Historical versions preserved with validity periods
- [ ] **Source Attribution**: Clear attribution to authoritative sources
- [ ] **Geographic Coverage**: Country-specific factors for target markets
- [ ] **Update Tracking**: Change history maintained for all updates

### Traceability Requirements  
- [ ] **100% Coverage**: Every emission result traceable to specific inputs/factors
- [ ] **Unique IDs**: Each calculation has unique trace identifier
- [ ] **Timestamp**: Calculation time recorded for audit purposes
- [ ] **Formula**: Human-readable calculation formula provided
- [ ] **PDF Appendix**: Full traceability details included in report

### Quality Assurance
- [ ] **Data Validation**: Input ranges and factor values validated
- [ ] **Unit Consistency**: Unit conversions properly tracked
- [ ] **Uncertainty**: Factor uncertainty propagated to results
- [ ] **Flags**: Data quality issues clearly marked
- [ ] **Audit Trail**: Complete calculation history preserved

### Bilingual Support
- [ ] **Factor Names**: Translated category names in EN/FR
- [ ] **Formulas**: Calculation formulas in report language
- [ ] **References**: Source attributions in appropriate language
- [ ] **Appendix**: Traceability section fully translated
- [ ] **Quality Flags**: Data quality indicators translated
