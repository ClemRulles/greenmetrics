import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireOrgRole } from '@/lib/rbac/policy';
import { createCoverageSnapshot } from '@/lib/sponsor/coverage';
import { withRequestId } from '@/lib/sec/headers';
import { writeAuditLog } from '@/lib/privacy/audit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    // Require ADMIN+ role for creating snapshots
    await requireOrgRole(session.user.id, orgId, 'ADMIN');

    const result = await createCoverageSnapshot(orgId);

    // Audit log the snapshot creation
    await writeAuditLog({
      userId: session.user.id,
      orgId: orgId,
      action: 'COVERAGE_SNAPSHOT_CREATE',
      targetId: result.id,
      metadata: {},
      requestId: req.headers.get('x-request-id') || undefined
    });

    return withRequestId(NextResponse.json({ data: result }, { status: 201 }), req);
  } catch (error: unknown) {
    interface ErrorWithStatus extends Error {
      status?: number;
    }
    
    const errorWithStatus = error as ErrorWithStatus;
    if (errorWithStatus.status) {
      return withRequestId(NextResponse.json({ 
        error: errorWithStatus.message 
      }, { status: errorWithStatus.status }), req);
    }
    throw error;
  }
}
