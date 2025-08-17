import { describe, it, expect, vi } from 'vitest';

vi.mock('next-auth', () => ({ 
  getServerSession: () => Promise.resolve({ user: { id: 'admin' } }) 
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    exportAsset: { deleteMany: vi.fn(async () => ({ count: 2 })) },
    exportJob: { deleteMany: vi.fn(async () => ({ count: 1 })) }
  }
}));

vi.mock('@/lib/privacy/audit', () => ({
  writeAuditLog: vi.fn()
}));

import { POST } from '@/app/api/admin/retention/run/route';

describe('retention sweep', () => {
  it('purges old assets and jobs', async () => {
    const res = await POST(new Request('http://localhost', { method: 'POST' }));
    const json = await res.json();
    expect(json.data.deletedAssets).toBe(2);
    expect(json.data.deletedJobs).toBe(1);
  });
});
