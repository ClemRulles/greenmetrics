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
      findUnique: vi.fn(async () => ({ 
        id: 'u1', 
        email: 'u@example.com', 
        name: 'User', 
        image: null, 
        createdAt: new Date(), 
        updatedAt: new Date(),
        accounts: [], 
        sessions: [], 
        memberships: [] 
      })) 
    } 
  }
}));

vi.mock('@/lib/privacy/audit', () => ({
  writeAuditLog: vi.fn()
}));

import { POST } from '@/app/api/dsr/export/route';

describe('DSR export', () => {
  it('returns user export payload', async () => {
    const res = await POST(new Request('http://localhost', { method: 'POST' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.user.email).toBe('u@example.com');
  });
});
