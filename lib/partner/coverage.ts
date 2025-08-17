// import { prisma } from '@/lib/prisma';
// import { canViewSupplierDetails } from '@/lib/sharing/guards';

export type CoverageMetrics = {
  invited: number;
  active: number;
  coveragePct: number;
  primaryData: number;
  estimatedData: number;
  dataQualityScore: number;
};

// Placeholder implementation - will be enhanced once database is available
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getCoverage(_partnerOrgId: string): Promise<CoverageMetrics> {
  // For now, return mock data until the database models are available
  // This will be replaced with real logic once migrations are run
  return {
    invited: 0,
    active: 0,
    coveragePct: 0,
    primaryData: 0,
    estimatedData: 0,
    dataQualityScore: 0
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createCoverageSnapshot(_orgId: string): Promise<{ id: string }> {
  // Placeholder - will create actual snapshot once models are available
  return { id: 'placeholder' };
}

export type SupplierLink = {
  id: string;
  supplierOrgId: string;
  supplierName: string;
  spendShare: number;
  critical: boolean;
  status: 'Active' | 'Invited' | 'Missing';
  dataType: 'Primary' | 'Estimated' | 'None';
  visibility: 'DETAILED' | 'AGGREGATED';
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getSupplierLinks(_partnerOrgId: string): Promise<SupplierLink[]> {
  // Placeholder - will return actual links once models are available
  return [];
}

// Future implementation once database is set up:
/*
export async function getCoverage(partnerOrgId: string): Promise<CoverageMetrics> {
  const links = await prisma.partnerSupplierLink.findMany({ 
    where: { partnerOrgId },
    include: {
      supplier: {
        select: { name: true }
      }
    }
  });
  
  const invited = links.length;
  const supplierIds = links.map((l: any) => l.supplierOrgId);

  if (invited === 0) {
    return {
      invited: 0,
      active: 0,
      coveragePct: 0,
      primaryData: 0,
      estimatedData: 0,
      dataQualityScore: 0
    };
  }

  // Find suppliers with active reports
  const activeOrgIds = new Set(
    (await prisma.report.findMany({
      where: { organizationId: { in: supplierIds } },
      select: { organizationId: true },
      take: 2000
    })).map((r: any) => r.organizationId)
  );

  let coverageWeighted = 0;
  let primary = 0;
  let estimated = 0;

  for (const link of links) {
    if (!activeOrgIds.has(link.supplierOrgId)) continue;

    // Check if supplier has primary data (computation traces via reports)
    const hasPrimary = !!(await prisma.computationTrace.findFirst({
      where: { 
        report: {
          organizationId: link.supplierOrgId
        }
      },
      select: { id: true }
    }));

    if (hasPrimary) {
      primary++;
    } else {
      estimated++;
    }
    
    coverageWeighted += Number(link.spendShare);
  }

  const coveragePct = Math.min(1, coverageWeighted) * 100;
  const denom = invited || 1;
  const dqs = Math.round(((primary * 1.0 + estimated * 0.5) / denom) * 100);

  return {
    invited,
    active: activeOrgIds.size,
    coveragePct: Math.round(coveragePct * 10) / 10,
    primaryData: primary,
    estimatedData: estimated,
    dataQualityScore: dqs
  };
}

export async function getSupplierLinks(partnerOrgId: string): Promise<SupplierLink[]> {
  const links = await prisma.partnerSupplierLink.findMany({
    where: { partnerOrgId },
    include: {
      supplier: {
        select: { name: true }
      }
    }
  });

  const result: SupplierLink[] = [];
  
  for (const link of links) {
    const canViewDetails = await canViewSupplierDetails(partnerOrgId, link.supplierOrgId);
    
    // Check if supplier has reports (active)
    const hasReports = !!(await prisma.report.findFirst({
      where: { organizationId: link.supplierOrgId },
      select: { id: true }
    }));

    // Check data type
    const hasPrimary = !!(await prisma.computationTrace.findFirst({
      where: { 
        report: {
          organizationId: link.supplierOrgId
        }
      },
      select: { id: true }
    }));

    result.push({
      id: link.id,
      supplierOrgId: link.supplierOrgId,
      supplierName: canViewDetails ? link.supplier.name : '[Aggregated Data]',
      spendShare: link.spendShare,
      critical: link.critical,
      status: hasReports ? 'Active' : 'Invited',
      dataType: hasPrimary ? 'Primary' : (hasReports ? 'Estimated' : 'None'),
      visibility: canViewDetails ? 'DETAILED' : 'AGGREGATED'
    });
  }

  return result;
}
*/
