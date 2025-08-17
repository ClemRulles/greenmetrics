import { describe, it, expect } from 'vitest';

describe('Factors Import API', () => {
  it('validates factor import payload schema', async () => {
    const { FactorImportPayload } = await import('@/lib/validators/factors');
    
    const validPayload = {
      source: { 
        name: 'ADEME', 
        url: 'https://example.com', 
        license: 'ODbL' 
      },
      version: 'v2025.1',
      factors: [{
        kind: 'ELECTRICITY_KWH',
        unit: 'kWh',
        geography: 'FR',
        factorKgCO2ePerUnit: 0.07,
        validFrom: '2025-01-01',
        version: 'v2025.1'
      }]
    };

    const result = FactorImportPayload.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects invalid source data', async () => {
    const { FactorImportPayload } = await import('@/lib/validators/factors');
    
    const invalidPayload = {
      source: { name: '' }, // Missing required name
      version: 'v2025.1',
      factors: []
    };

    const result = FactorImportPayload.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('requires at least one factor', async () => {
    const { FactorImportPayload } = await import('@/lib/validators/factors');
    
    const emptyFactorsPayload = {
      source: { name: 'Test Source' },
      version: 'v1.0',
      factors: [] // Empty factors array
    };

    const result = FactorImportPayload.safeParse(emptyFactorsPayload);
    expect(result.success).toBe(false);
  });

  it('validates factor structure', async () => {
    const { FactorRecord } = await import('@/lib/validators/factors');
    
    const validFactor = {
      kind: 'ELECTRICITY_KWH',
      unit: 'kWh',
      geography: 'FR',
      factorKgCO2ePerUnit: 0.07,
      validFrom: '2025-01-01',
      version: 'v2025.1'
    };

    const result = FactorRecord.safeParse(validFactor);
    expect(result.success).toBe(true);
  });
});
