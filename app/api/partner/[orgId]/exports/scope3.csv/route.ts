import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/rbac';
import { buildPrivacySafeExport, formatAsCSV, generateCSVFilename } from '@/lib/partner/exports';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { userId } = await requireOrgRole(orgId, 'EDITOR');
    
    // Get year from query params or default to current year
    const url = new URL(request.url);
    const yearParam = url.searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    
    // Validate year
    if (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      );
    }
    
    // Build privacy-safe export data
    const exportData = await buildPrivacySafeExport(orgId, year);
    
    // Format as CSV
    const csvContent = formatAsCSV(exportData);
    
    // Generate filename
    const filename = generateCSVFilename(orgId, year);
    
    // Return CSV with appropriate headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('GET /api/partner/[orgId]/exports/scope3.csv error:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('permission')) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }
    
    if (error.message?.includes('Failed to build')) {
      return NextResponse.json(
        { error: 'Unable to generate export data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to export CSV data' },
      { status: 500 }
    );
  }
}
