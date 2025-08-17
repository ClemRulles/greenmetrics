import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    membership: { 
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.userId_organizationId.userId === 'user1' && 
            where.userId_organizationId.organizationId === 'org1') {
          return { role: 'EDITOR' };
        }
        if (where.userId_organizationId.userId === 'admin1' && 
            where.userId_organizationId.organizationId === 'org1') {
          return { role: 'ADMIN' };
        }
        return null;
      })
    },
    report: { 
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id === 'report1') {
          return { organizationId: 'org1' };
        }
        return null;
      })
    }
  }
}));

import { 
  userOrgRole, 
  atLeast, 
  canCompute, 
  canExport, 
  requireOrgRole,
  requireUser 
} from '@/lib/rbac/policy';

describe('RBAC Policy', () => {
  describe('role ranking', () => {
    it('correctly ranks roles in hierarchy', () => {
      expect(atLeast('OWNER', 'ADMIN')).toBe(true);
      expect(atLeast('ADMIN', 'EDITOR')).toBe(true);
      expect(atLeast('EDITOR', 'VIEWER')).toBe(true);
      expect(atLeast('VIEWER', 'VIEWER')).toBe(true);
    });

    it('rejects insufficient roles', () => {
      expect(atLeast('VIEWER', 'EDITOR')).toBe(false);
      expect(atLeast('EDITOR', 'ADMIN')).toBe(false);
      expect(atLeast('ADMIN', 'OWNER')).toBe(false);
    });
  });

  describe('userOrgRole', () => {
    it('returns user role in organization', async () => {
      const role = await userOrgRole('user1', 'org1');
      expect(role).toBe('EDITOR');
    });

    it('returns null for non-member', async () => {
      const role = await userOrgRole('nonmember', 'org1');
      expect(role).toBe(null);
    });
  });

  describe('requireOrgRole', () => {
    it('passes for sufficient role', async () => {
      const role = await requireOrgRole('user1', 'org1', 'EDITOR');
      expect(role).toBe('EDITOR');
    });

    it('throws FORBIDDEN for insufficient role', async () => {
      await expect(requireOrgRole('user1', 'org1', 'ADMIN'))
        .rejects.toHaveProperty('message', 'FORBIDDEN');
    });

    it('throws FORBIDDEN for non-member', async () => {
      await expect(requireOrgRole('nonmember', 'org1', 'VIEWER'))
        .rejects.toHaveProperty('message', 'FORBIDDEN');
    });
  });

  describe('requireUser', () => {
    it('returns userId for valid session', () => {
      const session = { user: { id: 'user123' } };
      const userId = requireUser(session);
      expect(userId).toBe('user123');
    });

    it('throws UNAUTHORIZED for missing session', () => {
      expect(() => requireUser(null))
        .toThrow('UNAUTHORIZED');
    });

    it('throws UNAUTHORIZED for missing user', () => {
      expect(() => requireUser({}))
        .toThrow('UNAUTHORIZED');
    });
  });

  describe('report permissions', () => {
    it('canCompute requires EDITOR+', async () => {
      const canComputeEditor = await canCompute('report1', 'user1');
      expect(canComputeEditor).toBe(true);

      const canComputeAdmin = await canCompute('report1', 'admin1');
      expect(canComputeAdmin).toBe(true);
    });

    it('canExport allows VIEWER+', async () => {
      const canExportEditor = await canExport('report1', 'user1');
      expect(canExportEditor).toBe(true);

      const canExportAdmin = await canExport('report1', 'admin1');
      expect(canExportAdmin).toBe(true);
    });

    it('denies access for non-members', async () => {
      const canComputeNonMember = await canCompute('report1', 'nonmember');
      expect(canComputeNonMember).toBe(false);

      const canExportNonMember = await canExport('report1', 'nonmember');
      expect(canExportNonMember).toBe(false);
    });

    it('denies access for non-existent reports', async () => {
      const canComputeNoReport = await canCompute('nonexistent', 'user1');
      expect(canComputeNoReport).toBe(false);

      const canExportNoReport = await canExport('nonexistent', 'user1');
      expect(canExportNoReport).toBe(false);
    });
  });
});
