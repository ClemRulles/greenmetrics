import { describe, it, expect, vi } from 'vitest';
import { resolveFactor } from '@/lib/factors';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    emissionFactor: {
      findMany: vi.fn(async () => [
        { id: 'f1', geography: 'BE', version: 'v2024.1', factorKgCO2ePerUnit: 0.170 }
      ]),
    },
  },
}));

describe('resolveFactor', () => {
  it('returns latest factor for geography or EU fallback', async () => {
    const f = await resolveFactor({ kind: 'ELECTRICITY_KWH', geography: 'BE', periodDate: new Date('2024-12-01') });
    expect(f.id).toBe('f1');
  });
});
