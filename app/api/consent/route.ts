import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrgRole } from "@/lib/rbac/policy";
import { acceptConsent, rejectConsent } from "@/lib/sharing/consent";
import { withRequestId } from "@/lib/sec/headers";
import { z } from "zod";

const ConsentSchema = z.object({
  partnerOrgId: z.string().min(1),
  action: z.enum(["accept", "reject"])
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { partnerOrgId, action } = ConsentSchema.parse(body);

    // Determine the supplier org from session user's membership
    // This is a simplified implementation - in practice, you'd need to check
    // which organization the user is consenting for
    const url = new URL(req.url);
    const supplierOrgId = url.searchParams.get('orgId');
    
    if (!supplierOrgId) {
      return withRequestId(NextResponse.json({ 
        error: "Missing orgId parameter" 
      }, { status: 400 }), req);
    }

    // Verify user can act for the supplier organization
    await requireOrgRole(session.user.id, supplierOrgId, "ADMIN");

    if (action === "accept") {
      await acceptConsent(supplierOrgId, partnerOrgId, session.user.id);
    } else {
      await rejectConsent(supplierOrgId, partnerOrgId, session.user.id);
    }

    return withRequestId(NextResponse.json({ 
      message: `Consent ${action}ed successfully`,
      status: action === "accept" ? "ACCEPTED" : "REJECTED"
    }, { status: 200 }), req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return withRequestId(NextResponse.json({ 
        error: "VALIDATION_ERROR", 
        details: error.errors 
      }, { status: 400 }), req);
    }
    
    const err = error as { status?: number; message: string };
    if (err.status) {
      return withRequestId(NextResponse.json({ error: err.message }, { status: err.status }), req);
    }
    throw error;
  }
}

// Legacy general consent endpoint for backward compatibility
export async function PATCH(req: Request) {
  const { value } = await req.json().catch(() => ({ value: 'rejected' }));
  const v = value === 'accepted' ? 'accepted' : 'rejected';
  const res = NextResponse.json({ ok: true, value: v }, { status: 200 });
  res.headers.append('Set-Cookie', `consent=${v}; Path=/; Max-Age=${60*60*24*365}; SameSite=Lax`);
  return res;
}
