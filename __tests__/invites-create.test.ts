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
        role: 'ADMIN',
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
      create: vi.fn(async (data: any) => ({ 
        id: 'inv1', 
        ...data.data,
        createdAt: new Date()
      })),
      findMany: vi.fn(async () => [])
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

import { POST, GET } from '@/app/api/orgs/[orgId]/invitations/route';

describe('Invitation Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/orgs/[orgId]/invitations', () => {
    it('creates an invitation for ADMIN users', async () => {
      const request = new Request('http://localhost:3000/api/orgs/org1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          email: 'user@example.com', 
          role: 'EDITOR', 
          locale: 'en' 
        })
      });

      const response = await POST(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      });

      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('expiresAt');
      expect(data.data).not.toHaveProperty('token'); // Security: token not returned
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

      const request = new Request('http://localhost:3000/api/orgs/org1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          email: 'user@example.com', 
          role: 'ADMIN'
        })
      });

      const response = await POST(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      });

      expect(response.status).toBe(201);
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

      await expect(POST(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      })).rejects.toThrow('FORBIDDEN');
    });

    it('forbids VIEWER from creating invitations', async () => {
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

      const request = new Request('http://localhost:3000/api/orgs/org1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          email: 'user@example.com', 
          role: 'VIEWER'
        })
      });

      await expect(POST(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      })).rejects.toThrow('FORBIDDEN');
    });

    it('validates required fields', async () => {
      const request = new Request('http://localhost:3000/api/orgs/org1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }) // Missing role
      });

      const response = await POST(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      });

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.error).toBe('VALIDATION');
    });

    it('requires authentication', async () => {
      // Mock no session
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

      await expect(POST(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      })).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('GET /api/orgs/[orgId]/invitations', () => {
    it('lists invitations for ADMIN users', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.invitation.findMany).mockResolvedValueOnce([
        {
          id: 'inv1',
          orgId: 'org1',
          email: 'user1@example.com',
          role: 'EDITOR',
          token: 'token1',
          expiresAt: new Date(Date.now() + 86400000)
        },
        {
          id: 'inv2',
          orgId: 'org1',
          email: 'user2@example.com',
          role: 'VIEWER',
          token: 'token2',
          expiresAt: new Date(Date.now() + 86400000)
        }
      ] as any);

      const request = new Request('http://localhost:3000/api/orgs/org1/invitations');

      const response = await GET(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty('email');
      expect(data.data[0]).toHaveProperty('role');
    });

    it('forbids non-ADMIN users from listing invitations', async () => {
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

      const request = new Request('http://localhost:3000/api/orgs/org1/invitations');

      await expect(GET(request, { 
        params: Promise.resolve({ orgId: 'org1' }) 
      })).rejects.toThrow('FORBIDDEN');
    });
  });
});
