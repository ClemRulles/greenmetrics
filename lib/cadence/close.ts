import { prisma } from '@/lib/prisma';
import { QualityGrade } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { estimateMonthlyEmissions } from './estimate';

export type MonthlyCloseResult = {
  processedOrganizations: number;
  processedMonths: number;
  estimatedRecords: number;
  realDataRecords: number;
  errors: Array<{
    organizationId: string;
    error: string;
  }>;
  summary: {
    totalEstimatedEmissions: number;
    totalRealEmissions: number;
    avgQualityGrade: string;
  };
};

/**
 * Run the monthly close process
 * Marks missing periods as Grade C with secondary factors/heuristics
 * 
 * @param monthPeriod - Month in YYYY-MM format (e.g., "2025-08")
 * @param targetOrgId - Optional: target specific organization
 * @param force - Force reprocessing of existing records
 */
export async function runMonthlyClose(
  monthPeriod: string,
  targetOrgId?: string,
  force = false
): Promise<MonthlyCloseResult> {
  console.log(`[MonthlyClose] Starting close for ${monthPeriod}`);
  
  const result: MonthlyCloseResult = {
    processedOrganizations: 0,
    processedMonths: 0,
    estimatedRecords: 0,
    realDataRecords: 0,
    errors: [],
    summary: {
      totalEstimatedEmissions: 0,
      totalRealEmissions: 0,
      avgQualityGrade: 'C',
    },
  };

  try {
    // Get organizations to process
    const organizations = await getOrganizationsForClose(targetOrgId);
    console.log(`[MonthlyClose] Processing ${organizations.length} organizations`);

    for (const org of organizations) {
      try {
        await processOrganizationClose(org.id, monthPeriod, force, result);
        result.processedOrganizations++;
      } catch (error) {
        console.error(`[MonthlyClose] Error processing org ${org.id}:`, error);
        result.errors.push({
          organizationId: org.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Calculate summary statistics
    await calculateCloseSummary(monthPeriod, result);

    console.log(`[MonthlyClose] Completed: ${result.processedOrganizations} orgs, ${result.estimatedRecords} estimates`);
    return result;

  } catch (error) {
    console.error('[MonthlyClose] Process failed:', error);
    throw new Error(`Monthly close failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process monthly close for a single organization
 */
async function processOrganizationClose(
  organizationId: string,
  monthPeriod: string,
  force: boolean,
  result: MonthlyCloseResult
): Promise<void> {
  // Check if already processed (unless force mode)
  if (!force) {
    const existing = await prisma.monthlyEmission.findUnique({
      where: {
        organizationId_monthPeriod: {
          organizationId,
          monthPeriod,
        },
      },
    });

    if (existing) {
      console.log(`[MonthlyClose] Skipping ${organizationId}/${monthPeriod} - already exists`);
      return;
    }
  }

  // Check for real emission data
  const realData = await checkForRealEmissionData(organizationId, monthPeriod);
  
  if (realData.hasData) {
    // Process real data
    await processRealEmissionData(organizationId, monthPeriod, realData, result);
  } else {
    // Generate Grade C estimates
    await processEstimatedEmissionData(organizationId, monthPeriod, result);
  }

  // Update production data if available
  await processProductionData(organizationId, monthPeriod);

  // Update buyer attribution data
  await processBuyerAttributionData(organizationId, monthPeriod);

  // Create or update dashboard snapshot
  await updateDashboardSnapshot(organizationId, monthPeriod);

  result.processedMonths++;
}

/**
 * Check if organization has real emission data for the month
 */
async function checkForRealEmissionData(organizationId: string, monthPeriod: string) {
  const [year, month] = monthPeriod.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // Check for readings in the month
  const readings = await prisma.reading.count({
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

  // Check for proofs in the month
  const proofs = await prisma.proof.count({
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

  return {
    hasData: readings > 0 || proofs > 0,
    readingsCount: readings,
    proofsCount: proofs,
    dataCompleteness: Math.min(100, (readings + proofs) * 10), // Simple heuristic
  };
}

/**
 * Process real emission data (Grade A/B)
 */
async function processRealEmissionData(
  organizationId: string,
  monthPeriod: string,
  realData: any,
  result: MonthlyCloseResult
): Promise<void> {
  // Calculate actual emissions from readings/proofs
  const emissions = await calculateActualEmissions(organizationId, monthPeriod);
  
  const qualityGrade: QualityGrade = emissions.hasProofs ? 'A' : 'B';

  // Create monthly emission record
  await prisma.monthlyEmission.upsert({
    where: {
      organizationId_monthPeriod: {
        organizationId,
        monthPeriod,
      },
    },
    update: {
      scope1Total: new Decimal(emissions.scope1),
      scope2Total: new Decimal(emissions.scope2),
      totalEmissions: new Decimal(emissions.total),
      qualityGrade,
      isEstimated: false,
      dataCompleteness: new Decimal(realData.dataCompleteness),
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      monthPeriod,
      scope1Total: new Decimal(emissions.scope1),
      scope2Total: new Decimal(emissions.scope2),
      totalEmissions: new Decimal(emissions.total),
      qualityGrade,
      isEstimated: false,
      dataCompleteness: new Decimal(realData.dataCompleteness),
    },
  });

  result.realDataRecords++;
  result.summary.totalRealEmissions += emissions.total;
}

/**
 * Process estimated emission data (Grade C)
 */
async function processEstimatedEmissionData(
  organizationId: string,
  monthPeriod: string,
  result: MonthlyCloseResult
): Promise<void> {
  // Generate estimates using secondary factors/heuristics
  const estimates = await estimateMonthlyEmissions(organizationId, monthPeriod);

  // Create monthly emission record with Grade C
  await prisma.monthlyEmission.upsert({
    where: {
      organizationId_monthPeriod: {
        organizationId,
        monthPeriod,
      },
    },
    update: {
      scope1Total: new Decimal(estimates.scope1),
      scope2Total: new Decimal(estimates.scope2),
      totalEmissions: new Decimal(estimates.total),
      qualityGrade: 'C',
      isEstimated: true,
      estimationMethod: estimates.method,
      dataCompleteness: new Decimal(estimates.confidence),
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      monthPeriod,
      scope1Total: new Decimal(estimates.scope1),
      scope2Total: new Decimal(estimates.scope2),
      totalEmissions: new Decimal(estimates.total),
      qualityGrade: 'C',
      isEstimated: true,
      estimationMethod: estimates.method,
      dataCompleteness: new Decimal(estimates.confidence),
    },
  });

  result.estimatedRecords++;
  result.summary.totalEstimatedEmissions += estimates.total;
}

/**
 * Calculate actual emissions from readings and proofs
 */
async function calculateActualEmissions(organizationId: string, monthPeriod: string) {
  const [year, month] = monthPeriod.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // Get readings for the month
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

  // Get proofs for the month
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

  // Add emissions from direct proof calculations if available
  // (This would integrate with existing computation modules)

  return {
    scope1,
    scope2,
    total: scope1 + scope2,
    hasProofs: proofs.length > 0,
  };
}

/**
 * Process production data for the month
 */
async function processProductionData(organizationId: string, monthPeriod: string): Promise<void> {
  // Get production stats for the month
  const [year, month] = monthPeriod.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const productionStats = await prisma.productionStat.findMany({
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

  // Group by product family and create monthly production records
  const familyGroups = new Map<string, typeof productionStats>();
  
  for (const stat of productionStats) {
    const family = stat.productFamily || 'default';
    if (!familyGroups.has(family)) {
      familyGroups.set(family, []);
    }
    familyGroups.get(family)!.push(stat);
  }

  for (const [family, stats] of familyGroups) {
    const totalVolume = stats.reduce((sum, stat) => sum + parseFloat(stat.productionVolume.toString()), 0);
    const avgIntensity = stats.reduce((sum, stat) => sum + parseFloat(stat.carbonIntensity?.toString() || '0'), 0) / stats.length;

    await prisma.monthlyProduction.upsert({
      where: {
        organizationId_monthPeriod_productFamily: {
          organizationId,
          monthPeriod,
          productFamily: family,
        },
      },
      update: {
        productionVolume: new Decimal(totalVolume),
        intensity: avgIntensity > 0 ? new Decimal(avgIntensity) : null,
        intensityLevel: 'SITE',
        qualityGrade: avgIntensity > 0 ? 'B' : 'C',
        isEstimated: avgIntensity === 0,
        estimationMethod: avgIntensity === 0 ? 'no_intensity_data' : null,
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        monthPeriod,
        productFamily: family,
        productionVolume: new Decimal(totalVolume),
        productionUnit: stats[0]?.productionUnit || 'units',
        intensity: avgIntensity > 0 ? new Decimal(avgIntensity) : null,
        intensityLevel: 'SITE',
        qualityGrade: avgIntensity > 0 ? 'B' : 'C',
        isEstimated: avgIntensity === 0,
        estimationMethod: avgIntensity === 0 ? 'no_intensity_data' : null,
      },
    });
  }
}

/**
 * Process buyer attribution data for the month
 */
async function processBuyerAttributionData(organizationId: string, monthPeriod: string): Promise<void> {
  // Get partner allocations for the month
  const [year, month] = monthPeriod.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const allocations = await prisma.partnerVolumeAllocation.findMany({
    where: {
      supplierOrgId: organizationId,
      periodStart: {
        gte: monthStart,
      },
      periodEnd: {
        lte: monthEnd,
      },
    },
  });

  // Create attribution records for each buyer
  for (const allocation of allocations) {
    const attributedEmissions = parseFloat(allocation.attributedEmissions?.toString() || '0');
    const volume = parseFloat(allocation.volumeAllocated.toString());

    await prisma.buyerAttributionMonthly.upsert({
      where: {
        buyerOrgId_supplierOrgId_monthPeriod_productFamily: {
          buyerOrgId: allocation.partnerOrgId,
          supplierOrgId: organizationId,
          monthPeriod,
          productFamily: allocation.productFamily || 'default',
        },
      },
      update: {
        purchasedVolume: new Decimal(volume),
        attributedEmissions: new Decimal(attributedEmissions),
        attributionMethod: 'supplier_specific',
        confidenceScore: new Decimal(85), // Based on direct allocation
        qualityGrade: 'B',
        isEstimated: false,
        updatedAt: new Date(),
      },
      create: {
        buyerOrgId: allocation.partnerOrgId,
        supplierOrgId: organizationId,
        monthPeriod,
        productFamily: allocation.productFamily || 'default',
        purchasedVolume: new Decimal(volume),
        attributedEmissions: new Decimal(attributedEmissions),
        attributionMethod: 'supplier_specific',
        confidenceScore: new Decimal(85),
        qualityGrade: 'B',
        isEstimated: false,
      },
    });
  }
}

/**
 * Update dashboard snapshot for the month
 */
async function updateDashboardSnapshot(organizationId: string, monthPeriod: string): Promise<void> {
  // Get monthly emission data
  const monthlyEmission = await prisma.monthlyEmission.findUnique({
    where: {
      organizationId_monthPeriod: {
        organizationId,
        monthPeriod,
      },
    },
  });

  if (!monthlyEmission) return;

  // Calculate YTD and trailing 12-month totals
  const [year] = monthPeriod.split('-').map(Number);
  const ytdTotal = await calculateYTDEmissions(organizationId, year);
  const trailing12Total = await calculateTrailing12Emissions(organizationId, monthPeriod);

  // Get organization targets for comparison
  const targets = await prisma.partnerTargets.findUnique({
    where: { organizationId },
  });

  // Calculate vs target status
  const vsTargetData = calculateVsTargetStatus(
    parseFloat(ytdTotal.toString()),
    targets?.targetTonsCo2e ? parseFloat(targets.targetTonsCo2e.toString()) : null
  );

  // Calculate average quality grade
  const avgGrade = await calculateAvgQualityGrade(organizationId, monthPeriod);

  // Calculate estimated percentage
  const estimatedPercentage = await calculateEstimatedPercentage(organizationId, monthPeriod);

  await prisma.dashboardSnapshot.upsert({
    where: {
      organizationId_monthPeriod: {
        organizationId,
        monthPeriod,
      },
    },
    update: {
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
    create: {
      organizationId,
      monthPeriod,
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
    },
  });
}

// Helper functions

async function getOrganizationsForClose(targetOrgId?: string) {
  return prisma.organization.findMany({
    where: targetOrgId ? { id: targetOrgId } : {},
    select: { id: true },
  });
}

async function calculateCloseSummary(monthPeriod: string, result: MonthlyCloseResult) {
  const emissions = await prisma.monthlyEmission.findMany({
    where: { monthPeriod },
    select: {
      totalEmissions: true,
      qualityGrade: true,
      isEstimated: true,
    },
  });

  const grades = emissions.map(e => e.qualityGrade);
  const gradeFreq = grades.reduce((acc, grade) => {
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonGrade = Object.keys(gradeFreq).reduce((a, b) =>
    gradeFreq[a] > gradeFreq[b] ? a : b
  );

  result.summary.avgQualityGrade = mostCommonGrade;
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

function getDefaultEmissionFactor(activityKind: string): number {
  // Simplified default factors - in practice would use factor database
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
