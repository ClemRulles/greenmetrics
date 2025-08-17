import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireUser, requireOrgRole } from '@/lib/rbac/policy';
import { revokeInvitation } from '@/lib/invitations';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = requireUser(session);
  const { token } = await params;

  // First get the invitation to check organization
  const inv = await prisma.invitation.findUnique({ 
    where: { token }, 
    select: { orgId: true } 
  });
  
  if (!inv) {
    return NextResponse.json({ error: 'INVITE_NOT_FOUND' }, { status: 404 });
  }

  // Require ADMIN role for the organization
  await requireOrgRole(userId, inv.orgId, 'ADMIN');

  try {
    const result = await revokeInvitation({ token, byUserId: userId });
    return NextResponse.json({ 
      data: { 
        id: result.id,
        revoked: true 
      } 
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    if (errorMessage === 'INVITE_NOT_FOUND') {
      return NextResponse.json({ error: 'INVITE_NOT_FOUND' }, { status: 404 });
    }
    throw error;
  }
}
