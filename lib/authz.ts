import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

const ROLE_ORDER: Record<Role, number> = { VIEWER: 1, EDITOR: 2, ADMIN: 3, OWNER: 4 };

export async function requireOrgRole(userId: string, organizationId: string, minRole: Role) {
  const m = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { role: true },
  });
  if (!m || ROLE_ORDER[m.role] < ROLE_ORDER[minRole]) {
    throw new Error('FORBIDDEN');
  }
}
