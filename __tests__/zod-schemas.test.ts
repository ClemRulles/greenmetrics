import { describe, it, expect } from 'vitest';
import { reportCreateSchema, activitiesBatchSchema } from '@/lib/validation';

describe('Zod schemas', () => {
  it('valid reportCreateSchema', () => {
    const res = reportCreateSchema.safeParse({
      organizationId: 'org_1',
      name: 'FY2024 Report',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
      framework: 'VSME-Basic',
      frameworkVersion: 'VSME 2025.07',
      language: 'en',
    });
    expect(res.success).toBe(true);
  });

  it('rejects negative activity value', () => {
    const res = activitiesBatchSchema.safeParse({
      reportId: 'rep_1',
      items: [{ kind: 'ELECTRICITY_KWH', unit: 'kWh', value: -1 }],
    });
    expect(res.success).toBe(false);
  });
});
