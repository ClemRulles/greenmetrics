import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getCoverage } from '@/app/api/partner/[orgId]/coverage/route';
import { POST as createSnapshot } from '@/app/api/partner/[orgId]/snapshot/route';
import { GET as getLinks, POST as manageLinks } from '@/app/api/partner/[orgId]/links/route';
import { GET as getPolicy, POST as updatePolicy } from '@/app/api/partner/[orgId]/policy/route';

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

vi.mock('@/lib/partner/coverage', () => ({
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

vi.mock('@/lib/sharing/guards', () => ({
  getPolicy: vi.fn().mockResolvedValue({
    id: 'policy-123',
    orgId: 'org-123',
    visibilityDefault: 'AGGREGATED',
    consentRequired: true,
    termsVersion: 'v1',
    createdAt: new Date(),
    updatedAt: new Date()
  })
}));

vi.mock('@/lib/privacy/audit', () => ({
  writeAuditLog: vi.fn()
}));

vi.mock('@/lib/sec/headers', () => ({
  withRequestId: vi.fn((response) => response)
}));

import { getServerSession } from 'next-auth';
import { requireOrgRole } from '@/lib/rbac/policy';

describe('Partner API RBAC', () => {
  const mockRequest = new NextRequest('http://localhost:3000/api/partner/org-123/coverage');
  const mockParams = Promise.resolve({ orgId: 'org-123' });

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

    it('should reject unauthenticated requests', async () => {
      (getServerSession as any).mockResolvedValue(null);

      const response = await getCoverage(mockRequest, { params: mockParams });
      expect(response.status).toBe(401);
    });

    it('should reject insufficient permissions', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockRejectedValue({ status: 403, message: 'Insufficient permissions' });

      const response = await getCoverage(mockRequest, { params: mockParams });
      expect(response.status).toBe(403);
    });
  });

  describe('Snapshot API (POST)', () => {
    it('should require ADMIN role for snapshot creation', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('ADMIN');

      const response = await createSnapshot(mockRequest, { params: mockParams });
      expect(response.status).toBe(201);
      expect(requireOrgRole).toHaveBeenCalledWith('user-123', 'org-123', 'ADMIN');
    });

    it('should reject EDITOR role for snapshot creation', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockRejectedValue({ status: 403, message: 'Insufficient permissions' });

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

    it('should require ADMIN for managing links', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('ADMIN');

      const mockBody = {
        links: [
          { supplierOrgId: 'supplier-1', spendShare: 0.5, critical: false }
        ]
      };

      const requestWithBody = new NextRequest('http://localhost:3000/api/partner/org-123/links', {
        method: 'POST',
        body: JSON.stringify(mockBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await manageLinks(requestWithBody, { params: mockParams });
      expect(response.status).toBe(200);
      expect(requireOrgRole).toHaveBeenCalledWith('user-123', 'org-123', 'ADMIN');
    });

    it('should reject EDITOR role for managing links', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockRejectedValue({ status: 403, message: 'Insufficient permissions' });

      const mockBody = {
        links: [
          { supplierOrgId: 'supplier-1', spendShare: 0.5, critical: false }
        ]
      };

      const requestWithBody = new NextRequest('http://localhost:3000/api/partner/org-123/links', {
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

      const requestWithBody = new NextRequest('http://localhost:3000/api/partner/org-123/links', {
        method: 'POST',
        body: JSON.stringify(invalidBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await manageLinks(requestWithBody, { params: mockParams });
      expect(response.status).toBe(400);
    });
  });

  describe('Policy API', () => {
    it('should allow EDITOR to read policy', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('EDITOR');

      const response = await getPolicy(mockRequest, { params: mockParams });
      expect(response.status).toBe(200);
      expect(requireOrgRole).toHaveBeenCalledWith('user-123', 'org-123', 'EDITOR');
    });

    it('should require ADMIN to update policy', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('ADMIN');

      const mockPolicyBody = {
        visibilityDefault: 'DETAILED',
        consentRequired: false,
        termsVersion: 'v2'
      };

      const requestWithBody = new NextRequest('http://localhost:3000/api/partner/org-123/policy', {
        method: 'POST',
        body: JSON.stringify(mockPolicyBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updatePolicy(requestWithBody, { params: mockParams });
      expect(response.status).toBe(200);
      expect(requireOrgRole).toHaveBeenCalledWith('user-123', 'org-123', 'ADMIN');
    });

    it('should validate policy data', async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } });
      (requireOrgRole as any).mockResolvedValue('ADMIN');

      const invalidPolicyBody = {
        visibilityDefault: 'INVALID_OPTION', // Invalid enum value
        consentRequired: 'not-a-boolean', // Invalid type
        termsVersion: '' // Empty string
      };

      const requestWithBody = new NextRequest('http://localhost:3000/api/partner/org-123/policy', {
        method: 'POST',
        body: JSON.stringify(invalidPolicyBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updatePolicy(requestWithBody, { params: mockParams });
      expect(response.status).toBe(400);
    });
  });
});
