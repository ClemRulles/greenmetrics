import { NextResponse } from 'next/server';
import { OverridePayload } from '@/lib/validators/factors';
import { upsertOrgOverride } from '@/lib/factors/override';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireUser, requireAdminForOrg } from '@/lib/rbac/policy';

export async function POST(
  req: Request, 
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  
  const session = await getServerSession(authOptions);
  const userId = requireUser(session);
  
  // Require ADMIN role for the organization
  await requireAdminForOrg(userId, orgId);

  const body = await req.json();
  const parsed = OverridePayload.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 422 });
  }

  try {
    const o = parsed.data;
    const rec = await upsertOrgOverride({
      orgId: orgId,
      kind: o.kind,
      unit: o.unit,
      geography: o.geography || null,
      validFrom: new Date(o.validFrom as string),
      validTo: o.validTo ? new Date(o.validTo as string) : null,
      factorKgCO2ePerUnit: o.factorKgCO2ePerUnit,
      version: o.version,
      reason: o.reason,
      userId: userId
    });

    return NextResponse.json({ data: { id: rec.id, version: rec.version } }, { status: 200 });
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
