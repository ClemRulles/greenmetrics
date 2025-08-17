import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';

export type EstimationResult = {
  scope1: number;
  scope2: number;
  total: number;
  method: string;
  confidence: number; // 0-100 percentage
  details: {
    source: string;
    reasoning: string;
    fallbackLevel: number; // 1 = best, higher = more fallback
  };
};

/**
 * Estimate monthly emissions using secondary factors and heuristics
 * Used during monthly close when real data is missing (Grade C estimates)
 * 
 * @param organizationId - Organization to estimate for
 * @param monthPeriod - Month in YYYY-MM format
 */
export async function estimateMonthlyEmissions(
  organizationId: string,
  monthPeriod: string
): Promise<EstimationResult> {
  console.log(`[Estimation] Generating Grade C estimates for ${organizationId}/${monthPeriod}`);

  // Try estimation methods in priority order
  const estimationMethods = [
    () => estimateFromLastKnownIntensity(organizationId, monthPeriod),
    () => estimateFromRevenueHeuristic(organizationId, monthPeriod),
    () => estimateFromIndustryAverage(organizationId, monthPeriod),
    () => estimateFromOrganizationAverage(organizationId, monthPeriod),
    () => estimateMinimal(organizationId, monthPeriod),
  ];

  for (let i = 0; i < estimationMethods.length; i++) {
    try {
      const result = await estimationMethods[i]();
      if (result && result.total > 0) {
        result.details.fallbackLevel = i + 1;
        console.log(`[Estimation] Used method ${i + 1}: ${result.method} (confidence: ${result.confidence}%)`);
        return result;
      }
    } catch (error) {
      console.warn(`[Estimation] Method ${i + 1} failed:`, error);
    }
  }

  // If all else fails, return minimal estimate
  return estimateMinimal(organizationId, monthPeriod);
}

/**
 * Method 1: Estimate from last known carbon intensity
 * Uses most recent actual intensity data with current production estimates
 */
async function estimateFromLastKnownIntensity(
  organizationId: string,
  monthPeriod: string
): Promise<EstimationResult | null> {
  
  // Find the most recent intensity record
  const recentIntensity = await prisma.intensityRecord.findFirst({
    where: {
      organizationId,
      createdAt: {
        lt: new Date(), // Before now
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!recentIntensity) {
    return null;
  }

  // Get estimated production volume for current month
  const estimatedProduction = await estimateProductionVolume(organizationId, monthPeriod);
  
  if (estimatedProduction <= 0) {
    return null;
  }

  // Calculate emissions using last known intensity
  const intensityValue = parseFloat(recentIntensity.intensityValue.toString());
  const totalEmissions = estimatedProduction * intensityValue;
  
  // Split between scope 1 and 2 based on historical ratios
  const scopeRatio = await getHistoricalScopeRatio(organizationId);
  
  const scope1 = totalEmissions * scopeRatio.scope1Pct;
  const scope2 = totalEmissions * scopeRatio.scope2Pct;

  // Confidence decreases with age of intensity data
  const ageMonths = Math.floor((Date.now() - recentIntensity.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000));
  const confidence = Math.max(30, 70 - ageMonths * 5); // 70% base, -5% per month

  return {
    scope1,
    scope2,
    total: totalEmissions,
    method: 'last_known_intensity',
    confidence,
    details: {
      source: `Intensity from ${recentIntensity.createdAt.toISOString().slice(0, 7)} (${intensityValue.toFixed(4)} kgCO₂e/unit)`,
      reasoning: `Applied last known intensity (${ageMonths} months old) to estimated production volume`,
      fallbackLevel: 1,
    },
  };
}

/**
 * Method 2: Estimate from revenue heuristic
 * Uses revenue data with industry-specific emission-to-revenue ratios
 */
async function estimateFromRevenueHeuristic(
  organizationId: string,
  monthPeriod: string
): Promise<EstimationResult | null> {

  // Check if revenue heuristic is enabled for this organization
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { 
      countryCode: true,
      // In a real implementation, we'd have industry sector and revenue data
    },
  });

  if (!org) {
    return null;
  }

  // Get monthly revenue estimate (placeholder - would need revenue data source)
  const monthlyRevenue = await estimateMonthlyRevenue(organizationId, monthPeriod);
  
  if (monthlyRevenue <= 0) {
    return null;
  }

  // Get industry-specific emission-to-revenue ratio
  const industryRatio = await getIndustryEmissionToRevenueRatio(org.countryCode);
  
  const totalEmissions = monthlyRevenue * industryRatio.tco2ePerEur;
  
  // Use industry scope split
  const scope1 = totalEmissions * industryRatio.scope1Pct;
  const scope2 = totalEmissions * industryRatio.scope2Pct;

  const confidence = 45; // Medium confidence for revenue-based estimates

  return {
    scope1,
    scope2,
    total: totalEmissions,
    method: 'revenue_heuristic',
    confidence,
    details: {
      source: `Industry ratio: ${industryRatio.tco2ePerEur.toFixed(6)} tCO₂e/EUR`,
      reasoning: `Applied industry emission-to-revenue ratio to estimated monthly revenue`,
      fallbackLevel: 2,
    },
  };
}

/**
 * Method 3: Estimate from industry average
 * Uses statistical industry averages based on organization size/sector
 */
async function estimateFromIndustryAverage(
  organizationId: string,
  monthPeriod: string
): Promise<EstimationResult | null> {

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { countryCode: true },
  });

  if (!org) {
    return null;
  }

  // Get organization size estimate (employee count, revenue range, etc.)
  const orgSize = await estimateOrganizationSize(organizationId);
  
  // Get industry baseline emissions
  const industryBaseline = await getIndustryBaselineEmissions(org.countryCode, orgSize);
  
  // Apply monthly factor (annual baseline / 12)
  const monthlyEmissions = industryBaseline.annualTco2e / 12;
  
  const scope1 = monthlyEmissions * industryBaseline.scope1Pct;
  const scope2 = monthlyEmissions * industryBaseline.scope2Pct;

  const confidence = 25; // Lower confidence for generic industry averages

  return {
    scope1,
    scope2,
    total: monthlyEmissions,
    method: 'industry_average',
    confidence,
    details: {
      source: `Industry baseline: ${industryBaseline.annualTco2e.toFixed(1)} tCO₂e/year (size: ${orgSize})`,
      reasoning: `Applied industry average emissions for organization size and sector`,
      fallbackLevel: 3,
    },
  };
}

