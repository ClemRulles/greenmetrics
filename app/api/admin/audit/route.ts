import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireUser, requireAdminForOrg } from '@/lib/rbac/policy';
import { withRequestId } from '@/lib/sec/headers';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = requireUser(session);

  const url = new URL(req.url);
  const orgId = url.searchParams.get('orgId');
  
  if (!orgId) {
    return NextResponse.json({ 
      error: 'VALIDATION', 
      detail: 'orgId parameter is required' 
    }, { status: 422 });
  }

  // Require ADMIN role for the organization
  await requireAdminForOrg(userId, orgId);

  // Parse query parameters
  const action = url.searchParams.get('action') || undefined;
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const limitParam = url.searchParams.get('limit');
  
  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;
  const take = Math.min(100, Number(limitParam || 50));

  // Build query filters
  interface QueryWhere {
    orgId: string;
    action?: string;
    createdAt?: {
      gte?: Date;
      lte?: Date;
    };
  }
  
  const where: QueryWhere = { orgId };
  if (action) {
    where.action = action;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  try {
    const data = await prisma.auditLog.findMany({ 
      where, 
      orderBy: { createdAt: 'desc' }, 
      take,
      select: {
        id: true,
        userId: true,
        orgId: true,
        action: true,
        targetId: true,
        metadata: true,
        requestId: true,
        createdAt: true
      }
    });

    return withRequestId(NextResponse.json({ 
      data,
      count: data.length,
      filters: { orgId, action, from, to, limit: take }
    }, { status: 200 }), req);
    
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
