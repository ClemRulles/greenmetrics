import { prisma } from '@/lib/prisma';

export type ProofKind = 'ELECTRICITY_BILL' | 'GAS_BILL' | 'FUEL_INVOICE' | 'OTHER';

export type EvidenceSummary = {
  year: number;
  byKind: Record<ProofKind, { count: number; monthsCovered: number }>;
  totalFiles: number;
};

/**
 * Get evidence summary for an organization and year
 * Returns only aggregated data - no file paths or sensitive information
 * @param orgId - Organization ID
 * @param year - Year to summarize
 * @returns Evidence summary with counts and coverage
 */
export async function getEvidenceSummary(orgId: string, year: number): Promise<EvidenceSummary> {
  try {
    // Query proofs for the given year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    
    // Check if proof model exists (migration might not be run yet)
    const proofs = await (prisma as any).proof?.findMany({
      where: {
        organizationId: orgId,
        periodStart: {
          gte: yearStart,
          lt: yearEnd,
        },
      },
      select: {
        kind: true,
        periodStart: true,
        periodEnd: true,
      },
    }) || [];

    // Initialize summary structure
    const summary: EvidenceSummary = {
      year,
      byKind: {
        ELECTRICITY_BILL: { count: 0, monthsCovered: 0 },
        GAS_BILL: { count: 0, monthsCovered: 0 },
        FUEL_INVOICE: { count: 0, monthsCovered: 0 },
        OTHER: { count: 0, monthsCovered: 0 },
      },
      totalFiles: proofs.length,
    };

    // Calculate coverage by kind
    for (const kind of Object.keys(summary.byKind) as ProofKind[]) {
      const kindProofs = proofs.filter((p: any) => p.kind === kind);
      summary.byKind[kind].count = kindProofs.length;

      // Calculate unique months covered
      const monthsSet = new Set<string>();
      for (const proof of kindProofs) {
        const start = new Date(proof.periodStart);
        const end = new Date(proof.periodEnd);
        
        // Add all months between start and end
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
          monthsSet.add(`${current.getFullYear()}-${current.getMonth()}`);
          current.setMonth(current.getMonth() + 1);
        }
      }
      
      summary.byKind[kind].monthsCovered = monthsSet.size;
    }

    return summary;
  } catch (error) {
    console.error('Error getting evidence summary:', error);
    
    // Return placeholder data if DB query fails
    return {
      year,
      byKind: {
        ELECTRICITY_BILL: { count: 0, monthsCovered: 0 },
        GAS_BILL: { count: 0, monthsCovered: 0 },
        FUEL_INVOICE: { count: 0, monthsCovered: 0 },
        OTHER: { count: 0, monthsCovered: 0 },
      },
      totalFiles: 0,
    };
  }
}

/**
 * Check if an organization has sufficient evidence for a given year
 * @param orgId - Organization ID
 * @param year - Year to check
 * @returns True if sufficient evidence exists
 */
export async function hasSufficientEvidence(orgId: string, year: number): Promise<boolean> {
  const summary = await getEvidenceSummary(orgId, year);
  
  // Basic heuristic: at least 6 months of electricity bills
  return summary.byKind.ELECTRICITY_BILL.monthsCovered >= 6;
}

/**
 * Get evidence coverage percentage for a year
 * @param orgId - Organization ID
 * @param year - Year to check
 * @returns Coverage percentage (0-100)
 */
export async function getEvidenceCoveragePercent(orgId: string, year: number): Promise<number> {
  const summary = await getEvidenceSummary(orgId, year);
  
  // Calculate average coverage across all proof kinds
  const kinds = Object.values(summary.byKind);
  const totalMonthsCovered = kinds.reduce((sum, kind) => sum + kind.monthsCovered, 0);
  const maxPossibleMonths = kinds.length * 12; // 12 months per kind
  
  if (maxPossibleMonths === 0) return 0;
  
  return Math.round((totalMonthsCovered / maxPossibleMonths) * 100);
}
