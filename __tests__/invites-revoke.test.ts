import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSession = { user: { id: 'admin1' } };

vi.mock('next-auth', () => ({ 
  getServerSession: vi.fn(() => Promise.resolve(mockSession))
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    membership: { 
      findUnique: vi.fn(async () => ({ 
        id: 'mem1',
        role: 'ADMIN',
        userId: 'admin1',
        organizationId: 'org1',
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    },
    invitation: { 
      findUnique: vi.fn(async () => ({ 
        id: 'inv1',
        orgId: 'org1',
        email: 'user@example.com',
        role: 'EDITOR',
        token: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      })),
      delete: vi.fn(async () => ({ 
        id: 'inv1',
        orgId: 'org1',
        email: 'user@example.com',
        role: 'EDITOR'
      }))
    }
  }
}));

vi.mock('@/lib/privacy/audit', () => ({
  writeAuditLog: vi.fn(async () => {})
}));

import { POST } from '@/app/api/invitations/[token]/revoke/route';

describe('Invitation Revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/invitations/[token]/revoke', () => {
    it('allows ADMIN to revoke invitations', async () => {
      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      const response = await POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveProperty('id', 'inv1');
      expect(data.data).toHaveProperty('revoked', true);
    });

    it('allows OWNER to revoke invitations', async () => {
      // Mock user as OWNER
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce({
        id: 'mem1',
        role: 'OWNER',
        userId: 'admin1',
        organizationId: 'org1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      const response = await POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      });

      expect(response.status).toBe(200);
    });

    it('forbids EDITOR from revoking invitations', async () => {
      // Mock user as EDITOR
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce({
        id: 'mem1',
        role: 'EDITOR',
        userId: 'admin1',
        organizationId: 'org1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      await expect(POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      })).rejects.toThrow('FORBIDDEN');
    });

    it('forbids VIEWER from revoking invitations', async () => {
      // Mock user as VIEWER
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce({
        id: 'mem1',
        role: 'VIEWER',
        userId: 'admin1',
        organizationId: 'org1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      await expect(POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      })).rejects.toThrow('FORBIDDEN');
    });

    it('returns 404 for non-existent token', async () => {
      // Mock invitation not found
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.invitation.findUnique).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/invitations/invalid/revoke', {
        method: 'POST'
      });

      const response = await POST(request, { 
        params: Promise.resolve({ token: 'invalid' }) 
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('INVITE_NOT_FOUND');
    });

    it('requires authentication', async () => {
      // Mock no session
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      await expect(POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      })).rejects.toThrow('UNAUTHORIZED');
    });

    it('forbids cross-organization revocation', async () => {
      // Mock user who is not member of the invitation's organization
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(null); // No membership

      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      await expect(POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      })).rejects.toThrow('FORBIDDEN');
    });

    it('audits revocation action', async () => {
      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      await POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      });

      const { writeAuditLog } = await import('@/lib/privacy/audit');
      expect(vi.mocked(writeAuditLog)).toHaveBeenCalledWith({
        userId: 'admin1',
        orgId: 'org1',
        action: 'INVITE_REVOKE',
        targetId: 'inv1'
      });
    });
  });
});
