import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activitiesBatchSchema } from '@/lib/validation';
import { requireOrgRole } from '@/lib/authz';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, organizationId: true },
  });
  if (!report) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const items = await prisma.activityRecord.findMany({
    where: { reportId: report.id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ data: items });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, organizationId: true },
  });
  if (!report) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  try {
    await requireOrgRole(session.user.id, report.organizationId, 'EDITOR');
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = activitiesBatchSchema.safeParse({ ...json, reportId: report.id });
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION', issues: parsed.error.issues }, { status: 422 });

  const created = await prisma.$transaction(
    parsed.data.items.map((it) =>
      prisma.activityRecord.create({ data: { reportId: report.id, ...it } })
    )
  );
  return NextResponse.json({ data: created }, { status: 201 });
}
