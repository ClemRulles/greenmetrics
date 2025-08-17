/**
 * Site and Family Carbon Intensity Calculations
 * 
 * Calculates carbon intensity (kg CO2e per unit) at different levels:
 * - SITE: Individual site intensity with specific readings and factors
 * - FAMILY: Product family intensity aggregated across multiple sites
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from 'decimal.js'
import { selectGridFactor, type ComputationType, type QualityGrade } from './mb-lb'

export type IntensityLevel = 'SITE' | 'FAMILY'
export type { QualityGrade } // Re-export for other modules

export interface IntensityCalculationRequest {
  level: IntensityLevel
  entityId: string // siteId or familyId
  periodStart: Date
  periodEnd: Date
  computationType: ComputationType
  includeScope1?: boolean
  includeScope2?: boolean
}

export interface IntensityCalculationResult {
  level: IntensityLevel
  entityId: string
  periodStart: Date
  periodEnd: Date
  scope1Emissions: Decimal // tCO2e
  scope2Emissions: Decimal // tCO2e
  totalEmissions: Decimal // tCO2e
  unitsProduced: Decimal
  intensity: Decimal // kg CO2e per unit
  grade: QualityGrade
  supportingDocs: string[] // document IDs
  computedAt: Date
  version: string
  metadata: any
}

/**
 * Calculate carbon intensity for a site or product family
 */
export async function calculateIntensity(
  request: IntensityCalculationRequest
): Promise<IntensityCalculationResult> {
  const { level, entityId, periodStart, periodEnd, computationType } = request
  
  if (level === 'SITE') {
    return await calculateSiteIntensity(entityId, periodStart, periodEnd, computationType)
  } else {
    return await calculateFamilyIntensity(entityId, periodStart, periodEnd, computationType)
  }
}

/**
 * Calculate intensity for a specific site
 */