/**
 * Method 4: Estimate from organization's own historical average
 * Uses organization's past emissions when available
 */
async function estimateFromOrganizationAverage(
  organizationId: string,
  monthPeriod: string
): Promise<EstimationResult | null> {

  // Get historical emissions from previous months
  const historicalEmissions = await prisma.monthlyEmission.findMany({
    where: {
      organizationId,
      isEstimated: false, // Only use real data for averages
    },
    orderBy: {
      monthPeriod: 'desc',
    },
    take: 12, // Last 12 months of real data
  });

  if (historicalEmissions.length === 0) {
    return null;
  }

  // Calculate averages
  const avgScope1 = historicalEmissions.reduce((sum, e) => sum + parseFloat(e.scope1Total.toString()), 0) / historicalEmissions.length;
  const avgScope2 = historicalEmissions.reduce((sum, e) => sum + parseFloat(e.scope2Total.toString()), 0) / historicalEmissions.length;
  const avgTotal = avgScope1 + avgScope2;

  // Confidence based on data recency and quantity
  const avgAge = historicalEmissions.reduce((sum, e) => {
    const [year, month] = e.monthPeriod.split('-').map(Number);
    const ageMonths = (new Date().getFullYear() - year) * 12 + (new Date().getMonth() + 1 - month);
    return sum + ageMonths;
  }, 0) / historicalEmissions.length;

  const confidence = Math.max(20, 60 - avgAge * 2); // Base 60%, -2% per month average age

  return {
    scope1: avgScope1,
    scope2: avgScope2,
    total: avgTotal,
    method: 'organization_average',
    confidence,
    details: {
      source: `${historicalEmissions.length} months of historical data`,
      reasoning: `Applied organization's historical average emissions over past ${historicalEmissions.length} months`,
      fallbackLevel: 4,
    },
  };
}

/**
 * Method 5: Minimal fallback estimate
 * Last resort with very basic assumptions
 */
async function estimateMinimal(
  organizationId: string,
  monthPeriod: string
): Promise<EstimationResult> {

  // Use minimal baseline based on organization existence
  const baselineEmissions = 1.0; // 1 tCO₂e minimum monthly estimate
  
  const scope1 = baselineEmissions * 0.3; // 30% scope 1
  const scope2 = baselineEmissions * 0.7; // 70% scope 2

  return {
    scope1,
    scope2,
    total: baselineEmissions,
    method: 'minimal_fallback',
    confidence: 10, // Very low confidence
    details: {
      source: 'Minimal baseline assumption',
      reasoning: 'Applied minimal fallback estimate when no other data available',
      fallbackLevel: 5,
    },
  };
}

