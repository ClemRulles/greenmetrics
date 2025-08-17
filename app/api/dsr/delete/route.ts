import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { anonymizeUser } from '@/lib/privacy/dsr';
import { writeAuditLog } from '@/lib/privacy/audit';
import { withRequestId, getRequestId } from '@/lib/sec/headers';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const result = await anonymizeUser(session.user.id);
    const res = NextResponse.json({ 
      data: { anonymized: true, email: result.email } 
    }, { status: 200 });

    const rid = getRequestId(req.headers.get('x-request-id'));
    await writeAuditLog({ 
      userId: session.user.id, 
      action: 'DSR_DELETE', 
      requestId: rid 
    });

    return withRequestId(res, req);
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
