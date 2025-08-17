/**
 * GHG Protocol Category 3.1 Attribution Calculations
 * 
 * Implements carbon attribution formulas for purchased goods and services
 * based on GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from 'decimal.js'
import { calculateIntensity, type IntensityLevel, type QualityGrade } from './intensity'
import type { ComputationType } from './mb-lb'

export interface AttributionRequest {
  supplierId: string
  productCategory: string
  quantityPurchased: Decimal
  unit: string
  purchasePeriod: {
    start: Date
    end: Date
  }
  intensitySource: 'supplier_specific' | 'site_specific' | 'family_average' | 'industry_average'
  computationType: ComputationType
}

export interface AttributionResult {
  supplierId: string
  productCategory: string
  quantityPurchased: Decimal
  unit: string
  intensityValue: Decimal // kg CO2e per unit
  intensitySource: string
  attributedEmissions: Decimal // tCO2e
  grade: QualityGrade
  confidence: number // 0-100%
  supportingDocs: string[]
  calculationMethod: string
  computedAt: Date
  version: string
  metadata: any
}

/**
 * Calculate GHG Protocol 3.1 attribution for purchased goods/services
 */
export async function calculateAttribution(
  request: AttributionRequest
): Promise<AttributionResult> {
  const { supplierId, productCategory, quantityPurchased, unit, purchasePeriod, intensitySource, computationType } = request

  // Get intensity value based on source priority
  const intensityResult = await getIntensityValue(
    supplierId,
    productCategory,
    intensitySource,
    purchasePeriod,
    computationType
  )

  // Calculate attributed emissions
  const attributedEmissions = quantityPurchased
    .times(intensityResult.intensity)
    .dividedBy(1000) // Convert kg to tonnes

  // Determine confidence based on data quality
  const confidence = calculateConfidence(
    intensitySource,
    intensityResult.grade,
    intensityResult.dataAge
  )

  return {
    supplierId,
    productCategory,
    quantityPurchased,
    unit,
    intensityValue: intensityResult.intensity,
    intensitySource: intensityResult.source,
    attributedEmissions,
    grade: intensityResult.grade,
    confidence,
    supportingDocs: intensityResult.supportingDocs,
    calculationMethod: 'GHG_Protocol_3.1',
    computedAt: new Date(),
    version: '1.0',
    metadata: {
      intensityDataAge: intensityResult.dataAge,
      fallbackApplied: intensityResult.fallbackApplied,
      originalIntensitySource: intensitySource,
      actualIntensitySource: intensityResult.source
    }
  }
}

/**
 * Get carbon intensity value based on hierarchy of data sources
 */
async function getIntensityValue(
  supplierId: string,
  productCategory: string,
  preferredSource: string,
  period: { start: Date, end: Date },
  computationType: ComputationType
): Promise<{
  intensity: Decimal
  source: string
  grade: QualityGrade
  dataAge: number // days
  supportingDocs: string[]
  fallbackApplied: boolean
}> {
  let fallbackApplied = false

  // 1. Try supplier-specific data first (highest quality)
  if (preferredSource === 'supplier_specific' || preferredSource === 'site_specific') {
    try {
      const supplierIntensity = await getSupplierSpecificIntensity(
        supplierId,
        productCategory,
        period,
        computationType
      )
      if (supplierIntensity) {
        return { ...supplierIntensity, fallbackApplied }
      }
    } catch (error) {
      console.warn(`Supplier-specific intensity not found for ${supplierId}:`, error)
      fallbackApplied = true
    }
  }

  // 2. Try product family average (medium quality)
  if (preferredSource === 'family_average' || fallbackApplied) {
    try {
      const familyIntensity = await getFamilyAverageIntensity(
        productCategory,
        period,
        computationType
      )
      if (familyIntensity) {
        return { ...familyIntensity, fallbackApplied }
      }
    } catch (error) {
      console.warn(`Family average intensity not found for ${productCategory}:`, error)
      fallbackApplied = true
    }
  }

  // 3. Fall back to industry average (lowest quality)
  try {
    const industryIntensity = await getIndustryAverageIntensity(
      productCategory,
      period,
      computationType
    )
    if (industryIntensity) {
      return { ...industryIntensity, fallbackApplied: true }
    }
  } catch (error) {
    console.warn(`Industry average intensity not found for ${productCategory}:`, error)
  }

  throw new Error(`No intensity data available for product category ${productCategory}`)
}

/**
 * Get supplier-specific carbon intensity
 */
async function getSupplierSpecificIntensity(
  supplierId: string,
  productCategory: string,
  period: { start: Date, end: Date },
  computationType: ComputationType
): Promise<{
  intensity: Decimal
  source: string
  grade: QualityGrade
  dataAge: number
  supportingDocs: string[]
} | null> {
  // Look for supplier's intensity records
  const records = await prisma.intensityRecord.findMany({
    where: {
      siteId: supplierId, // Assuming supplier sites are tracked
      periodStart: { gte: period.start },
      periodEnd: { lte: period.end },
      metadata: {
        path: ['productCategory'],
        equals: productCategory
      }
    },
    orderBy: { periodStart: 'desc' },
    take: 1
  })

  if (records.length === 0) {
    return null
  }

  const record = records[0]
  const dataAge = Math.floor((new Date().getTime() - record.computedAt.getTime()) / (1000 * 60 * 60 * 24))

  return {
    intensity: record.intensity,
    source: 'supplier_specific',
    grade: record.grade as QualityGrade,
    dataAge,
    supportingDocs: record.supportingDocs as string[]
  }
}

/**
 * Get product family average intensity
 */
