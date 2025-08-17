import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Use Node.js runtime for database operations
export const runtime = 'nodejs';

const DashboardQuerySchema = z.object({
  period: z.enum(['6m', '12m', 'ytd', 'all']).optional().default('12m'),
  includeEstimates: z.boolean().optional().default(true),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    // TODO: Add proper authentication check
    // const { userId } = await requireOrgRole(orgId, 'VIEWER');
    
    const url = new URL(request.url);
    const query = DashboardQuerySchema.parse({
      period: url.searchParams.get('period') || '12m',
      includeEstimates: url.searchParams.get('includeEstimates') !== 'false',
    });

    console.log(`[DashboardData] Fetching data for org ${orgId}, period: ${query.period}`);

    // Get date range based on period
    const dateRange = getDateRange(query.period);
    
    // Fetch monthly emission snapshots
    const monthlyEmissions = await fetchMonthlyEmissions(orgId, dateRange, query.includeEstimates);
    
    // Fetch current dashboard snapshot
    const currentSnapshot = await fetchCurrentSnapshot(orgId);
    
    // Fetch organization targets
    const targets = await fetchOrganizationTargets(orgId);
    
    // Calculate summary metrics
    const summary = calculateSummaryMetrics(monthlyEmissions, currentSnapshot, targets);
    
    // Format chart data
    const chartData = formatChartData(monthlyEmissions, query.period);

    const response = {
      organizationId: orgId,
      period: query.period,
      includeEstimates: query.includeEstimates,
      timestamp: new Date().toISOString(),
      summary,
      chartData,
      targets,
      metadata: {
        dataPoints: monthlyEmissions.length,
        latestPeriod: monthlyEmissions[monthlyEmissions.length - 1]?.monthPeriod,
        hasCurrentSnapshot: !!currentSnapshot,
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[DashboardData] Error:', error);
    
    if (error instanceof Error && error.message.includes('unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get date range for the specified period
 */
function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (period) {
    case '6m':
      return {
        start: new Date(currentYear, currentMonth - 6, 1),
        end: now,
      };
    case '12m':
      return {
        start: new Date(currentYear, currentMonth - 12, 1),
        end: now,
      };
    case 'ytd':
      return {
        start: new Date(currentYear, 0, 1),
        end: now,
      };
    case 'all':
      return {
        start: new Date(2020, 0, 1), // Reasonable start date
        end: now,
      };
    default:
      return {
        start: new Date(currentYear, currentMonth - 12, 1),
        end: now,
      };
  }
}

/**
 * Fetch monthly emission records for the organization
 */
async function fetchMonthlyEmissions(
  orgId: string,
  dateRange: { start: Date; end: Date },
  includeEstimates: boolean
) {
  // Generate period keys for the date range
  const periodKeys = generatePeriodKeys(dateRange.start, dateRange.end);

  const whereClause = {
    organizationId: orgId,
    monthPeriod: {
      in: periodKeys,
    },
    ...(includeEstimates ? {} : { isEstimated: false }),
  };

  // For now, return mock data since the new models aren't in the DB yet
  // In production, this would be:
  // const emissions = await prisma.monthlyEmission.findMany({ where: whereClause, orderBy: { monthPeriod: 'asc' } });
  
  const mockEmissions = generateMockEmissions(orgId, periodKeys, includeEstimates);
  
  return mockEmissions;
}

/**
 * Fetch current dashboard snapshot
 */
async function fetchCurrentSnapshot(orgId: string) {
  const currentPeriod = getCurrentPeriod();
  
  // Mock data for now
  return {
    organizationId: orgId,
    monthPeriod: currentPeriod,
    totalEmissions: 125.4,
    scope1Emissions: 37.6,
    scope2Emissions: 87.8,
    avgQualityGrade: 'B',
    dataCompleteness: 78.5,
    estimatedPercentage: 25.0,
    ytdEmissions: 1089.2,
    trailing12Months: 1456.8,
    vsTargetStatus: 'WATCH',
    vsTargetPercentage: 82.3,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fetch organization targets
 */
async function fetchOrganizationTargets(orgId: string) {
  try {
    const targets = await prisma.partnerTargets.findUnique({
      where: { organizationId: orgId },
    });

    return targets ? {
      coverageTarget: targets.coveragePct,
      qualityMinimum: targets.dqsMin,
      emissionsTarget: targets.targetTons,
      baselineYear: targets.baselineYear,
    } : null;
  } catch (error) {
    console.warn('[DashboardData] Could not fetch targets:', error);
    return null;
  }
}

/**
 * Calculate summary metrics
 */
function calculateSummaryMetrics(emissions: any[], snapshot: any, targets: any) {
  const currentMonth = emissions[emissions.length - 1];
  const ytdEmissions = emissions
    .filter(e => e.monthPeriod.startsWith(new Date().getFullYear().toString()))
    .reduce((sum, e) => sum + e.totalEmissions, 0);
  
  const trailing12Emissions = emissions
    .slice(-12)
    .reduce((sum, e) => sum + e.totalEmissions, 0);

  const avgQuality = calculateAverageQuality(emissions);
  const estimatedPercentage = emissions.filter(e => e.isEstimated).length / emissions.length * 100;

  return {
    currentMonth: {
      emissions: currentMonth?.totalEmissions || 0,
      quality: currentMonth?.qualityGrade || 'C',
      isEstimated: currentMonth?.isEstimated || false,
    },
    ytd: {
      emissions: ytdEmissions,
      vsTarget: targets?.emissionsTarget ? {
        percentage: (ytdEmissions / targets.emissionsTarget) * 100,
        status: calculateTargetStatus(ytdEmissions, targets.emissionsTarget),
      } : null,
    },
    trailing12: {
      emissions: trailing12Emissions,
    },
    dataQuality: {
      avgGrade: avgQuality,
      realDataPercentage: 100 - estimatedPercentage,
      estimatedPercentage,
    },
  };
}

/**
 * Format data for charts
 */
function formatChartData(emissions: any[], period: string) {
  const monthlyData = emissions.map(e => ({
    period: e.monthPeriod,
    value: e.totalEmissions,
    quality: e.qualityGrade,
    isEstimated: e.isEstimated,
  }));

  // Calculate YTD cumulative data
  const currentYear = new Date().getFullYear().toString();
  const ytdEmissions = emissions.filter(e => e.monthPeriod.startsWith(currentYear));
  let cumulativeYtd = 0;
  const ytdData = ytdEmissions.map(e => {
    cumulativeYtd += e.totalEmissions;
    return {
      period: e.monthPeriod,
      value: cumulativeYtd,
      quality: e.qualityGrade,
      isEstimated: e.isEstimated,
    };
  });

  // Calculate trailing 12-month rolling totals
  const trailing12Data = emissions.map((_, index) => {
    const start = Math.max(0, index - 11);
    const rolling12 = emissions.slice(start, index + 1);
    const total = rolling12.reduce((sum, e) => sum + e.totalEmissions, 0);
    
    return {
      period: emissions[index].monthPeriod,
      value: total,
      quality: calculateAverageQuality(rolling12),
      isEstimated: rolling12.some(e => e.isEstimated),
    };
  }).slice(-12); // Only show last 12 points

  return {
    monthly: monthlyData,
    ytd: ytdData,
    trailing12: trailing12Data,
  };
}

// Helper functions

function generatePeriodKeys(start: Date, end: Date): string[] {
  const periods = [];
  const current = new Date(start);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    periods.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }
  
  return periods;
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function generateMockEmissions(orgId: string, periods: string[], includeEstimates: boolean) {
  return periods.map((period, index) => {
    const isEstimated = includeEstimates && Math.random() < 0.3; // 30% estimated
    const baseEmissions = 80 + (Math.random() * 60); // 80-140 tCO₂e
    const quality = isEstimated ? 'C' : (Math.random() < 0.4 ? 'A' : 'B');
    
    return {
      id: `mock-${orgId}-${period}`,
      organizationId: orgId,
      monthPeriod: period,
      scope1Total: baseEmissions * 0.3,
      scope2Total: baseEmissions * 0.7,
      totalEmissions: baseEmissions,
      qualityGrade: quality,
      isEstimated,
      estimationMethod: isEstimated ? 'last_known_intensity' : null,
      dataCompleteness: isEstimated ? 45 : 75 + (Math.random() * 25),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

function calculateAverageQuality(emissions: any[]): string {
  if (emissions.length === 0) return 'C';
  
  const gradeValues: Record<string, number> = { A: 3, B: 2, C: 1 };
  const avgScore = emissions.reduce((sum, e) => sum + (gradeValues[e.qualityGrade] || 1), 0) / emissions.length;
  
  if (avgScore >= 2.5) return 'A';
  if (avgScore >= 1.5) return 'B';
  return 'C';
}

function calculateTargetStatus(ytdEmissions: number, annualTarget: number): string {
  const percentage = (ytdEmissions / annualTarget) * 100;
  
  if (percentage <= 75) return 'OK';
  if (percentage <= 90) return 'WATCH';
  return 'OFF_TRACK';
}
