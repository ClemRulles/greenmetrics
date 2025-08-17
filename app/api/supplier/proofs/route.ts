import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sha256Hex } from '@/lib/crypto/hash';
import { putFile, removeFile } from '@/lib/storage/files';
import { requireOrgRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { getClientIP } from '@/lib/http/request';

const ProofKindEnum = z.enum(['ELECTRICITY_BILL', 'GAS_BILL', 'FUEL_INVOICE', 'OTHER']);

const ProofMetadata = z.object({
  organizationId: z.string().min(1),
  kind: ProofKindEnum,
  periodStart: z.string().datetime(), // ISO datetime string
  periodEnd: z.string().datetime(),   // ISO datetime string
});

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const metaJson = form.get('meta') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!metaJson) {
      return NextResponse.json({ error: 'Metadata is required' }, { status: 400 });
    }

    // Parse and validate metadata
    let meta;
    try {
      meta = ProofMetadata.parse(JSON.parse(metaJson));
    } catch (error) {
      return NextResponse.json({ error: 'Invalid metadata format' }, { status: 400 });
    }

    // Check user permissions
    const { userId } = await requireOrgRole(meta.organizationId, 'EDITOR');
    const clientIP = getClientIP(req);

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 413 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `Unsupported file type: ${file.type}` 
      }, { status: 415 });
    }

    // Read file buffer and calculate hash
    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = await sha256Hex(buffer);

    // Generate storage key
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `${meta.organizationId}/${timestamp}/${sha256.slice(0, 8)}-${safeFilename}`;

    try {
      // Store file
      await putFile(storageKey, buffer);

      // Save proof record to database (if models are available)
      const proofData = {
        organizationId: meta.organizationId,
        kind: meta.kind,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        sha256Hex: sha256,
        periodStart: new Date(meta.periodStart),
        periodEnd: new Date(meta.periodEnd),
        storedAt: storageKey,
        createdBy: userId,
      };

      let proof;
      try {
        proof = await (prisma as any).proof?.create({
          data: proofData,
          select: {
            id: true,
            filename: true,
            mimeType: true,
            sizeBytes: true,
            kind: true,
            periodStart: true,
            periodEnd: true,
            createdAt: true,
          },
        });
      } catch (dbError) {
        console.log('Database not ready for proofs, file stored only:', dbError);
        // Continue without database storage for now
      }

      return NextResponse.json({
        ok: true,
        proof: proof || {
          id: `temp-${sha256.slice(0, 8)}`,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          kind: meta.kind,
          periodStart: meta.periodStart,
          periodEnd: meta.periodEnd,
          createdAt: new Date().toISOString(),
        },
        metadata: {
          sha256Hex: sha256,
          storedAt: storageKey,
        },
      });

    } catch (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ 
        error: 'Failed to store file' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Check user permissions
    await requireOrgRole(orgId, 'VIEWER');

    // Get proofs list (if database is available)
    try {
      const proofs = await (prisma as any).proof?.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          kind: true,
          periodStart: true,
          periodEnd: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to prevent large responses
      }) || [];

      return NextResponse.json({ proofs });
    } catch (dbError) {
      console.log('Database not ready for proofs listing:', dbError);
      return NextResponse.json({ proofs: [] });
    }

  } catch (error) {
    console.error('List proofs error:', error);
    
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const proofId = searchParams.get('id');

    if (!proofId) {
      return NextResponse.json({ error: 'Proof ID required' }, { status: 400 });
    }

    // Get proof details first
    let proof;
    try {
      proof = await (prisma as any).proof?.findUnique({
        where: { id: proofId },
        select: {
          id: true,
          organizationId: true,
          storedAt: true,
        },
      });
    } catch (dbError) {
      console.log('Database not ready for proof lookup:', dbError);
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    if (!proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
    }

    // Check user permissions
    await requireOrgRole(proof.organizationId, 'EDITOR');

    // Remove from storage
    try {
      await removeFile(proof.storedAt);
    } catch (storageError) {
      console.warn('Failed to remove file from storage:', storageError);
      // Continue with database deletion even if file removal fails
    }

    // Remove from database
    try {
      await (prisma as any).proof?.delete({
        where: { id: proofId },
      });
    } catch (dbError) {
      console.error('Failed to delete proof from database:', dbError);
      return NextResponse.json({ error: 'Failed to delete proof' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Delete proof error:', error);
    
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
