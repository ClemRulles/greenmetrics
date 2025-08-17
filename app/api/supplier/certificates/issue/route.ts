import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { issueCertificate } from '@/lib/certificates/issue';
import { requesterId, consume } from '@/lib/sec/rate-limit';
import { withRequestId } from '@/lib/sec/headers';

// Schema for certificate issuance request
const issueCertificateSchema = z.object({
  supplierOrgId: z.string().min(1, 'Supplier organization ID is required'),
  periodStart: z.string().datetime('Invalid period start date'),
  periodEnd: z.string().datetime('Invalid period end date'),
  unitLabel: z.string().min(1, 'Unit label is required')
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return withRequestId(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        request
      );
    }

    // Rate limiting
    const rid = requesterId(request, session.user.id);
    const rateLimitResult = consume('api', rid);
    if (!rateLimitResult.ok) {
      return withRequestId(
        NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        ),
        request
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = issueCertificateSchema.safeParse(body);
    
    if (!parsed.success) {
      return withRequestId(
        NextResponse.json(
          {
            error: 'Invalid request data',
            issues: parsed.error.issues
          },
          { status: 400 }
        ),
        request
      );
    }

    const { supplierOrgId, periodStart, periodEnd, unitLabel } = parsed.data;

    // Issue the certificate
    const result = await issueCertificate(supplierOrgId, {
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      unitLabel
    });

    return withRequestId(
      NextResponse.json({
        success: true,
        certificate: {
          id: result.id,
          publicId: result.publicId,
          publicUrl: result.publicUrl,
          qrPngDataUrl: result.qrPngDataUrl
        }
      }),
      request
    );

  } catch (error) {
    console.error('[Certificate Issue] Error:', error);
    
    return withRequestId(
      NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
      request
    );
  }
}
