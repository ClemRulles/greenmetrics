import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/rbac';
import { getPartnerTargets, updatePartnerTargets, validateTargets } from '@/lib/partner/targets';
import { z } from 'zod';

const TargetsSchema = z.object({
  coveragePct: z.number().min(0).max(100),
  dqsMin: z.enum(['A', 'B', 'C']),
  targetTons: z.number().min(0),
  baselineYear: z.number().min(2000).max(new Date().getFullYear())
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { userId } = await requireOrgRole(orgId, 'VIEWER');
    
    const targets = await getPartnerTargets(orgId);
    
    return NextResponse.json({
      success: true,
      targets
    });
  } catch (error: any) {
    console.error('GET /api/partner/[orgId]/targets error:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('permission')) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get partner targets' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { userId } = await requireOrgRole(orgId, 'ADMIN');
    
    const body = await request.json();
    
    // Validate request body
    const validation = TargetsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }
    
    const targets = validation.data;
    
    // Additional business logic validation
    const errors = validateTargets(targets);
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: errors.map(error => ({ message: error }))
        },
        { status: 400 }
      );
    }
    
    // Update targets
    await updatePartnerTargets(orgId, targets);
    
    return NextResponse.json({
      success: true,
      message: 'Partner targets updated successfully',
      targets
    });
  } catch (error: any) {
    console.error('POST /api/partner/[orgId]/targets error:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('permission')) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }
    
    if (error.message?.includes('Validation')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update partner targets' },
      { status: 500 }
    );
  }
}
