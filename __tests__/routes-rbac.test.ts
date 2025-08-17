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
    report: { 
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id === 'report1') {
          return { 
            id: 'report1', 
            organizationId: 'org1',
            name: 'Test Report',
            framework: 'VSME-Basic',
            frameworkVersion: '2025.01',
            language: 'en'
          };
        }
        return null;
      })
    },
    membership: { 
      findUnique: vi.fn(async ({ where }: any) => {
        // Default: user1 is VIEWER in org1
        if (where.userId_organizationId?.userId === 'user1' && 
            where.userId_organizationId?.organizationId === 'org1') {
          return { 
            id: 'mem1',
            role: 'VIEWER',
            userId: 'user1',
            organizationId: 'org1',
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
        return null;
      })
    }
  }
}));

vi.mock('@/lib/sec/rate-limit', () => ({
  requesterId: vi.fn(() => 'req123'),
  consume: vi.fn(() => ({ ok: true }))
}));

vi.mock('@/lib/calc', () => ({
  computeReport: vi.fn(async () => ({
    totals: { scope1Kg: 100, scope2Kg: 200, totalKg: 300 },
    traceCount: 5,
    geography: 'BE',
    factorsVersion: 'v2024.1',
    snapshotted: true
  }))
}));

vi.mock('@/lib/pdf/buildReportPayload', () => ({
  buildReportPayload: vi.fn(async () => ({
    report: { framework: 'VSME-Basic', frameworkVersion: '2025.01', language: 'en' },
    factorsVersion: 'v2024.1'
  }))
}));

vi.mock('@/lib/pdf/cache', () => ({
  getOrCreateCachedPdf: vi.fn(async () => ({
    asset: { id: 'asset123', bytes: 50000 }
  }))
}));

vi.mock('@/lib/pdf/sign', () => ({
  makeSignedUrlParams: vi.fn(() => ({ exp: '123456', sig: 'abcdef' }))
}));

vi.mock('@/lib/analytics', () => ({
  trackServerEvent: vi.fn()
}));

import { POST as ComputeRoute } from '@/app/api/reports/[id]/compute/route';
import { GET as ExportRoute } from '@/app/api/reports/[id]/export/route';

describe('Routes RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compute route', () => {
    it('allows EDITOR+ to compute reports', async () => {
      // Mock user as EDITOR
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce({ 
        id: 'mem2',
        role: 'EDITOR',
        userId: 'user1',
        organizationId: 'org1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const request = new Request('http://localhost:3000/api/reports/report1/compute', {
        method: 'POST'
      });

      const response = await ComputeRoute(request, { 
        params: Promise.resolve({ id: 'report1' }) 
      });

      expect(response.status).toBe(200);
    });

    it('forbids VIEWER from computing reports', async () => {
      // Mock user as VIEWER (default)
      const request = new Request('http://localhost:3000/api/reports/report1/compute', {
        method: 'POST'
      });

      const response = await ComputeRoute(request, { 
        params: Promise.resolve({ id: 'report1' }) 
      });

      expect(response.status).toBe(403);
    });

    it('forbids non-members from computing', async () => {
      // Mock no membership
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/reports/report1/compute', {
        method: 'POST'
      });

      const response = await ComputeRoute(request, { 
        params: Promise.resolve({ id: 'report1' }) 
      });

      expect(response.status).toBe(403);
    });
  });

  describe('export route', () => {
    it('allows VIEWER+ to export reports', async () => {
      // VIEWER can export (default mock)
      const request = new Request('http://localhost:3000/api/reports/report1/export');

      const response = await ExportRoute(request, { 
        params: Promise.resolve({ id: 'report1' }) 
      });

      expect(response.status).toBe(200);
    });

    it('forbids non-members from exporting', async () => {
      // Mock no membership
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/reports/report1/export');

      const response = await ExportRoute(request, { 
        params: Promise.resolve({ id: 'report1' }) 
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 for non-existent reports', async () => {
      const request = new Request('http://localhost:3000/api/reports/nonexistent/export');

      const response = await ExportRoute(request, { 
        params: Promise.resolve({ id: 'nonexistent' }) 
      });

      expect(response.status).toBe(403); // canExport fails for non-existent reports
    });
  });

  describe('authentication', () => {
    it('requires authentication for compute', async () => {
      // Mock no session
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/reports/report1/compute', {
        method: 'POST'
      });

      await expect(ComputeRoute(request, { 
        params: Promise.resolve({ id: 'report1' }) 
      })).rejects.toThrow('UNAUTHORIZED');
    });

    it('requires authentication for export', async () => {
      // Mock no session
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/reports/report1/export');

      await expect(ExportRoute(request, { 
        params: Promise.resolve({ id: 'report1' }) 
      })).rejects.toThrow('UNAUTHORIZED');
    });
  });
});
