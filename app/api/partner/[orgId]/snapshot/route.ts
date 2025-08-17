import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrgRole } from "@/lib/rbac/policy";
import { createCoverageSnapshot } from "@/lib/partner/coverage";
import { withRequestId } from "@/lib/sec/headers";
import { writeAuditLog } from "@/lib/privacy/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await requireOrgRole(session.user.id, orgId, "ADMIN");
    const snapshot = await createCoverageSnapshot(orgId);
    
    await writeAuditLog({
      userId: session.user.id,
      orgId,
      action: "PARTNER_COVERAGE_SNAPSHOT_CREATE",
      targetId: snapshot.id
    });

    return withRequestId(NextResponse.json({ data: snapshot }, { status: 201 }), req);
  } catch (error: unknown) {
    const err = error as { status?: number; message: string };
    if (err.status) {
      return withRequestId(NextResponse.json({ error: err.message }, { status: err.status }), req);
    }
    throw error;
  }
}
