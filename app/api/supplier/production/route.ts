import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { withRequestId } from '@/lib/sec/headers';

const ProductionStatsBody = z.object({
  organizationId: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  units: z.number().nonnegative(),
  unitLabel: z.string().min(1).max(100)
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const body = ProductionStatsBody.parse(rawBody);

    // Verify user has EDITOR role for this organization
    await requireOrgRole(body.organizationId, 'EDITOR');

    // Upsert production statistics
    const productionStat = await prisma.productionStat.upsert({
      where: {
        organizationId_year: {
          organizationId: body.organizationId,
          year: body.year
        }
      },
      update: {
        units: body.units,
        unitLabel: body.unitLabel,
        updatedAt: new Date()
      },
      create: {
        organizationId: body.organizationId,
        year: body.year,
        units: body.units,
        unitLabel: body.unitLabel
      }
    });

    const response = {
      success: true,
      productionStat: {
        id: productionStat.id,
        organizationId: productionStat.organizationId,
        year: productionStat.year,
        units: Number(productionStat.units),
        unitLabel: productionStat.unitLabel,
        updatedAt: productionStat.updatedAt.toISOString()
      }
    };

    return withRequestId(NextResponse.json(response), request);

  } catch (error) {
    console.error('Production stats upsert error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('RBAC')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const year = searchParams.get('year');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId parameter is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    await requireOrgRole(organizationId, 'VIEWER');

    const where = year 
      ? { organizationId, year: parseInt(year) }
      : { organizationId };

    const productionStats = await prisma.productionStat.findMany({
      where,
      orderBy: { year: 'desc' },
      select: {
        id: true,
        year: true,
        units: true,
        unitLabel: true,
        updatedAt: true
      }
    });

    const response = {
      success: true,
      productionStats: productionStats.map(stat => ({
        id: stat.id,
        year: stat.year,
        units: Number(stat.units),
        unitLabel: stat.unitLabel,
        updatedAt: stat.updatedAt.toISOString()
      }))
    };

    return withRequestId(NextResponse.json(response), request);

  } catch (error) {
    console.error('Production stats fetch error:', error);

    if (error instanceof Error && error.message.includes('RBAC')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
