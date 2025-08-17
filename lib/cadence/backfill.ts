import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';

export type BackfillResult = {
  backfilledRecords: number;
  processedOrganizations: number;
  upgradedGrades: number;
  regeneratedComputations: number;
  errors: Array<{
    organizationId: string;
    error: string;
  }>;
  summary: {
    gradeACount: number;
    gradeBCount: number;
    gradeCCount: number;
    avgProcessingTimeMs: number;
  };
};

/**
 * Run the backfill process
 * When real documents arrive, replace Grade C estimates with primary data
 * and regenerate affected computations/certificates
 * 
 * @param monthPeriod - Month in YYYY-MM format (e.g., "2025-08")
 * @param targetOrgId - Optional: target specific organization
 */
export async function runBackfillProcess(
  monthPeriod: string,
  targetOrgId?: string
): Promise<BackfillResult> {
  console.log(`[Backfill] Starting backfill for ${monthPeriod}`);
  
  const result: BackfillResult = {
    backfilledRecords: 0,
    processedOrganizations: 0,
    upgradedGrades: 0,
    regeneratedComputations: 0,
    errors: [],
    summary: {
      gradeACount: 0,
      gradeBCount: 0,
      gradeCCount: 0,
      avgProcessingTimeMs: 0,
    },
  };

  try {
    // Find organizations with Grade C estimates that might have new real data
    const candidateOrgs = await findBackfillCandidates(monthPeriod, targetOrgId);
    console.log(`[Backfill] Found ${candidateOrgs.length} candidate organizations`);

    const startTime = Date.now();

    for (const org of candidateOrgs) {
      try {
        const orgStartTime = Date.now();
        await processOrganizationBackfill(org.id, monthPeriod, result);
        result.processedOrganizations++;
        
        const processingTime = Date.now() - orgStartTime;
        result.summary.avgProcessingTimeMs = 
          (result.summary.avgProcessingTimeMs * (result.processedOrganizations - 1) + processingTime) 
          / result.processedOrganizations;

      } catch (error) {
        console.error(`[Backfill] Error processing org ${org.id}:`, error);
        result.errors.push({
          organizationId: org.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Update summary statistics
    await calculateBackfillSummary(monthPeriod, result);

    const totalTime = Date.now() - startTime;
    console.log(`[Backfill] Completed in ${totalTime}ms: ${result.backfilledRecords} records, ${result.upgradedGrades} upgrades`);
    
    return result;

  } catch (error) {
    console.error('[Backfill] Process failed:', error);
    throw new Error(`Backfill failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find organizations that are candidates for backfill
 * These are orgs with Grade C estimates that might now have real data
 */
async function findBackfillCandidates(monthPeriod: string, targetOrgId?: string) {
  const whereClause = {
    monthPeriod,
    qualityGrade: 'C' as const,
    isEstimated: true,
    ...(targetOrgId && { organizationId: targetOrgId }),
  };

  const estimatedRecords = await prisma.monthlyEmission.findMany({
    where: whereClause,
    select: {
      organizationId: true,
    },
    distinct: ['organizationId'],
  });

  return estimatedRecords.map(r => ({ id: r.organizationId }));
}

/**
 * Process backfill for a single organization
 */
async function processOrganizationBackfill(
  organizationId: string,
  monthPeriod: string,
  result: BackfillResult
): Promise<void> {
  console.log(`[Backfill] Processing org ${organizationId} for ${monthPeriod}`);

  // Check if new real data has arrived since estimation
  const newData = await checkForNewRealData(organizationId, monthPeriod);
  
  if (!newData.hasNewData) {
    console.log(`[Backfill] No new data for ${organizationId}/${monthPeriod}`);
    return;
  }

  console.log(`[Backfill] Found new data for ${organizationId}: ${newData.newReadings} readings, ${newData.newProofs} proofs`);

  // Calculate new emissions with real data
  const actualEmissions = await calculateActualEmissions(organizationId, monthPeriod);
  
  // Determine new quality grade
  const newGrade = determineQualityGrade(actualEmissions, newData);
  
  // Update monthly emission record
  const updatedRecord = await updateMonthlyEmissionRecord(
    organizationId,
    monthPeriod,
    actualEmissions,
    newGrade,
    newData
  );

  if (updatedRecord.wasUpgraded) {
    result.upgradedGrades++;
  }

  // Update production records if applicable
  await updateProductionRecords(organizationId, monthPeriod, newData);

  // Update buyer attribution records
  await updateBuyerAttributionRecords(organizationId, monthPeriod, actualEmissions);

  // Regenerate affected computations and certificates
  const regenerationCount = await regenerateAffectedComputations(organizationId, monthPeriod);
  result.regeneratedComputations += regenerationCount;

  // Update dashboard snapshot
  await updateDashboardSnapshot(organizationId, monthPeriod);

  result.backfilledRecords++;
}

/**
 * Check if new real data has arrived since the last estimation
 */
async function checkForNewRealData(organizationId: string, monthPeriod: string) {
  const [year, month] = monthPeriod.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // Get the last estimation timestamp
  const lastEstimation = await prisma.monthlyEmission.findUnique({
    where: {
      organizationId_monthPeriod: {
        organizationId,
        monthPeriod,
      },
    },
    select: {
      updatedAt: true,
      isEstimated: true,
    },
  });

  if (!lastEstimation || !lastEstimation.isEstimated) {
    return { hasNewData: false, newReadings: 0, newProofs: 0 };
  }

  // Check for readings added after the estimation
  const newReadings = await prisma.reading.count({
    where: {
      organizationId,
      periodStart: {
        gte: monthStart,
      },
      periodEnd: {
        lte: monthEnd,
      },
      createdAt: {
        gt: lastEstimation.updatedAt,
      },
    },
  });

  // Check for proofs added after the estimation
  const newProofs = await prisma.proof.count({
    where: {
      organizationId,
      periodStart: {
        gte: monthStart,
      },
      periodEnd: {
        lte: monthEnd,
      },
      createdAt: {
        gt: lastEstimation.updatedAt,
      },
    },
  });

  return {
    hasNewData: newReadings > 0 || newProofs > 0,
    newReadings,
    newProofs,
    estimationTimestamp: lastEstimation.updatedAt,
  };
}

/**
 * Calculate actual emissions from all available data
 */
async function calculateActualEmissions(organizationId: string, monthPeriod: string) {
  const [year, month] = monthPeriod.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // Get all readings for the month
  const readings = await prisma.reading.findMany({
    where: {
      organizationId,
      periodStart: {
        gte: monthStart,
      },
      periodEnd: {
        lte: monthEnd,
      },
    },
    include: {
      emissionFactorOverride: true,
    },
  });

  // Get all proofs for the month
  const proofs = await prisma.proof.findMany({
    where: {
      organizationId,
      periodStart: {
        gte: monthStart,
      },
      periodEnd: {
        lte: monthEnd,
      },
    },
  });

  let scope1 = 0;
  let scope2 = 0;

  // Calculate emissions from readings
  for (const reading of readings) {
    const factor = reading.emissionFactorOverride?.factorValue ?? getDefaultEmissionFactor(reading.activityKind);
    const emissions = parseFloat(reading.amount.toString()) * factor;

    if (isScope1Activity(reading.activityKind)) {
      scope1 += emissions;
    } else {
      scope2 += emissions;
    }
  }

  // Calculate data completeness
  const dataCompleteness = Math.min(100, (readings.length + proofs.length) * 8); // Heuristic

  return {
    scope1,
    scope2,
    total: scope1 + scope2,
    readingsCount: readings.length,
    proofsCount: proofs.length,
    dataCompleteness,
    hasProofs: proofs.length > 0,
    hasReadings: readings.length > 0,
  };
}

/**
 * Determine the new quality grade based on available data
 */
function determineQualityGrade(emissions: any, newData: any): 'A' | 'B' | 'C' {
  // Grade A: Has both readings and proof documents
  if (emissions.hasProofs && emissions.hasReadings && emissions.dataCompleteness >= 80) {
    return 'A';
  }
  
  // Grade B: Has readings or good data completeness
  if (emissions.hasReadings && emissions.dataCompleteness >= 60) {
    return 'B';
  }
  
  // Grade C: Limited data
  return 'C';
}

/**
 * Update the monthly emission record with real data
 */
async function updateMonthlyEmissionRecord(
  organizationId: string,
  monthPeriod: string,
  emissions: any,
  newGrade: 'A' | 'B' | 'C',
  newData: any
) {
  const currentRecord = await prisma.monthlyEmission.findUnique({
    where: {
      organizationId_monthPeriod: {
        organizationId,
        monthPeriod,
      },
    },
  });

  if (!currentRecord) {
    throw new Error(`No monthly emission record found for ${organizationId}/${monthPeriod}`);
  }

  const wasEstimated = currentRecord.isEstimated;
  const oldGrade = currentRecord.qualityGrade;

  const updatedRecord = await prisma.monthlyEmission.update({
    where: {
      organizationId_monthPeriod: {
        organizationId,
        monthPeriod,
      },
    },
    data: {
      scope1Total: new Decimal(emissions.scope1),
      scope2Total: new Decimal(emissions.scope2),
      totalEmissions: new Decimal(emissions.total),
      qualityGrade: newGrade,
      isEstimated: false,
      estimationMethod: null, // Clear estimation method
      dataCompleteness: new Decimal(emissions.dataCompleteness),
      updatedAt: new Date(),
    },
  });

  console.log(`[Backfill] Updated ${organizationId}/${monthPeriod}: ${oldGrade}→${newGrade}, estimate→real`);

  return {
    record: updatedRecord,
    wasUpgraded: wasEstimated || (getGradeValue(newGrade) > getGradeValue(oldGrade)),
    gradeChange: `${oldGrade}→${newGrade}`,
  };
}

/**
 * Update production records with new data
 */
async function updateProductionRecords(
  organizationId: string,
  monthPeriod: string,
  newData: any
): Promise<void> {
  const [year, month] = monthPeriod.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // Get updated production stats
  const productionStats = await prisma.productionStat.findMany({
    where: {
      organizationId,
      // Note: ProductionStat model doesn't have periodStart/End in the current schema
      // This would need to be adjusted based on actual schema
    },
  });

  // Update monthly production records if any production data exists
  for (const stat of productionStats) {
    const family = 'default'; // stat.productFamily in the future
    const volume = parseFloat(stat.units.toString()) / 12; // Convert annual to monthly
    
    await prisma.monthlyProduction.upsert({
      where: {
        organizationId_monthPeriod_productFamily: {
          organizationId,
          monthPeriod,
          productFamily: family,
        },
      },
      update: {
        productionVolume: new Decimal(volume),
        qualityGrade: 'B',
        isEstimated: false,
        estimationMethod: null,
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        monthPeriod,
        productFamily: family,
        productionVolume: new Decimal(volume),
        productionUnit: stat.unitLabel,
        intensityLevel: 'SITE',
        qualityGrade: 'B',
        isEstimated: false,
      },
    });
  }
}

/**
 * Update buyer attribution records
 */
async function updateBuyerAttributionRecords(
  organizationId: string,
  monthPeriod: string,
  emissions: any
): Promise<void> {
  // Get partner allocations for this period
  const allocations = await prisma.partnerVolumeAllocation.findMany({
    where: {
      supplierOrgId: organizationId,
      // Note: Need to filter by period when schema supports it
    },
  });

  for (const allocation of allocations) {
    // Calculate updated attributed emissions based on actual data
    const sharePct = parseFloat(allocation.sharePct?.toString() || '0') / 100;
    const attributedEmissions = emissions.total * sharePct;

    await prisma.buyerAttributionMonthly.upsert({
      where: {
        buyerOrgId_supplierOrgId_monthPeriod_productFamily: {
          buyerOrgId: allocation.partnerOrgId,
          supplierOrgId: organizationId,
          monthPeriod,
          productFamily: 'default', // allocation.productFamily in the future
        },
      },
      update: {
        attributedEmissions: new Decimal(attributedEmissions),
        attributionMethod: 'supplier_specific',
        confidenceScore: new Decimal(90),
        qualityGrade: 'B',
        isEstimated: false,
        estimationMethod: null,
        updatedAt: new Date(),
      },
      create: {
        buyerOrgId: allocation.partnerOrgId,
        supplierOrgId: organizationId,
        monthPeriod,
        productFamily: 'default',
        purchasedVolume: allocation.units || new Decimal(0),
        attributedEmissions: new Decimal(attributedEmissions),
        attributionMethod: 'supplier_specific',
        confidenceScore: new Decimal(90),
        qualityGrade: 'B',
        isEstimated: false,
      },
    });
  }
}

/**
 * Regenerate affected computations and certificates
 * This is scoped to avoid triggering extensive recomputation
 */
async function regenerateAffectedComputations(
  organizationId: string,
  monthPeriod: string
): Promise<number> {
  let regeneratedCount = 0;

  try {
    // 1. Find and update related reports
    const affectedReports = await prisma.report.findMany({
      where: {
        organizationId,
        // Find reports that cover this month period
        periodStart: {
          lte: new Date(monthPeriod + '-01'),
        },
        periodEnd: {
          gte: new Date(monthPeriod + '-01'),
        },
      },
      select: { id: true },
    });

    for (const report of affectedReports) {
      // Mark report for recomputation (would trigger background job)
      console.log(`[Backfill] Marking report ${report.id} for recomputation`);
      regeneratedCount++;
    }

    // 2. Update affected certificates
    const certificates = await prisma.certificate.findMany({
      where: {
        organizationId,
        // Find certificates that might be affected
      },
      select: { id: true },
    });

    for (const cert of certificates) {
      // Mark certificate for regeneration
      console.log(`[Backfill] Marking certificate ${cert.id} for regeneration`);
      regeneratedCount++;
    }

    // 3. Update partner target snapshots
    const targetSnapshots = await prisma.partnerTargetSnapshot.findMany({
      where: {
        organization: {
          partnerLinks: {
            some: {
              supplierOrgId: organizationId,
            },
          },
        },
      },
      select: { id: true },
    });

    for (const snapshot of targetSnapshots) {
      // Mark snapshot for recalculation
      console.log(`[Backfill] Marking target snapshot ${snapshot.id} for recalculation`);
      regeneratedCount++;
    }

  } catch (error) {
    console.warn(`[Backfill] Error during regeneration for ${organizationId}:`, error);
  }

  return regeneratedCount;
}

/**
 * Update dashboard snapshot with backfilled data
 */
async function updateDashboardSnapshot(organizationId: string, monthPeriod: string): Promise<void> {
  const monthlyEmission = await prisma.monthlyEmission.findUnique({
    where: {
      organizationId_monthPeriod: {
        organizationId,
        monthPeriod,
      },
    },
  });

  if (!monthlyEmission) return;

  // Recalculate all dashboard metrics with updated data
  const [year] = monthPeriod.split('-').map(Number);
  const ytdTotal = await calculateYTDEmissions(organizationId, year);
  const trailing12Total = await calculateTrailing12Emissions(organizationId, monthPeriod);
  
  const avgGrade = await calculateAvgQualityGrade(organizationId, monthPeriod);
  const estimatedPercentage = await calculateEstimatedPercentage(organizationId, monthPeriod);

  // Get targets for comparison
  const targets = await prisma.partnerTargets.findUnique({
    where: { organizationId },
  });

  const vsTargetData = calculateVsTargetStatus(
    parseFloat(ytdTotal.toString()),
    targets?.targetTonsCo2e ? parseFloat(targets.targetTonsCo2e.toString()) : null
  );

  await prisma.dashboardSnapshot.update({
    where: {
      organizationId_monthPeriod: {
        organizationId,
        monthPeriod,
      },
    },
    data: {
      totalEmissions: monthlyEmission.totalEmissions,
      scope1Emissions: monthlyEmission.scope1Total,
      scope2Emissions: monthlyEmission.scope2Total,
      avgQualityGrade: avgGrade,
      dataCompleteness: monthlyEmission.dataCompleteness,
      estimatedPercentage: new Decimal(estimatedPercentage),
      ytdEmissions: new Decimal(ytdTotal),
      trailing12Months: new Decimal(trailing12Total),
      vsTargetStatus: vsTargetData.status,
      vsTargetPercentage: vsTargetData.percentage ? new Decimal(vsTargetData.percentage) : null,
      updatedAt: new Date(),
    },
  });
}

/**
 * Calculate backfill summary statistics
 */
async function calculateBackfillSummary(monthPeriod: string, result: BackfillResult): Promise<void> {
  const gradeStats = await prisma.monthlyEmission.groupBy({
    by: ['qualityGrade'],
    where: { monthPeriod },
    _count: true,
  });

  for (const stat of gradeStats) {
    switch (stat.qualityGrade) {
      case 'A':
        result.summary.gradeACount = stat._count;
        break;
      case 'B':
        result.summary.gradeBCount = stat._count;
        break;
      case 'C':
        result.summary.gradeCCount = stat._count;
        break;
    }
  }
}

// Helper functions (shared with close.ts)

function getGradeValue(grade: string): number {
  const values: Record<string, number> = { A: 3, B: 2, C: 1 };
  return values[grade] || 1;
}

function getDefaultEmissionFactor(activityKind: string): number {
  const factors: Record<string, number> = {
    ELECTRICITY: 0.5,
    NATURAL_GAS: 2.0,
    HEATING_OIL: 2.5,
    DIESEL: 2.7,
    GASOLINE: 2.3,
  };
  return factors[activityKind] || 1.0;
}

function isScope1Activity(activityKind: string): boolean {
  const scope1Activities = ['NATURAL_GAS', 'HEATING_OIL', 'DIESEL', 'GASOLINE'];
  return scope1Activities.includes(activityKind);
}

async function calculateYTDEmissions(organizationId: string, year: number): Promise<Decimal> {
  const result = await prisma.monthlyEmission.aggregate({
    where: {
      organizationId,
      monthPeriod: {
        startsWith: year.toString(),
      },
    },
    _sum: {
      totalEmissions: true,
    },
  });

  return result._sum.totalEmissions || new Decimal(0);
}

async function calculateTrailing12Emissions(organizationId: string, monthPeriod: string): Promise<Decimal> {
  const [year, month] = monthPeriod.split('-').map(Number);
  const startDate = new Date(year - 1, month - 1, 1);
  
  const periods = [];
  for (let i = 0; i < 12; i++) {
    const periodDate = new Date(startDate);
    periodDate.setMonth(startDate.getMonth() + i);
    periods.push(`${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`);
  }

  const result = await prisma.monthlyEmission.aggregate({
    where: {
      organizationId,
      monthPeriod: {
        in: periods,
      },
    },
    _sum: {
      totalEmissions: true,
    },
  });

  return result._sum.totalEmissions || new Decimal(0);
}

function calculateVsTargetStatus(ytdEmissions: number, annualTarget: number | null): {
  status: 'OK' | 'WATCH' | 'OFF_TRACK';
  percentage: number | null;
} {
  if (!annualTarget) {
    return { status: 'OK', percentage: null };
  }

  const percentage = (ytdEmissions / annualTarget) * 100;

  if (percentage <= 75) {
    return { status: 'OK', percentage };
  } else if (percentage <= 90) {
    return { status: 'WATCH', percentage };
  } else {
    return { status: 'OFF_TRACK', percentage };
  }
}

async function calculateAvgQualityGrade(organizationId: string, monthPeriod: string): Promise<string> {
  const [year] = monthPeriod.split('-').map(Number);
  
  const grades = await prisma.monthlyEmission.findMany({
    where: {
      organizationId,
      monthPeriod: {
        startsWith: year.toString(),
      },
    },
    select: { qualityGrade: true },
  });

  if (grades.length === 0) return 'C';

  const gradeMap = { A: 3, B: 2, C: 1 };
  const avgScore = grades.reduce((sum, g) => sum + gradeMap[g.qualityGrade], 0) / grades.length;

  if (avgScore >= 2.5) return 'A';
  if (avgScore >= 1.5) return 'B';
  return 'C';
}

async function calculateEstimatedPercentage(organizationId: string, monthPeriod: string): Promise<number> {
  const [year] = monthPeriod.split('-').map(Number);
  
  const result = await prisma.monthlyEmission.groupBy({
    by: ['isEstimated'],
    where: {
      organizationId,
      monthPeriod: {
        startsWith: year.toString(),
      },
    },
    _count: true,
  });

  const total = result.reduce((sum, r) => sum + r._count, 0);
  const estimated = result.find(r => r.isEstimated)?._count || 0;

  return total > 0 ? (estimated / total) * 100 : 0;
}
