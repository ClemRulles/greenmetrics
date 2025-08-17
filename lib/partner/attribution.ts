// import { prisma } from '@/lib/prisma';
import { canViewSupplierDetails } from '@/lib/sharing/guards';

export type AttributionRow = {
  supplierOrgId?: string;
  supplierLabel?: string;
  units: number;
  intensityPerUnitKg: number;
  attributedTons: number;
  qualityGrade: 'A' | 'B' | 'C';
  visibility: 'DETAILED' | 'AGGREGATED';
};

export type PartnerAttributionResult = {
  year: number;
  totalTons: number;
  rows: AttributionRow[];
};

// Production implementation once database is available
export async function getAttributedForPartner(
  partnerOrgId: string, 
  year: number
): Promise<PartnerAttributionResult> {
  // Mock allocations and certificates for now - will be replaced with Prisma queries
  // const allocs = await prisma.partnerVolumeAllocation.findMany({
  //   where: { partnerOrgId, year },
  //   include: { supplier: { select: { name: true } } }
  // });
  const mockAllocations = [
    { supplierOrgId: 'supplier-1', partnerOrgId, year, units: 150 },
    { supplierOrgId: 'supplier-2', partnerOrgId, year, units: 250 }
  ];

  const supplierIds = mockAllocations.map(a => a.supplierOrgId);
  if (!supplierIds.length) {
    return { year, totalTons: 0, rows: [] };
  }

  // Mock certificates - will be replaced with Prisma query for latest per supplier
  // const certs = await prisma.certificate.findMany({
  //   where: {
  //     supplierOrgId: { in: supplierIds },
  //     periodEnd: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) },
  //     revokedAt: null
  //   },
  //   orderBy: { issuedAt: 'desc' }
  // });
  const mockCertificates = [
    {
      supplierOrgId: 'supplier-1',
      intensityPerUnitKg: 2.1,
      qualityGrade: 'A' as const,
      issuedAt: new Date(`${year}-06-01`)
    },
    {
      supplierOrgId: 'supplier-2',
      intensityPerUnitKg: 2.8,
      qualityGrade: 'B' as const,
      issuedAt: new Date(`${year}-08-01`)
    }
  ];

  // Get latest certificate per supplier
  const latestBySupplier = new Map<string, typeof mockCertificates[number]>();
  for (const cert of mockCertificates) {
    if (!latestBySupplier.has(cert.supplierOrgId)) {
      latestBySupplier.set(cert.supplierOrgId, cert);
    }
  }

  let totalTons = 0;
  const rows: AttributionRow[] = [];
  
  for (const allocation of mockAllocations) {
    const cert = latestBySupplier.get(allocation.supplierOrgId);
    if (!cert) continue;

    const canViewDetails = await canViewSupplierDetails(partnerOrgId, allocation.supplierOrgId);
    const units = Number(allocation.units) || 0;
    const attributedKg = Number(cert.intensityPerUnitKg) * units;
    const attributedTons = attributedKg / 1000;
    
    totalTons += attributedTons;

    rows.push({
      supplierOrgId: canViewDetails ? allocation.supplierOrgId : undefined,
      supplierLabel: canViewDetails ? undefined : 'AGGREGATED',
      units,
      intensityPerUnitKg: Number(cert.intensityPerUnitKg),
      attributedTons,
      qualityGrade: cert.qualityGrade,
      visibility: canViewDetails ? 'DETAILED' : 'AGGREGATED'
    });
  }

  return {
    year,
    totalTons: Math.round(totalTons * 1000) / 1000, // Round to 3 decimal places
    rows
  };
}

// Future implementation once database is set up:
/*
export async function getAttributedForPartner(partnerOrgId: string, year: number): Promise<PartnerAttributionResult> {
  const allocs = await prisma.partnerVolumeAllocation.findMany({
    where: { partnerOrgId, year },
    include: { supplier: { select: { name: true } } }
  });
  
  const supplierIds = allocs.map(a => a.supplierOrgId);
  if (!supplierIds.length) {
    return { year, totalTons: 0, rows: [] };
  }

  const certs = await prisma.certificate.findMany({
    where: {
      supplierOrgId: { in: supplierIds },
      periodEnd: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) },
      revokedAt: null
    },
    orderBy: { issuedAt: 'desc' }
  });

  // Get latest certificate per supplier
  const latestBySupplier = new Map<string, typeof certs[number]>();
  for (const cert of certs) {
    if (!latestBySupplier.has(cert.supplierOrgId)) {
      latestBySupplier.set(cert.supplierOrgId, cert);
    }
  }

  let totalTons = 0;
  const rows: AttributionRow[] = [];
  
  for (const allocation of allocs) {
    const cert = latestBySupplier.get(allocation.supplierOrgId);
    if (!cert) continue;

    const canViewDetails = await canViewSupplierDetails(partnerOrgId, allocation.supplierOrgId);
    const units = Number(allocation.units) || 0;
    const attributedKg = Number(cert.intensityPerUnitKg) * units;
    const attributedTons = attributedKg / 1000;
    
    totalTons += attributedTons;

    rows.push({
      supplierOrgId: canViewDetails ? allocation.supplierOrgId : undefined,
      supplierLabel: canViewDetails ? undefined : 'AGGREGATED',
      units,
      intensityPerUnitKg: Number(cert.intensityPerUnitKg),
      attributedTons,
      qualityGrade: cert.qualityGrade,
      visibility: canViewDetails ? 'DETAILED' : 'AGGREGATED'
    });
  }

  return {
    year,
    totalTons: Math.round(totalTons * 1000) / 1000,
    rows
  };
}
*/

// Future implementation once database is set up:
/*
export async function getAttributedForPartner(partnerOrgId: string, year: number): Promise<PartnerAttributionResult> {
  const allocations = await prisma.partnerVolumeAllocation.findMany({
    where: { partnerOrgId, year },
    include: {
      supplier: {
        select: { name: true }
      }
    }
  });
  
  const supplierIds = allocations.map(a => a.supplierOrgId);

  const certs = await prisma.certificate.findMany({
    where: {
      supplierOrgId: { in: supplierIds },
      periodEnd: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`)
      },
      revokedAt: null
    },
    orderBy: { issuedAt: 'desc' }
  });

  // Get latest certificate per supplier
  const latestBySupplier = new Map<string, typeof certs[number]>();
  for (const cert of certs) {
    if (!latestBySupplier.has(cert.supplierOrgId)) {
      latestBySupplier.set(cert.supplierOrgId, cert);
    }
  }

  let totalTons = 0;
  const rows: AttributionRow[] = [];
  
  for (const allocation of allocations) {
    const cert = latestBySupplier.get(allocation.supplierOrgId);
    if (!cert) continue;

    const canViewDetails = await canViewSupplierDetails(partnerOrgId, allocation.supplierOrgId);
    const units = Number(allocation.units) || 0;
    const attributedKg = Number(cert.intensityPerUnitKg) * units;
    const attributedTons = attributedKg / 1000;
    
    totalTons += attributedTons;

    rows.push({
      supplierOrgId: allocation.supplierOrgId,
      supplierName: canViewDetails ? allocation.supplier.name : '[Aggregated Data]',
      units,
      intensityPerUnitKg: Number(cert.intensityPerUnitKg),
      attributedTons,
      qualityGrade: cert.qualityGrade as 'A' | 'B' | 'C',
      visibility: canViewDetails ? 'DETAILED' : 'AGGREGATED'
    });
  }

  return {
    year,
    totalTons: Math.round(totalTons * 1000) / 1000,
    rows
  };
}
*/
