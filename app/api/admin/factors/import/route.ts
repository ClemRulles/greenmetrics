import { NextResponse } from 'next/server';
import { FactorImportPayload } from '@/lib/validators/factors';
import { importFactors } from '@/lib/factors/import';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withRequestId } from '@/lib/sec/headers';
import { requireUser } from '@/lib/rbac/policy';

export async function POST(req: Request) {
  if ((process.env.FEATURE_FACTORS_WRITE || 'true') !== 'true') {
    return NextResponse.json({ error: 'DISABLED' }, { status: 403 });
  }
  
  const session = await getServerSession(authOptions);
  const userId = requireUser(session);
  
  // TODO: Implement platform-level admin check
  // For now, require any authenticated user (will add platform admin org check later)
  // await requireAdminForOrg(userId, process.env.PLATFORM_ORG_ID || 'platform');

  const body = await req.json();
  const parsed = FactorImportPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ 
      error: 'VALIDATION', 
      detail: parsed.error.flatten() 
    }, { status: 422 });
  }

  try {
    const result = await importFactors(parsed.data, userId);
    return withRequestId(NextResponse.json({ data: result }, { status: 200 }), req);
  } catch (error: unknown) {
    interface ErrorWithStatus extends Error {
      status?: number;
    }
    
    const errorWithStatus = error as ErrorWithStatus;
    if (errorWithStatus.status) {
      return NextResponse.json({ 
        error: errorWithStatus.message 
      }, { status: errorWithStatus.status });
    }
    throw error;
  }
}
