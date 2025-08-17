import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireUser, requireOrgRole } from '@/lib/rbac/policy';
import { createInvitation, listInvitations } from '@/lib/invitations';

export async function GET(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = requireUser(session);
  const { orgId } = await params;
  
  await requireOrgRole(userId, orgId, 'ADMIN');
  
  const data = await listInvitations(orgId);
  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = requireUser(session);
  const { orgId } = await params;
  
  await requireOrgRole(userId, orgId, 'ADMIN');

  const body = await req.json();
  const { email, role, locale } = body;
  
  if (!email || !role) {
    return NextResponse.json({ error: 'VALIDATION', detail: 'email and role are required' }, { status: 422 });
  }

  try {
    const result = await createInvitation({ 
      orgId, 
      creatorUserId: userId, 
      email, 
      role, 
      locale 
    });
    
    // For security, do not return the token in production
    return NextResponse.json({ 
      data: { 
        id: result.id, 
        expiresAt: result.expiresAt 
      } 
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    if (errorMessage === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'ORG_NOT_FOUND' }, { status: 404 });
    }
    throw error;
  }
}
