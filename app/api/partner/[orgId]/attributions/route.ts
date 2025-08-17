import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAttributedForPartner } from '@/lib/partner/attribution';
import { requesterId, consume } from '@/lib/sec/rate-limit';
import { withRequestId } from '@/lib/sec/headers';
import { z } from 'zod';

// Schema for attribution query parameters
const attributionQuerySchema = z.object({
  year: z.string().optional().refine((val) => {
    if (!val) return true;
    const year = parseInt(val, 10);
    return year >= 2020 && year <= 2030;
  }, 'Year must be between 2020 and 2030')
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
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
        NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }),
        request
      );
    }

    const { orgId } = await params;
    
    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = {
      year: url.searchParams.get('year')
    };
    
    const parsed = attributionQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return withRequestId(
        NextResponse.json(
          { 
            error: 'Invalid query parameters',
            issues: parsed.error.issues
          },
          { status: 400 }
        ),
        request
      );
    }

    // Default to current year if not specified
    const year = parsed.data.year ? parseInt(parsed.data.year, 10) : new Date().getFullYear();

    // TODO: Add authorization check - verify user can access this partner organization
    // This would typically check organization membership or RBAC permissions

    // Get attributed emissions for the partner
    const attribution = await getAttributedForPartner(orgId, year);

    return withRequestId(
      NextResponse.json({
        success: true,
        attribution
      }),
      request
    );

  } catch (error) {
    console.error('[Partner Attribution] Error:', error);
    
    return withRequestId(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      request
    );
  }
}
