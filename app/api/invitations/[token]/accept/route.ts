import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireUser } from '@/lib/rbac/policy';
import { acceptInvitation } from '@/lib/invitations';

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = requireUser(session);
  const { token } = await params;
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'EMAIL_REQUIRED' }, { status: 400 });
  }

  try {
    const result = await acceptInvitation({ 
      token, 
      userId, 
      userEmail: session.user.email 
    });
    
    return NextResponse.json({ 
      data: { 
        role: result.role,
        orgId: result.orgId 
      } 
    }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'ERROR';
    
    if (message === 'INVITE_NOT_FOUND') {
      return NextResponse.json({ error: 'INVITE_NOT_FOUND' }, { status: 404 });
    }
    if (message === 'INVITE_EXPIRED') {
      return NextResponse.json({ error: 'INVITE_EXPIRED' }, { status: 400 });
    }
    if (message === 'EMAIL_MISMATCH') {
      return NextResponse.json({ error: 'EMAIL_MISMATCH' }, { status: 403 });
    }
    
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
