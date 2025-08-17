import { describe, it, expect } from 'vitest';

describe('Factors Resolve API', () => {
  it('validates schema types', async () => {
    const { ResolveQuery } = await import('@/lib/validators/factors');
    
    // Valid query
    const validQuery = { kind: 'ELECTRICITY_KWH', date: '2024-12-01' };
    const result = ResolveQuery.safeParse(validQuery);
    expect(result.success).toBe(true);
    
    // Invalid query - missing required fields
    const invalidQuery = { invalid: 'query' };
    const badResult = ResolveQuery.safeParse(invalidQuery);
    expect(badResult.success).toBe(false);
  });

  it('validates geography parameter length', async () => {
    const { ResolveQuery } = await import('@/lib/validators/factors');
    
    // Valid geography
    const validQuery = { kind: 'ELECTRICITY_KWH', date: '2024-12-01', geo: 'BE' };
    const result = ResolveQuery.safeParse(validQuery);
    expect(result.success).toBe(true);
    
    // Invalid geography - too long
    const invalidQuery = { kind: 'ELECTRICITY_KWH', date: '2024-12-01', geo: 'BELGIUM' };
    const badResult = ResolveQuery.safeParse(invalidQuery);
    expect(badResult.success).toBe(false);
  });

  it('accepts optional orgId parameter', async () => {
    const { ResolveQuery } = await import('@/lib/validators/factors');
    
    const queryWithOrg = { 
      kind: 'ELECTRICITY_KWH', 
      date: '2024-12-01', 
      orgId: 'org123' 
    };
    const result = ResolveQuery.safeParse(queryWithOrg);
    expect(result.success).toBe(true);
    expect(result.data?.orgId).toBe('org123');
  });
});