async function getFamilyAverageIntensity(
  productCategory: string,
  period: { start: Date, end: Date },
  computationType: ComputationType
): Promise<{
  intensity: Decimal
  source: string
  grade: QualityGrade
  dataAge: number
  supportingDocs: string[]
} | null> {
  // Calculate average intensity across all suppliers for this product category
  const records = await prisma.intensityRecord.findMany({
    where: {
      level: 'FAMILY',
      familyId: productCategory,
      periodStart: { gte: period.start },
      periodEnd: { lte: period.end }
    }
  })

  if (records.length === 0) {
    return null
  }

  // Calculate weighted average by production volume
  let totalWeightedIntensity = new Decimal(0)
  let totalWeight = new Decimal(0)
  let allSupportingDocs: string[] = []
  let worstGrade: QualityGrade = 'A'
  let oldestDataAge = 0

  for (const record of records) {
    const weight = record.unitsProduced
    totalWeightedIntensity = totalWeightedIntensity.plus(record.intensity.times(weight))
    totalWeight = totalWeight.plus(weight)
    allSupportingDocs.push(...(record.supportingDocs as string[]))

    const dataAge = Math.floor((new Date().getTime() - record.computedAt.getTime()) / (1000 * 60 * 60 * 24))
    oldestDataAge = Math.max(oldestDataAge, dataAge)

    if (record.grade === 'C' || (record.grade === 'B' && worstGrade === 'A')) {
      worstGrade = record.grade as QualityGrade
    }
  }

  const avgIntensity = totalWeightedIntensity.dividedBy(totalWeight)

  return {
    intensity: avgIntensity,
    source: 'family_average',
    grade: worstGrade,
    dataAge: oldestDataAge,
    supportingDocs: [...new Set(allSupportingDocs)]
  }
}

/**
 * Get industry average intensity from external databases
 */
async function getIndustryAverageIntensity(
  productCategory: string,
  period: { start: Date, end: Date },
  computationType: ComputationType
): Promise<{
  intensity: Decimal
  source: string
  grade: QualityGrade
  dataAge: number
  supportingDocs: string[]
} | null> {
  // Look for industry benchmarks in emission factors
  const factors = await prisma.emissionFactor.findMany({
    where: {
      source: { contains: 'industry' },
      validFrom: { lte: period.end },
      OR: [
        { validTo: null },
        { validTo: { gte: period.start } }
      ]
    },
    orderBy: { validFrom: 'desc' },
    take: 1
  })

  if (factors.length === 0) {
    return null
  }

  const factor = factors[0]
  const dataAge = Math.floor((new Date().getTime() - factor.createdAt.getTime()) / (1000 * 60 * 60 * 24))

  return {
    intensity: new Decimal(factor.factorKgCO2ePerUnit),
    source: `industry_average_${factor.source}`,
    grade: 'C', // Industry averages are always low quality
    dataAge,
    supportingDocs: []
  }
}

/**
 * Calculate confidence score based on data quality factors
 */
function calculateConfidence(
  intensitySource: string,
  grade: QualityGrade,
  dataAge: number
): number {
  let baseScore = 50

  // Source quality scoring
  switch (intensitySource) {
    case 'supplier_specific':
      baseScore += 40
      break
    case 'site_specific':
      baseScore += 35
      break
    case 'family_average':
      baseScore += 20
      break
    case 'industry_average':
      baseScore += 5
      break
  }

  // Grade quality scoring
  switch (grade) {
    case 'A':
      baseScore += 10
      break
    case 'B':
      baseScore += 5
      break
    case 'C':
      baseScore -= 10
      break
  }

  // Data freshness scoring (penalty for old data)
  if (dataAge > 365) {
    baseScore -= 20
  } else if (dataAge > 180) {
    baseScore -= 10
  } else if (dataAge > 90) {
    baseScore -= 5
  }

  return Math.max(0, Math.min(100, baseScore))
}

/**
 * Batch attribution calculation for multiple products
 */
export async function calculateBatchAttribution(
  requests: AttributionRequest[]
): Promise<AttributionResult[]> {
  const results = await Promise.allSettled(
    requests.map(request => calculateAttribution(request))
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      // Return error result with degraded quality
      const request = requests[index]
      return {
        supplierId: request.supplierId,
        productCategory: request.productCategory,
        quantityPurchased: request.quantityPurchased,
        unit: request.unit,
        intensityValue: new Decimal(0),
        intensitySource: 'error',
        attributedEmissions: new Decimal(0),
        grade: 'C' as QualityGrade,
        confidence: 0,
        supportingDocs: [],
        calculationMethod: 'GHG_Protocol_3.1_error',
        computedAt: new Date(),
        version: '1.0',
        metadata: {
          error: result.reason?.message || 'Unknown error',
          originalRequest: request
        }
      }
    }
  })
}

/**
 * Get attribution summary for a reporting period
 */
export async function getAttributionSummary(
  organizationId: string,
  reportingPeriod: { start: Date, end: Date }
): Promise<{
  totalAttributions: number
  totalEmissions: Decimal // tCO2e
  qualityBreakdown: Record<QualityGrade, number>
  confidenceAverage: number
  topCategories: Array<{
    category: string
    emissions: Decimal
    percentage: number
  }>
}> {
  // This would query a stored attributions table in a real implementation
  // For now, we'll return a mock summary structure
  
  return {
    totalAttributions: 0,
    totalEmissions: new Decimal(0),
    qualityBreakdown: { A: 0, B: 0, C: 0 },
    confidenceAverage: 0,
    topCategories: []
  }
}
