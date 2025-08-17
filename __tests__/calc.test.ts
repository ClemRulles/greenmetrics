import { describe, it, expect, vi } from 'vitest';
import { computeReport } from '@/lib/calc';

const store = {
  report: { 
    id: 'r1', 
    periodEnd: new Date('2024-12-31'), 
    geography: null, 
    frameworkVersion: 'VSME 2025.07',
    organization: { countryCode: 'EU' } 
  },
  items: [
    { id: 'a1', reportId: 'r1', kind: 'ELECTRICITY_KWH', unit: 'kWh', value: 1000 },
    { id: 'a2', reportId: 'r1', kind: 'FUEL_L', unit: 'L', value: 100 },
  ],
  factor: {
    ELECTRICITY_KWH: { id: 'feu', geography: 'EU', version: 'v2024.1', factorKgCO2ePerUnit: 0.3 },
    FUEL_L:          { id: 'fdi', geography: 'EU', version: 'v2024.1', factorKgCO2ePerUnit: 2.68 },
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    report: { findUnique: vi.fn(async () => store.report) },
    activityRecord: { findMany: vi.fn(async () => store.items) },
    computationTrace: { create: vi.fn(async (x: unknown) => x) },
    $transaction: vi.fn(async (arr: unknown[]) => arr.map((fn: unknown) => fn)),
    emissionFactor: { findMany: vi.fn(async ({ where }: { where: { kind: string } }) => [store.factor[where.kind as keyof typeof store.factor]]) },
    reportTotalsSnapshot: {
      upsert: vi.fn(async () => ({})),
    },
  },
}));

describe('computeReport', () => {
  it('sums scopes and creates traces', async () => {
    const result = await computeReport('r1');
    expect(result.traceCount).toBe(2);
    expect(Math.round(result.totals.totalKg)).toBe(Math.round(1000*0.3 + 100*2.68));
    expect(result.totals.scope2Kg).toBeCloseTo(300);
    expect(result.totals.scope1Kg).toBeCloseTo(268);
    expect(result.geography).toBe('EU');
    expect(result.factorsVersion).toBe('v2024.1');
    expect(result.snapshotted).toBe(true);
  });
});
