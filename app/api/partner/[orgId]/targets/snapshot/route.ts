import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/rbac';
import { getPartnerTargets, computeProgress, createTargetSnapshot } from '@/lib/partner/targets';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { userId } = await requireOrgRole(orgId, 'ADMIN');
    
    // Get current targets
    const targets = await getPartnerTargets(orgId);
    
    // Get current year or allow year override from request
    const body = await request.json().catch(() => ({}));
    const year = body.year || new Date().getFullYear();
    
    // Validate year
    if (typeof year !== 'number' || year < 2000 || year > new Date().getFullYear() + 1) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      );
    }
    
    // Compute current progress
    const progress = await computeProgress(orgId, year, targets);
    
    // Create snapshot
    await createTargetSnapshot(orgId, progress);
    
    return NextResponse.json({
      success: true,
      message: 'Target snapshot created successfully',
      snapshot: {
        organizationId: orgId,
        year,
        createdAt: new Date().toISOString(),
        progress,
        targets
      }
    });
  } catch (error: any) {
    console.error('POST /api/partner/[orgId]/targets/snapshot error:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('permission')) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }
    
    if (error.message?.includes('Failed to compute')) {
      return NextResponse.json(
        { error: 'Unable to compute progress metrics' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create target snapshot' },
      { status: 500 }
    );
  }
}
