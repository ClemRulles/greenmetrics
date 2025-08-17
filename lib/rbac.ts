import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type Role = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export function hasAnyRole(session: Session | null, roles: Role[]) {
  // Minimal placeholder: session existence required for now.
  // Later we'll load memberships from DB per organization.
  return Boolean(session?.user?.id) && roles.length > 0;
}

export function requireAuth(session: Session | null) {
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }
}

export async function requireOrgRole(orgId: string, minRole: Role) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('RBAC: Not authenticated');
  }

  // For now, return the user ID for API access
  // TODO: In a real implementation, check organization membership and role
  return { userId: session.user.id };
}