async function calculateSiteIntensity(
  siteId: string,
  periodStart: Date,
  periodEnd: Date,
  computationType: ComputationType
): Promise<IntensityCalculationResult> {
  // Get all readings for the site in the period
  const readings = await prisma.reading.findMany({
    where: {
      siteId,
      month: {
        gte: periodStart,
        lte: periodEnd
      }
    },
    include: {
      document: true
    },
    orderBy: { month: 'asc' }
  })

  if (readings.length === 0) {
    throw new Error(`No readings found for site ${siteId} in period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
  }

  // Calculate emissions for each reading
  let scope1Emissions = new Decimal(0)
  let scope2Emissions = new Decimal(0)
  let totalUnits = new Decimal(0)
  const supportingDocs: string[] = []
  let lowestGrade: QualityGrade = 'A'

  for (const reading of readings) {
    const emissions = await calculateReadingEmissions(reading, computationType)
    
    if (reading.unit.toLowerCase().includes('gas') || reading.unit.toLowerCase().includes('fuel')) {
      scope1Emissions = scope1Emissions.plus(emissions.emissions)
    } else if (reading.unit.toLowerCase().includes('kwh') || reading.unit.toLowerCase().includes('electricity')) {
      scope2Emissions = scope2Emissions.plus(emissions.emissions)
    }
    
    totalUnits = totalUnits.plus(reading.value)
    supportingDocs.push(reading.documentId)
    
    if (emissions.grade === 'C' || (emissions.grade === 'B' && lowestGrade === 'A')) {
      lowestGrade = emissions.grade
    }
  }

  const totalEmissions = scope1Emissions.plus(scope2Emissions)
  const intensity = totalEmissions.times(1000).dividedBy(totalUnits) // Convert to kg CO2e per unit

  return {
    level: 'SITE',
    entityId: siteId,
    periodStart,
    periodEnd,
    scope1Emissions: scope1Emissions.dividedBy(1000), // Convert to tCO2e
    scope2Emissions: scope2Emissions.dividedBy(1000), // Convert to tCO2e
    totalEmissions: totalEmissions.dividedBy(1000), // Convert to tCO2e
    unitsProduced: totalUnits,
    intensity,
    grade: lowestGrade,
    supportingDocs: [...new Set(supportingDocs)], // Remove duplicates
    computedAt: new Date(),
    version: '1.0',
    metadata: {
      readingsCount: readings.length,
      computationType,
      calculationMethod: 'site_direct'
    }
  }
}

/**
 * Calculate intensity for a product family across multiple sites
 */
async function calculateFamilyIntensity(
  familyId: string,
  periodStart: Date,
  periodEnd: Date,
  computationType: ComputationType
): Promise<IntensityCalculationResult> {
  // Get all sites that produce this family
  // Note: This would require a product-family-to-site mapping table in a real implementation
  // For now, we'll simulate this with metadata queries
  
  const sites = await prisma.reading.findMany({
    where: {
      month: {
        gte: periodStart,
        lte: periodEnd
      },
      document: {
        metadata: {
          path: ['productFamily'],
          equals: familyId
        }
      }
    },
    select: {
      siteId: true
    },
    distinct: ['siteId']
  })

  if (sites.length === 0) {
    throw new Error(`No sites found producing family ${familyId} in period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
  }

  // Calculate intensity for each site and aggregate
  let totalScope1 = new Decimal(0)
  let totalScope2 = new Decimal(0)
  let totalUnits = new Decimal(0)
  const allSupportingDocs: string[] = []
  let lowestGrade: QualityGrade = 'A'

  for (const site of sites) {
    try {
      const siteIntensity = await calculateSiteIntensity(
        site.siteId,
        periodStart,
        periodEnd,
        computationType
      )

      totalScope1 = totalScope1.plus(siteIntensity.scope1Emissions)
      totalScope2 = totalScope2.plus(siteIntensity.scope2Emissions)
      totalUnits = totalUnits.plus(siteIntensity.unitsProduced)
      allSupportingDocs.push(...siteIntensity.supportingDocs)

      if (siteIntensity.grade === 'C' || (siteIntensity.grade === 'B' && lowestGrade === 'A')) {
        lowestGrade = siteIntensity.grade
      }
    } catch (error) {
      console.warn(`Failed to calculate intensity for site ${site.siteId}:`, error)
      lowestGrade = 'C' // Degrade quality if any site fails
    }
  }

  const totalEmissions = totalScope1.plus(totalScope2)
  const intensity = totalEmissions.times(1000).dividedBy(totalUnits) // Convert to kg CO2e per unit

  return {
    level: 'FAMILY',
    entityId: familyId,
    periodStart,
    periodEnd,
    scope1Emissions: totalScope1,
    scope2Emissions: totalScope2,
    totalEmissions,
    unitsProduced: totalUnits,
    intensity,
    grade: lowestGrade,
    supportingDocs: [...new Set(allSupportingDocs)], // Remove duplicates
    computedAt: new Date(),
    version: '1.0',
    metadata: {
      sitesCount: sites.length,
      computationType,
      calculationMethod: 'family_aggregated'
    }
  }
}

/**
 * Calculate emissions for a single reading
 */
async function calculateReadingEmissions(
  reading: any,
  computationType: ComputationType
): Promise<{
  emissions: Decimal // kg CO2e
  grade: QualityGrade
  factorUsed: string
}> {
  // Determine activity kind based on unit
  let activityKind: any = 'ELECTRICITY' // Default
  
  if (reading.unit.toLowerCase().includes('gas')) {
    activityKind = 'NATURAL_GAS'
  } else if (reading.unit.toLowerCase().includes('fuel')) {
    activityKind = 'DIESEL'
  } else if (reading.unit.toLowerCase().includes('kwh')) {
    activityKind = 'ELECTRICITY'
  }

  // Get appropriate emission factor
  const gridFactor = await selectGridFactor({
    activityKind,
    geography: reading.document?.metadata?.geography || 'FR', // Default to France
    timestamp: reading.month,
    computationType,
    proofDocuments: reading.document?.proofDocuments || []
  })

  // Calculate emissions
  const emissions = new Decimal(reading.value).times(gridFactor.factor)

  return {
    emissions,
    grade: gridFactor.qualityGrade,
    factorUsed: gridFactor.factorId
  }
}

/**
 * Store intensity calculation result in database
 */
export async function storeIntensityRecord(
  result: IntensityCalculationResult
): Promise<string> {
  const record = await prisma.intensityRecord.create({
    data: {
      siteId: result.level === 'SITE' ? result.entityId : null,
      familyId: result.level === 'FAMILY' ? result.entityId : null,
      level: result.level,
      periodStart: result.periodStart,
      periodEnd: result.periodEnd,
      scope1Emissions: result.scope1Emissions,
      scope2Emissions: result.scope2Emissions,
      unitsProduced: result.unitsProduced,
      intensity: result.intensity,
      grade: result.grade,
      supportingDocs: result.supportingDocs,
      computedAt: result.computedAt,
      version: result.version,
      metadata: result.metadata
    }
  })

  return record.id
}

/**
 * Get historical intensity records for trending analysis
 */
export async function getIntensityHistory(
  level: IntensityLevel,
  entityId: string,
  limit: number = 12
): Promise<IntensityCalculationResult[]> {
  const records = await prisma.intensityRecord.findMany({
    where: {
      level,
      ...(level === 'SITE' ? { siteId: entityId } : { familyId: entityId })
    },
    orderBy: { periodStart: 'desc' },
    take: limit
  })

  return records.map(record => ({
    level: record.level as IntensityLevel,
    entityId: record.siteId || record.familyId || '',
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    scope1Emissions: record.scope1Emissions,
    scope2Emissions: record.scope2Emissions,
    totalEmissions: record.scope1Emissions.plus(record.scope2Emissions),
    unitsProduced: record.unitsProduced,
    intensity: record.intensity,
    grade: record.grade as QualityGrade,
    supportingDocs: record.supportingDocs as string[],
    computedAt: record.computedAt,
    version: record.version,
    metadata: record.metadata
  }))
}

/**
 * Compare intensity across different entities
 */
export async function compareIntensities(
  entities: Array<{level: IntensityLevel, entityId: string}>,
  periodStart: Date,
  periodEnd: Date
): Promise<Array<IntensityCalculationResult & {comparison: {rank: number, percentile: number}}>> {
  const results = await Promise.all(
    entities.map(entity => 
      calculateIntensity({
        ...entity,
        periodStart,
        periodEnd,
        computationType: 'LOCATION_BASED' // Use consistent basis for comparison
      })
    )
  )

  // Sort by intensity for ranking
  const sorted = results.sort((a, b) => a.intensity.comparedTo(b.intensity))
  
  return sorted.map((result, index) => ({
    ...result,
    comparison: {
      rank: index + 1,
      percentile: Math.round(((sorted.length - index) / sorted.length) * 100)
    }
  }))
}
