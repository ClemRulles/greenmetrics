import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrCreateCachedPdf } from '@/lib/pdf/cache';
import { makeSignedUrlParams } from '@/lib/pdf/sign';
import { storage } from '@/lib/storage';
import { requesterId, consume } from '@/lib/sec/rate-limit';
import { withRequestId } from '@/lib/sec/headers';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return withRequestId(NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }), req);
  }

  // Apply rate limiting
  const rid = requesterId(req, session?.user?.id);
  const token = consume('api', rid);
  if (!token.ok) {
    return withRequestId(
      NextResponse.json({ error: 'RATE_LIMITED', detail: 'Too many requests' }, { status: 429 }),
      req
    );
  }

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, name: true, organizationId: true }
  });
  if (!report) {
    return withRequestId(NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }), req);
  }

  // Optional: ensure membership to org
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: report.organizationId },
    select: { id: true }
  });
  if (!membership) {
    return withRequestId(NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }), req);
  }

  const url = new URL(req.url);
  const useCache = url.searchParams.get('cache') !== 'false';

  if (useCache) {
    // Redirect to cached signed URL
    const { asset } = await getOrCreateCachedPdf(report.id);
    const { exp, sig } = makeSignedUrlParams(asset.id);
    const signedUrl = `/api/exports/${asset.id}/download?exp=${exp}&sig=${sig}`;
    return withRequestId(NextResponse.redirect(new URL(signedUrl, req.url)), req);
  } else {
    // Direct streaming (legacy support)
    const { asset } = await getOrCreateCachedPdf(report.id);
    const drv = storage();
    const buffer = await drv.get(asset.storageKey);
    const fileName = `${report.name.replace(/\s+/g, '_')}.pdf`;
    
    const response = new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
    return withRequestId(response as NextResponse, req);
  }
}
