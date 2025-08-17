import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getCoverage } from '@/app/api/sponsor/[orgId]/coverage/route';
import { POST as createSnapshot } from '@/app/api/sponsor/[orgId]/snapshot/route';
import { GET as getLinks, POST as manageLinks } from '@/app/api/sponsor/[orgId]/links/route';

// Mock external dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}));

vi.mock('@/lib/rbac/policy', () => ({
  requireOrgRole: vi.fn()
}));

vi.mock('@/lib/sponsor/coverage', () => ({
  getCoverage: vi.fn().mockResolvedValue({
    invited: 5,
    active: 3,
    coveragePct: 75.0,
    primaryData: 2,
    estimatedData: 1,
    dataQualityScore: 83
  }),
  createCoverageSnapshot: vi.fn().mockResolvedValue({ id: 'snapshot-123' }),
  getSupplierLinks: vi.fn().mockResolvedValue([])
}));

vi.mock('@/lib/privacy/audit', () => ({
  writeAuditLog: vi.fn()
}));

vi.mock('@/lib/sec/headers', () => ({
  withRequestId: vi.fn((response) => response)
}));

import { getServerSession } from 'next-auth';
import { requireOrgRole } from '@/lib/rbac/policy';

describe('Sponsor API RBAC', () => {
  const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/org-123/coverage');
  const mockParams = { orgId: 'org-123' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Coverage API (GET)', () => {
    it('should allow EDITOR to read coverage', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('EDITOR');

      const response = await getCoverage(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(200);
      expect(requireOrgRole).toHaveBeenCalledWith('user-123', 'org-123', 'EDITOR');
    });

    it('should allow ADMIN to read coverage', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('ADMIN');

      const response = await getCoverage(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(200);
      expect(requireOrgRole).toHaveBeenCalledWith('user-123', 'org-123', 'EDITOR');
    });

    it('should deny VIEWER access to coverage', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      const forbiddenError = new Error('FORBIDDEN') as any;
      forbiddenError.status = 403;
      (requireOrgRole as any).mockRejectedValue(forbiddenError);

      const response = await getCoverage(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(403);
    });

    it('should deny unauthenticated access', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const response = await getCoverage(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(401);
    });
  });

  describe('Snapshot API (POST)', () => {
    it('should allow ADMIN to create snapshots', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('ADMIN');

      const response = await createSnapshot(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(201);
      expect(requireOrgRole).toHaveBeenCalledWith('user-123', 'org-123', 'ADMIN');
    });

    it('should deny EDITOR access to create snapshots', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      const forbiddenError = new Error('FORBIDDEN') as any;
      forbiddenError.status = 403;
      (requireOrgRole as any).mockRejectedValue(forbiddenError);

      const response = await createSnapshot(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(403);
    });
  });

  describe('Links API', () => {
    it('should allow EDITOR to read links', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('EDITOR');

      const response = await getLinks(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(200);
      expect(requireOrgRole).toHaveBeenCalledWith('user-123', 'org-123', 'EDITOR');
    });

    it('should allow ADMIN to manage links', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('ADMIN');

      const mockBody = {
        links: [
          { supplierOrgId: 'supplier-1', spendShare: 0.3, critical: true },
          { supplierOrgId: 'supplier-2', spendShare: 0.2, critical: false }
        ]
      };

      const requestWithBody = new NextRequest('http://localhost:3000/api/sponsor/org-123/links', {
        method: 'POST',
        body: JSON.stringify(mockBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await manageLinks(requestWithBody, { params: mockParams });
      
      expect(response.status).toBe(200);
      expect(requireOrgRole).toHaveBeenCalledWith('user-123', 'org-123', 'ADMIN');
    });

    it('should deny EDITOR access to manage links', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      const forbiddenError = new Error('FORBIDDEN') as any;
      forbiddenError.status = 403;
      (requireOrgRole as any).mockRejectedValue(forbiddenError);

      const mockBody = {
        links: [{ supplierOrgId: 'supplier-1', spendShare: 0.3 }]
      };

      const requestWithBody = new NextRequest('http://localhost:3000/api/sponsor/org-123/links', {
        method: 'POST',
        body: JSON.stringify(mockBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await manageLinks(requestWithBody, { params: mockParams });
      
      expect(response.status).toBe(403);
    });

    it('should validate link data structure', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('ADMIN');

      const invalidBody = {
        links: [
          { supplierOrgId: '', spendShare: 1.5 }, // Invalid: empty ID, share > 1
          { supplierOrgId: 'valid-id' } // Invalid: missing spendShare
        ]
      };

      const requestWithBody = new NextRequest('http://localhost:3000/api/sponsor/org-123/links', {
        method: 'POST',
        body: JSON.stringify(invalidBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await manageLinks(requestWithBody, { params: mockParams });
      
      expect(response.status).toBe(400);
    });
  });
});
