import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const orgs = await prisma.organization.findMany({
    where: { memberships: { some: { userId: session.user.id } } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ data: orgs });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';

  if (!name || !slug) return NextResponse.json({ error: 'VALIDATION' }, { status: 422 });

  // Create org and OWNER membership
  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      memberships: { create: { userId: session.user.id, role: 'OWNER' } },
    },
    select: { id: true, name: true, slug: true },
  });
  return NextResponse.json({ data: org }, { status: 201 });
}
