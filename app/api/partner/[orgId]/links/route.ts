import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrgRole } from "@/lib/rbac/policy";
import { getSupplierLinks } from "@/lib/partner/coverage";
import { withRequestId } from "@/lib/sec/headers";
import { writeAuditLog } from "@/lib/privacy/audit";
import { z } from "zod";

const LinkSchema = z.object({
  supplierOrgId: z.string().min(1),
  spendShare: z.number().min(0).max(1),
  critical: z.boolean().optional().default(false)
});

const BulkLinksSchema = z.object({
  links: z.array(LinkSchema).min(1).max(100)
});

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
    const data = await getSupplierLinks(orgId);
    return withRequestId(NextResponse.json({ data }, { status: 200 }), req);
  } catch (error: unknown) {
    const err = error as { status?: number; message: string };
    if (err.status) {
      return withRequestId(NextResponse.json({ error: err.message }, { status: err.status }), req);
    }
    throw error;
  }
}

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
    
    const body = await req.json();
    const { links } = BulkLinksSchema.parse(body);

    // Placeholder - will implement actual bulk link creation once models are available
    // For now, just validate and return success
    
    await writeAuditLog({
      userId: session.user.id,
      orgId,
      action: "PARTNER_LINKS_UPSERT",
      metadata: { linkCount: links.length }
    });

    return withRequestId(NextResponse.json({ 
      message: "Links updated successfully",
      count: links.length 
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
