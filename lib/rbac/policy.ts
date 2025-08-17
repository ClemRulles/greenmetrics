import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export type Role = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

// Role hierarchy ranking for authorization checks
const rank: Record<Role, number> = { 
  OWNER: 3, 
  ADMIN: 2, 
  EDITOR: 1, 
  VIEWER: 0 
};

/**
 * Get user's role in an organization
 */
export async function userOrgRole(userId: string, orgId: string): Promise<Role | null> {
  const membership = await prisma.membership.findUnique({
    where: { 
      userId_organizationId: { 
        userId, 
        organizationId: orgId 
      } 
    },
    select: { role: true }
  });
  return (membership?.role as Role) ?? null;
}

// Custom error type for RBAC operations
interface RBACError extends Error {
  status: number;
}

/**
 * Check if current role meets minimum required role
 */
export function atLeast(current: Role, required: Role): boolean {
  return rank[current] >= rank[required];
}

/**
 * Require user to have minimum role in organization, throws if insufficient
 */
export async function requireOrgRole(
  userId: string, 
  orgId: string, 
  required: Role
): Promise<Role> {
  const userRole = await userOrgRole(userId, orgId);
  if (!userRole || !atLeast(userRole, required)) {
    const error = new Error('FORBIDDEN') as RBACError;
    error.status = 403;
    throw error;
  }
  return userRole;
}

/**
 * Require authenticated session, throws if missing
 */
export function requireUser(session: Session | null): string {
  if (!session?.user?.id) {
    const error = new Error('UNAUTHORIZED') as RBACError;
    error.status = 401;
    throw error;
  }
  return session.user.id;
}

/**
 * Get organization ID for a report
 */
export async function reportOrgId(reportId: string): Promise<string | null> {
  const report = await prisma.report.findUnique({ 
    where: { id: reportId }, 
    select: { organizationId: true } 
  });
  return report?.organizationId ?? null;
}

/**
 * Check if user can compute reports (requires EDITOR+)
 */
export async function canCompute(reportId: string, userId: string): Promise<boolean> {
  const orgId = await reportOrgId(reportId);
  if (!orgId) return false;
  
  const role = await userOrgRole(userId, orgId);
  return !!role && atLeast(role, 'EDITOR');
}

/**
 * Check if user can export reports (requires VIEWER+)
 */
export async function canExport(reportId: string, userId: string): Promise<boolean> {
  const orgId = await reportOrgId(reportId);
  if (!orgId) return false;
  
  const role = await userOrgRole(userId, orgId);
  return !!role && atLeast(role, 'VIEWER');
}

/**
 * Require admin role for organization-level factor operations
 */
export async function requireAdminForOrg(userId: string, orgId: string): Promise<Role> {
  return requireOrgRole(userId, orgId, 'ADMIN');
}
