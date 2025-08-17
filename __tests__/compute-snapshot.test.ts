import { describe, it, expect, vi } from 'vitest';

const store: any = { snapshot: null };

vi.mock('@/lib/prisma', () => ({
  prisma: {
    report: { 
      findUnique: vi.fn(async () => ({ 
        id: 'r', 
        frameworkVersion: 'VSME 2025.07', 
        geography: null, 
        periodEnd: new Date('2024-12-31'), 
        organization: { countryCode: 'BE' } 
      })) 
    },
    activityRecord: { 
      findMany: vi.fn(async () => [{ 
        id: 'a', 
        reportId: 'r', 
        kind: 'ELECTRICITY_KWH', 
        unit: 'kWh', 
        value: 1000 
      }]) 
    },
    emissionFactor: { 
      findMany: vi.fn(async () => [{ 
        id: 'f', 
        geography: 'BE', 
        version: 'v2024.1', 
        factorKgCO2ePerUnit: 0.17 
      }]) 
    },
    computationTrace: { 
      create: vi.fn(async (x: any) => x) 
    },
    $transaction: vi.fn(async (arr: any[]) => arr.map((fn: any) => fn)),
    reportTotalsSnapshot: {
      upsert: vi.fn(async (args: any) => (store.snapshot = { ...args.create, ...args.update })),
    },
  },
}));

vi.mock('@/lib/factors', () => ({
  resolveFactor: vi.fn(async () => ({
    id: 'f',
    geography: 'BE',
    version: 'v2024.1',
    factorKgCO2ePerUnit: 0.17
  }))
}));

vi.mock('@/lib/units', () => ({
  normalizeUnit: vi.fn(() => ({ unit: 'kWh', note: null }))
}));

import { computeReport } from '@/lib/calc';

describe('computeReport snapshot', () => {
  it('creates snapshot with geography BE and factor version', async () => {
    store.snapshot = null; // reset
    const res = await computeReport('r');
    
    expect(res.geography).toBe('BE');
    expect(res.factorsVersion).toBe('v2024.1');
    expect(res.snapshotted).toBe(true);
    expect(res.totals.scope2Kg).toBe(170); // 1000 kWh * 0.17 kg/kWh
    expect(store.snapshot).toBeTruthy();
    expect(store.snapshot.factorsVersion).toBe('v2024.1');
    expect(store.snapshot.frameworkVersion).toBe('VSME 2025.07');
  });

  it('is idempotent - recompute without changes keeps same values', async () => {
    store.snapshot = null; // reset
    const res1 = await computeReport('r');
    const res2 = await computeReport('r');
    
    expect(res1.totals).toEqual(res2.totals);
    expect(res1.factorsVersion).toBe(res2.factorsVersion);
    expect(res1.geography).toBe(res2.geography);
  });
});