// Helper functions for estimation

async function estimateProductionVolume(organizationId: string, monthPeriod: string): Promise<number> {
  // Get recent production data to estimate current month
  const recentProduction = await prisma.productionStat.findMany({
    where: {
      organizationId,
    },
    orderBy: {
      year: 'desc',
    },
    take: 12,
  });

  if (recentProduction.length === 0) {
    return 0;
  }

  // Calculate average monthly production
  const avgUnits = recentProduction.reduce((sum, p) => sum + parseFloat(p.units.toString()), 0) / recentProduction.length;
  
  // Assume monthly production = annual / 12
  return avgUnits / 12;
}

async function getHistoricalScopeRatio(organizationId: string): Promise<{ scope1Pct: number; scope2Pct: number }> {
  const historical = await prisma.monthlyEmission.findMany({
    where: {
      organizationId,
      isEstimated: false,
    },
    take: 6, // Last 6 months
  });

  if (historical.length === 0) {
    return { scope1Pct: 0.3, scope2Pct: 0.7 }; // Default split
  }

  const totalScope1 = historical.reduce((sum, e) => sum + parseFloat(e.scope1Total.toString()), 0);
  const totalScope2 = historical.reduce((sum, e) => sum + parseFloat(e.scope2Total.toString()), 0);
  const total = totalScope1 + totalScope2;

  if (total === 0) {
    return { scope1Pct: 0.3, scope2Pct: 0.7 };
  }

  return {
    scope1Pct: totalScope1 / total,
    scope2Pct: totalScope2 / total,
  };
}

async function estimateMonthlyRevenue(organizationId: string, monthPeriod: string): Promise<number> {
  // Placeholder - in reality would integrate with accounting systems or revenue estimates
  // For now, return 0 to skip revenue-based estimation
  return 0;
}

async function getIndustryEmissionToRevenueRatio(countryCode: string | null): Promise<{
  tco2ePerEur: number;
  scope1Pct: number;
  scope2Pct: number;
}> {
  // Simplified industry ratios by country
  const ratios: Record<string, { tco2ePerEur: number; scope1Pct: number; scope2Pct: number }> = {
    'BE': { tco2ePerEur: 0.0001, scope1Pct: 0.25, scope2Pct: 0.75 }, // Belgium
    'FR': { tco2ePerEur: 0.0001, scope1Pct: 0.20, scope2Pct: 0.80 }, // France (more nuclear)
    'DE': { tco2ePerEur: 0.00012, scope1Pct: 0.35, scope2Pct: 0.65 }, // Germany (more industry)
    'default': { tco2ePerEur: 0.0001, scope1Pct: 0.30, scope2Pct: 0.70 },
  };

  return ratios[countryCode || 'default'] || ratios.default;
}

async function estimateOrganizationSize(organizationId: string): Promise<'small' | 'medium' | 'large'> {
  // Estimate organization size based on available data
  const memberCount = await prisma.membership.count({
    where: { organizationId },
  });

  const reportCount = await prisma.report.count({
    where: { organizationId },
  });

  // Simple heuristic
  if (memberCount >= 10 || reportCount >= 5) {
    return 'large';
  } else if (memberCount >= 3 || reportCount >= 2) {
    return 'medium';
  } else {
    return 'small';
  }
}

async function getIndustryBaselineEmissions(
  countryCode: string | null,
  orgSize: string
): Promise<{
  annualTco2e: number;
  scope1Pct: number;
  scope2Pct: number;
}> {
  // Simplified industry baselines by country and size
  const baselines: Record<string, Record<string, { annualTco2e: number; scope1Pct: number; scope2Pct: number }>> = {
    'BE': {
      small: { annualTco2e: 50, scope1Pct: 0.25, scope2Pct: 0.75 },
      medium: { annualTco2e: 200, scope1Pct: 0.30, scope2Pct: 0.70 },
      large: { annualTco2e: 1000, scope1Pct: 0.35, scope2Pct: 0.65 },
    },
    'default': {
      small: { annualTco2e: 60, scope1Pct: 0.30, scope2Pct: 0.70 },
      medium: { annualTco2e: 250, scope1Pct: 0.30, scope2Pct: 0.70 },
      large: { annualTco2e: 1200, scope1Pct: 0.30, scope2Pct: 0.70 },
    },
  };

  const countryBaselines = baselines[countryCode || 'default'] || baselines.default;
  return countryBaselines[orgSize] || countryBaselines.medium;
}
