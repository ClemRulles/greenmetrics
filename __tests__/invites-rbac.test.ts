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
      findUnique: vi.fn(async () => ({ 
        id: 'mem1',
        role: 'VIEWER', // Default to least privilege
        userId: 'user1',
        organizationId: 'org1',
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    },
    organization: { 
      findUnique: vi.fn(async () => ({ name: 'Acme Corp' }))
    },
    invitation: { 
      findUnique: vi.fn(async () => ({ 
        id: 'inv1',
        orgId: 'org1'
      })),
      create: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({}))
    }
  }
}));

vi.mock('@/lib/mail/transport', () => ({ 
  getTransport: vi.fn(() => ({ 
    sendMail: vi.fn(async () => ({ messageId: 'dev123' }))
  }))
}));

vi.mock('@/lib/privacy/audit', () => ({
  writeAuditLog: vi.fn(async () => {})
}));

import { POST as CreateInvite } from '@/app/api/orgs/[orgId]/invitations/route';
import { POST as RevokeInvite } from '@/app/api/invitations/[token]/revoke/route';

describe('Invitation RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Role-based access control', () => {
    it('forbids VIEWER from creating invitations', async () => {
      const request = new Request('http://localhost:3000/api/orgs/org1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          email: 'user@example.com', 
          role: 'EDITOR'
        })
      });

      await expect(CreateInvite(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      })).rejects.toThrow('FORBIDDEN');
    });

    it('forbids EDITOR from creating invitations', async () => {
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

      const request = new Request('http://localhost:3000/api/orgs/org1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          email: 'user@example.com', 
          role: 'VIEWER'
        })
      });

      await expect(CreateInvite(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      })).rejects.toThrow('FORBIDDEN');
    });

    it('allows ADMIN to create invitations', async () => {
      // Mock user as ADMIN
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce({
        id: 'mem1',
        role: 'ADMIN',
        userId: 'user1',
        organizationId: 'org1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mock invitation creation
      vi.mocked(prisma.invitation.create).mockResolvedValueOnce({
        id: 'inv1',
        orgId: 'org1',
        email: 'user@example.com',
        role: 'EDITOR',
        token: 'token123',
        expiresAt: new Date(Date.now() + 86400000)
      } as any);

      const request = new Request('http://localhost:3000/api/orgs/org1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          email: 'user@example.com', 
          role: 'EDITOR'
        })
      });

      const response = await CreateInvite(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      });

      expect(response.status).toBe(201);
    });

    it('allows OWNER to create invitations', async () => {
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

      // Mock invitation creation
      vi.mocked(prisma.invitation.create).mockResolvedValueOnce({
        id: 'inv1',
        orgId: 'org1',
        email: 'user@example.com',
        role: 'ADMIN',
        token: 'token123',
        expiresAt: new Date(Date.now() + 86400000)
      } as any);

      const request = new Request('http://localhost:3000/api/orgs/org1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          email: 'user@example.com', 
          role: 'ADMIN'
        })
      });

      const response = await CreateInvite(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      });

      expect(response.status).toBe(201);
    });

    it('forbids VIEWER from revoking invitations', async () => {
      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      await expect(RevokeInvite(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      })).rejects.toThrow('FORBIDDEN');
    });

    it('forbids EDITOR from revoking invitations', async () => {
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

      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      await expect(RevokeInvite(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      })).rejects.toThrow('FORBIDDEN');
    });

    it('prevents cross-organization invitation management', async () => {
      // Mock user who is not a member of the target organization
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/orgs/org1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          email: 'user@example.com', 
          role: 'EDITOR'
        })
      });

      await expect(CreateInvite(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      })).rejects.toThrow('FORBIDDEN');
    });

    it('enforces organization isolation for revocation', async () => {
      // Mock user who is not a member of the invitation's organization
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.membership.findUnique).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      await expect(RevokeInvite(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      })).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('Authentication requirements', () => {
    it('requires authentication for invitation creation', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/orgs/org1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          email: 'user@example.com', 
          role: 'EDITOR'
        })
      });

      await expect(CreateInvite(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      })).rejects.toThrow('UNAUTHORIZED');
    });

    it('requires authentication for invitation revocation', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/invitations/token123/revoke', {
        method: 'POST'
      });

      await expect(RevokeInvite(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      })).rejects.toThrow('UNAUTHORIZED');
    });
  });
});
