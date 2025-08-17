import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildReportPayload } from '@/lib/pdf/buildReportPayload';
import { getOrCreateCachedPdf } from '@/lib/pdf/cache';
import { makeSignedUrlParams } from '@/lib/pdf/sign';
import { requireUser, canExport } from '@/lib/rbac/policy';
import { requesterId, consume } from '@/lib/sec/rate-limit';
import { withRequestId } from '@/lib/sec/headers';
import { trackServerEvent } from '@/lib/analytics';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
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

  // Check if user can export this report (requires VIEWER+ in report's org)
  if (!(await canExport(id, userId))) {
    return withRequestId(NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }), req);
  }

  const r = await prisma.report.findUnique({
    where: { id },
    select: { id: true, name: true, framework: true, frameworkVersion: true, language: true, organizationId: true }
  });
  if (!r) {
    return withRequestId(NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }), req);
  }

  try {
    // Ensure compute side-effects & collect versions
    const data = await buildReportPayload(r.id);

    const { asset } = await getOrCreateCachedPdf(r.id);
    const { exp, sig } = makeSignedUrlParams(asset.id);
    const pdfUrl = `/api/exports/${asset.id}/download?exp=${exp}&sig=${sig}`;

    // Track analytics after successful export
    await trackServerEvent({
      req,
      userId: userId,
      event: 'report_exported',
      properties: { 
        reportId: r.id, 
        assetId: asset.id, 
        bytes: asset.bytes 
      }
    });

    return withRequestId(NextResponse.json({
      pdfUrl,
      framework: data.report.framework,
      frameworkVersion: data.report.frameworkVersion,
      factorsVersion: data.factorsVersion,
      language: data.report.language,
      bytes: asset.bytes
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
