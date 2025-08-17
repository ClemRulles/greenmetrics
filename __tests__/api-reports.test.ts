import { describe, it, expect, vi } from 'vitest';
vi.mock('next-auth', () => ({ getServerSession: () => Promise.resolve({ user: { id: 'u1' } }) }));

import { reportCreateSchema } from '@/lib/validation';

describe('report API (schema side)', () => {
  it('schema allows VSME-Basic', () => {
    expect(reportCreateSchema.parse({
      organizationId: 'o1',
      name: 'R1',
      periodStart: '2024-01-01',
      periodEnd: '2024-12-31',
      framework: 'VSME-Basic',
      frameworkVersion: 'VSME 2025.07',
      language: 'en'
    })).toBeTruthy();
  });
});
