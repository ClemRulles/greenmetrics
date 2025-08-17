import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/rbac';
import { getEvidenceSummary } from '@/lib/proofs/summary';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const yearParam = searchParams.get('year');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Default to current year if not specified
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear();

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    // Check user permissions - suppliers can view their own summary
    await requireOrgRole(orgId, 'VIEWER');

    // Get evidence summary (privacy-first - no file paths or names)
    const summary = await getEvidenceSummary(orgId, year);

    return NextResponse.json({ 
      summary,
      // Additional metadata for API consumers
      meta: {
        generatedAt: new Date().toISOString(),
        orgId,
        year,
      }
    });

  } catch (error) {
    console.error('Evidence summary error:', error);
    
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    if (error instanceof Error && error.message.includes('authenticated')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
