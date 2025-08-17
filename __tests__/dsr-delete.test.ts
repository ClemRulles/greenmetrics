import { describe, it, expect, vi } from 'vitest';

vi.mock('next-auth', () => ({ 
  getServerSession: () => Promise.resolve({ user: { id: 'u1' } }) 
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { 
      findUnique: vi.fn(async () => ({ id: 'u1', email: 'a@b.com' })), 
      update: vi.fn(async (x: any) => x) 
    },
    account: { deleteMany: vi.fn(async () => ({})) },
    session: { deleteMany: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (ops: any[]) => Promise.all(ops.map((fn: any) => fn)))
  }
}));

vi.mock('@/lib/privacy/audit', () => ({
  writeAuditLog: vi.fn()
}));

import { POST } from '@/app/api/dsr/delete/route';

describe('DSR delete', () => {
  it('anonymizes user', async () => {
    const res = await POST(new Request('http://localhost', { method: 'POST' }));
    const json = await res.json();
    expect(json.data.anonymized).toBe(true);
    expect(json.data.email).toMatch(/^deleted\+/);
  });
});
