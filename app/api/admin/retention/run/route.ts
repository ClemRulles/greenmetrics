import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runRetentionSweep } from '@/lib/privacy/retention';
import { writeAuditLog } from '@/lib/privacy/audit';
import { withRequestId, getRequestId } from '@/lib/sec/headers';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // Require ADMIN/OWNER in a follow-up PR; for now just require auth
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const result = await runRetentionSweep();
    const res = NextResponse.json({ data: result }, { status: 200 });

    const rid = getRequestId(req.headers.get('x-request-id'));
    await writeAuditLog({ 
      userId: session.user.id, 
      action: 'RETENTION_PURGE', 
      metadata: result, 
      requestId: rid 
    });

    return withRequestId(res, req);
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
