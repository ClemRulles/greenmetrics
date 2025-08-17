import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeReport } from '@/lib/calc';
import { requireUser, canCompute } from '@/lib/rbac/policy';
import { requesterId, consume } from '@/lib/sec/rate-limit';
import { withRequestId } from '@/lib/sec/headers';
import { trackServerEvent } from '@/lib/analytics';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = requireUser(session);

  // Apply rate limiting
  const rid = requesterId(req, userId);
  const token = consume('api', rid);
  if (!token.ok) {
    return withRequestId(
      NextResponse.json({ error: 'RATE_LIMITED', detail: 'Too many requests' }, { status: 429 }),
      req
    );
  }

  const { id } = await params;

  // Check if user can compute this report (requires EDITOR+ in report's org)
  if (!(await canCompute(id, userId))) {
    return withRequestId(NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }), req);
  }

  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, organizationId: true, periodEnd: true },
  });
  if (!report) {
    return withRequestId(NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }), req);
  }

  try {
    const { totals, traceCount, geography, factorsVersion, snapshotted } = await computeReport(report.id);
    
    // Track analytics after successful compute
    await trackServerEvent({
      req,
      userId: userId,
      event: 'report_computed',
      properties: { 
        reportId: report.id, 
        traceCount, 
        factorsVersion, 
        geography 
      }
    });

    return withRequestId(NextResponse.json({ 
      data: { totals, traceCount, geography, factorsVersion, snapshotted } 
    }, { status: 200 }), req);
  } catch (error: unknown) {
    interface ErrorWithStatus extends Error {
      status?: number;
    }
    
    const errorWithStatus = error as ErrorWithStatus;
    if (errorWithStatus.status) {
      return withRequestId(NextResponse.json({ 
        error: errorWithStatus.message 
      }, { status: errorWithStatus.status }), req);
    }
    throw error;
  }
}
