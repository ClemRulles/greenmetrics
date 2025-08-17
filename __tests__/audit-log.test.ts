import { writeAuditLog } from '@/lib/privacy/audit';
import { vi, it, expect } from 'vitest';

vi.mock('@/lib/prisma', () => ({ 
  prisma: { 
    auditLog: { 
      create: vi.fn(async (x: any) => x) 
    } 
  } 
}));

it('writes audit log', async () => {
  const res = await writeAuditLog({ 
    action: 'TEST', 
    userId: 'u', 
    targetId: 't', 
    metadata: { a: 1 }, 
    requestId: 'rid' 
  });
  expect(res).toBeUndefined(); // no throw
});
