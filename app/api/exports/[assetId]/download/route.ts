import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';
import { verifySignature } from '@/lib/pdf/sign';
import { requesterId, consume } from '@/lib/sec/rate-limit';
import { withRequestId } from '@/lib/sec/headers';

export async function GET(req: Request, context: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await context.params;
  const url = new URL(req.url);
  const exp = Number(url.searchParams.get('exp') || 0);
  const sig = url.searchParams.get('sig') || '';

  // Apply rate limiting (unauthenticated, so use IP)
  const rid = requesterId(req, null);
  const token = consume('api', rid);
  if (!token.ok) {
    return withRequestId(
      NextResponse.json({ error: 'RATE_LIMITED', detail: 'Too many requests' }, { status: 429 }),
      req
    );
  }

  if (!verifySignature(assetId, exp, sig)) {
    return withRequestId(NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 403 }), req);
  }

  const asset = await prisma.exportAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return withRequestId(NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }), req);
  }

  const drv = storage();
  const buf = await drv.get(asset.storageKey);

  const response = new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': asset.contentType,
      'Content-Length': String(buf.byteLength),
      'Content-Disposition': `attachment; filename="report-${asset.reportId}.pdf"`,
      'Cache-Control': 'no-store'
    }
  });
  return withRequestId(response, req);
}
