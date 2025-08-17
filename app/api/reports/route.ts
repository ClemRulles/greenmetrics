import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { reportCreateSchema } from '@/lib/validation';
import { requireOrgRole } from '@/lib/authz';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const reports = await prisma.report.findMany({
    where: { organization: { memberships: { some: { userId: session.user.id } } } },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, framework: true, language: true, periodStart: true, periodEnd: true },
  });
  return NextResponse.json({ data: reports });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = reportCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.issues }, { status: 422 });

  const { organizationId } = parsed.data;
  try {
    await requireOrgRole(session.user.id, organizationId, 'EDITOR');
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const r = await prisma.report.create({
    data: {
      ...parsed.data,
      createdByUserId: session.user.id,
      status: 'DRAFT',
    },
    select: { id: true, name: true },
  });
  return NextResponse.json({ data: r }, { status: 201 });
}
