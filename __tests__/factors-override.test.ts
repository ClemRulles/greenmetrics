import { describe, it, expect } from 'vitest';

describe('Factors Override API', () => {
  it('validates override payload schema', async () => {
    const { OverridePayload } = await import('@/lib/validators/factors');
    
    const validPayload = { 
      kind: 'ELECTRICITY_KWH', 
      unit: 'kWh', 
      factorKgCO2ePerUnit: 0.09, 
      version: 'org-2025.1', 
      validFrom: '2025-01-01' 
    };

    const result = OverridePayload.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects negative emission factors', async () => {
    const { OverridePayload } = await import('@/lib/validators/factors');
    
    const invalidPayload = { 
      kind: 'ELECTRICITY_KWH', 
      unit: 'kWh', 
      factorKgCO2ePerUnit: -0.05, // Negative value
      version: 'org-2025.1', 
      validFrom: '2025-01-01' 
    };

    const result = OverridePayload.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('requires kind and unit fields', async () => {
    const { OverridePayload } = await import('@/lib/validators/factors');
    
    const incompletePayload = { 
      factorKgCO2ePerUnit: 0.09, 
      version: 'org-2025.1', 
      validFrom: '2025-01-01' 
      // Missing kind and unit
    };

    const result = OverridePayload.safeParse(incompletePayload);
    expect(result.success).toBe(false);
  });

  it('accepts optional geography and reason fields', async () => {
    const { OverridePayload } = await import('@/lib/validators/factors');
    
    const payloadWithOptionals = { 
      kind: 'ELECTRICITY_KWH', 
      unit: 'kWh', 
      geography: 'BE',
      factorKgCO2ePerUnit: 0.09, 
      version: 'org-2025.1', 
      validFrom: '2025-01-01',
      validTo: '2025-12-31',
      reason: 'Updated for local conditions'
    };

    const result = OverridePayload.safeParse(payloadWithOptionals);
    expect(result.success).toBe(true);
    expect(result.data?.geography).toBe('BE');
    expect(result.data?.reason).toBe('Updated for local conditions');
  });
});
