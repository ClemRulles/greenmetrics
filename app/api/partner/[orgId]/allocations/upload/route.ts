import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/rbac';
import { parseAllocationsCsv } from '@/lib/partner/allocationsCsv';
import { prisma } from '@/lib/prisma';
import { withRequestId } from '@/lib/sec/headers';

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { orgId } = await context.params;

  try {
    // Verify user has ADMIN role for this organization
    await requireOrgRole(orgId, 'ADMIN');

    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('text/csv') && !contentType?.includes('text/plain')) {
      return NextResponse.json(
        { error: 'Content-Type must be text/csv or text/plain' },
        { status: 400 }
      );
    }

    const csvText = await request.text();
    if (!csvText.trim()) {
      return NextResponse.json(
        { error: 'Empty CSV file' },
        { status: 400 }
      );
    }

    // Parse CSV
    let rows;
    try {
      rows = parseAllocationsCsv(csvText);
    } catch (error) {
      return NextResponse.json(
        { error: `CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid data rows found in CSV' },
        { status: 400 }
      );
    }

    // Map supplier slugs to organization IDs
    const slugs = [...new Set(rows.map(r => r.supplierSlug))];
    const suppliers = await prisma.organization.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, name: true }
    });

    const slugToId = new Map(suppliers.map(s => [s.slug, s.id]));
    const foundSlugs = new Set(suppliers.map(s => s.slug));
    const missingSlugs = slugs.filter(slug => !foundSlugs.has(slug));

    // Process allocations
    let upserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const supplierOrgId = slugToId.get(row.supplierSlug);
      
      if (!supplierOrgId) {
        skipped++;
        continue; // Skip rows with unknown supplier slugs
      }

      try {
        await prisma.partnerVolumeAllocation.upsert({
          where: {
            supplierOrgId_partnerOrgId_year: {
              supplierOrgId,
              partnerOrgId: orgId,
              year: row.year
            }
          },
          update: {
            units: row.units ?? null,
            sharePct: row.sharePct ?? null,
            updatedAt: new Date()
          },
          create: {
            supplierOrgId,
            partnerOrgId: orgId,
            year: row.year,
            units: row.units ?? null,
            sharePct: row.sharePct ?? null
          }
        });
        upserted++;
      } catch (error) {
        errors.push(`Failed to upsert allocation for ${row.supplierSlug} (${row.year}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const response = {
      success: true,
      processed: rows.length,
      upserted,
      skipped,
      missingSlugs: missingSlugs.length > 0 ? missingSlugs : undefined,
      errors: errors.length > 0 ? errors : undefined,
      suppliers: suppliers.map(s => ({ slug: s.slug, name: s.name }))
    };

    return withRequestId(NextResponse.json(response), request);

  } catch (error) {
    console.error('Allocations upload error:', error);
    
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
