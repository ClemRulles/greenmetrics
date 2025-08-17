import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrgRole } from "@/lib/rbac/policy";
import { getCoverage } from "@/lib/partner/coverage";
import { withRequestId } from "@/lib/sec/headers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await requireOrgRole(session.user.id, orgId, "EDITOR");
    const data = await getCoverage(orgId);
    return withRequestId(NextResponse.json({ data }, { status: 200 }), req);
  } catch (error: unknown) {
    const err = error as { status?: number; message: string };
    if (err.status) {
      return withRequestId(NextResponse.json({ error: err.message }, { status: err.status }), req);
    }
    throw error;
  }
}
