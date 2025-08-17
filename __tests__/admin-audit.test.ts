import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSession = { user: { id: 'user1' } };

vi.mock('next-auth', () => ({ 
  getServerSession: vi.fn(() => Promise.resolve(mockSession))
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    membership: { 
      findUnique: vi.fn(async ({ where }: any) => {
        // Default: user1 is ADMIN in org1
        if (where.userId_organizationId?.userId === 'user1' && 
            where.userId_organizationId?.organizationId === 'org1') {
          return { 
            id: 'mem1',
            role: 'ADMIN',
            userId: 'user1',
            organizationId: 'org1',
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
        return null;
      })
    },
    auditLog: {
      findMany: vi.fn(async ({ where, orderBy, take }: any) => {
        if (where?.orgId === 'org1') {
          const allData = [
            {
              id: 'audit1',
              action: 'compute.success',
              orgId: 'org1',
              userId: 'user1',
              targetId: 'report1',
              metadata: { duration: 450 },
              createdAt: new Date('2024-01-15T10:00:00Z'),
              requestId: 'req123'
            },
            {
              id: 'audit2',
              action: 'export.failed',
              orgId: 'org1',
              userId: 'user2',
              targetId: 'report2',
              metadata: { error: 'Rate limit exceeded' },
              createdAt: new Date('2024-01-15T09:30:00Z'),
              requestId: 'req124'
            }
          ];
          
          // Apply action filter if present
          let filteredData = allData;
          if (where.action) {
            filteredData = allData.filter(item => item.action === where.action);
          }
          
          // Apply take limit
          return take ? filteredData.slice(0, take) : filteredData;
        }
        return [];
      })
    }
  }
}));

vi.mock('@/lib/sec/headers', () => ({
  withRequestId: vi.fn((response: any, req: Request) => {
    response.headers.set('x-request-id', 'req123');
    return response;
  })
}));

import { GET as AuditRoute } from '@/app/api/admin/audit/route';

describe('Admin Audit API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authorization', () => {
    it('allows ADMIN to query audit logs', async () => {
      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1');

      const response = await AuditRoute(request);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toMatchObject({
        action: 'compute.success',
        orgId: 'org1',
        metadata: { duration: 450 }
      });
    });

    it('allows OWNER to query audit logs', async () => {
      // Mock user as OWNER
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce({
        id: 'mem1',
        role: 'OWNER',
        userId: 'user1',
        organizationId: 'org1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1');

      const response = await AuditRoute(request);

      expect(response.status).toBe(200);
    });

    it('forbids EDITOR from querying audit logs', async () => {
      // Mock user as EDITOR
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce({
        id: 'mem1',
        role: 'EDITOR',
        userId: 'user1',
        organizationId: 'org1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1');

      await expect(AuditRoute(request)).rejects.toThrow('FORBIDDEN');
    });

    it('forbids VIEWER from querying audit logs', async () => {
      // Mock user as VIEWER
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce({
        id: 'mem1',
        role: 'VIEWER',
        userId: 'user1',
        organizationId: 'org1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1');

      await expect(AuditRoute(request)).rejects.toThrow('FORBIDDEN');
    });

    it('forbids non-members from querying audit logs', async () => {
      // Mock no membership
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1');

      await expect(AuditRoute(request)).rejects.toThrow('FORBIDDEN');
    });

    it('requires authentication', async () => {
      // Mock no session
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1');

      await expect(AuditRoute(request)).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('query parameters', () => {
    it('requires orgId parameter', async () => {
      const request = new Request('http://localhost:3000/api/admin/audit');

      const response = await AuditRoute(request);

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.error).toBe('VALIDATION');
    });

    it('validates limit parameter', async () => {
      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1&limit=invalid');

      const response = await AuditRoute(request);

      expect(response.status).toBe(200); // limit defaults to 50 if invalid
    });

    it('respects limit parameter', async () => {
      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1&limit=1');

      const response = await AuditRoute(request);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.count).toBeLessThanOrEqual(1);
    });

    it('filters by action when provided', async () => {
      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1&action=compute.success');

      const response = await AuditRoute(request);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.filters.action).toBe('compute.success');
    });

    it('returns organization-scoped results', async () => {
      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1');

      const response = await AuditRoute(request);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(2);
      
      // All entries should be for org1
      data.data.forEach((entry: any) => {
        expect(entry.orgId).toBe('org1');
      });
    });
  });

  describe('response format', () => {
    it('returns audit entries with correct structure', async () => {
      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1');

      const response = await AuditRoute(request);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('count');
      expect(data).toHaveProperty('filters');
      
      const entry = data.data[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('orgId');
      expect(entry).toHaveProperty('createdAt');
      expect(entry).toHaveProperty('metadata');
    });

    it('includes correlation headers', async () => {
      const request = new Request('http://localhost:3000/api/admin/audit?orgId=org1');

      const response = await AuditRoute(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('x-request-id')).toBe('req123');
    });
  });
});
