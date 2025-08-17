import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSession = { user: { id: 'user1', email: 'user@example.com' } };

vi.mock('next-auth', () => ({ 
  getServerSession: vi.fn(() => Promise.resolve(mockSession))
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {}
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    invitation: { 
      findUnique: vi.fn(async () => ({ 
        id: 'inv1',
        orgId: 'org1',
        email: 'user@example.com',
        role: 'EDITOR',
        token: 'token123',
        expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
      })),
      delete: vi.fn(async () => ({}))
    },
    membership: { 
      upsert: vi.fn(async () => ({ 
        id: 'mem1',
        userId: 'user1',
        organizationId: 'org1',
        role: 'EDITOR'
      }))
    }
  }
}));

vi.mock('@/lib/privacy/audit', () => ({
  writeAuditLog: vi.fn(async () => {})
}));

import { POST } from '@/app/api/invitations/[token]/accept/route';

describe('Invitation Acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/invitations/[token]/accept', () => {
    it('accepts invitation for matching email', async () => {
      const request = new Request('http://localhost:3000/api/invitations/token123/accept', {
        method: 'POST'
      });

      const response = await POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveProperty('role', 'EDITOR');
      expect(data.data).toHaveProperty('orgId', 'org1');
    });

    it('rejects invitation for mismatched email', async () => {
      // Mock invitation with different email
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.invitation.findUnique).mockResolvedValueOnce({
        id: 'inv1',
        orgId: 'org1',
        email: 'different@example.com', // Different email
        role: 'EDITOR',
        token: 'token123',
        expiresAt: new Date(Date.now() + 3600000)
      } as any);

      const request = new Request('http://localhost:3000/api/invitations/token123/accept', {
        method: 'POST'
      });

      const response = await POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('EMAIL_MISMATCH');
    });

    it('rejects expired invitation', async () => {
      // Mock expired invitation
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.invitation.findUnique).mockResolvedValueOnce({
        id: 'inv1',
        orgId: 'org1',
        email: 'user@example.com',
        role: 'EDITOR',
        token: 'token123',
        expiresAt: new Date(Date.now() - 3600000) // 1 hour ago (expired)
      } as any);

      const request = new Request('http://localhost:3000/api/invitations/token123/accept', {
        method: 'POST'
      });

      const response = await POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('INVITE_EXPIRED');
    });

    it('returns 404 for non-existent token', async () => {
      // Mock invitation not found
      const { prisma } = await import('@/lib/prisma');
      vi.mocked(prisma.invitation.findUnique).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/invitations/invalid/accept', {
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

      const request = new Request('http://localhost:3000/api/invitations/token123/accept', {
        method: 'POST'
      });

      await expect(POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      })).rejects.toThrow('UNAUTHORIZED');
    });

    it('requires user email in session', async () => {
      // Mock session without email
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValueOnce({ 
        user: { id: 'user1' } // No email
      });

      const request = new Request('http://localhost:3000/api/invitations/token123/accept', {
        method: 'POST'
      });

      const response = await POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('EMAIL_REQUIRED');
    });

    it('creates membership for new users', async () => {
      const request = new Request('http://localhost:3000/api/invitations/token123/accept', {
        method: 'POST'
      });

      await POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      });

      const { prisma } = await import('@/lib/prisma');
      expect(vi.mocked(prisma.membership.upsert)).toHaveBeenCalledWith({
        where: { 
          userId_organizationId: { 
            userId: 'user1', 
            organizationId: 'org1' 
          } 
        },
        update: { role: 'EDITOR' },
        create: { 
          userId: 'user1', 
          organizationId: 'org1', 
          role: 'EDITOR' 
        }
      });
    });

    it('updates existing membership role', async () => {
      // Test that upsert updates existing membership
      const request = new Request('http://localhost:3000/api/invitations/token123/accept', {
        method: 'POST'
      });

      await POST(request, { 
        params: Promise.resolve({ token: 'token123' }) 
      });

      const { prisma } = await import('@/lib/prisma');
      expect(vi.mocked(prisma.membership.upsert)).toHaveBeenCalled();
    });
  });
});
