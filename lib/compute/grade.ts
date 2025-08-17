/**
 * Quality Grading System for Carbon Computation
 * 
 * Implements automatic quality grade assignment (A/B/C) based on:
 * - Data availability and completeness
 * - Proof document quality and verification
 * - Computation method accuracy
 * - Data freshness and reliability
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from 'decimal.js'
import type { QualityGrade } from './mb-lb'

export interface QualityAssessment {
  grade: QualityGrade
  score: number // 0-100
  factors: {
    dataCompleteness: number
    proofQuality: number
    methodAccuracy: number
    dataFreshness: number
  }
  reasoning: string[]
  recommendations: string[]
}

export interface GradingCriteria {
  readingId?: string
  documentId?: string
  computationType: 'LOCATION_BASED' | 'MARKET_BASED'
  hasProofDocuments: boolean
  proofDocuments?: string[]
  dataAge: number // days
  methodUsed: string
  factorSource: string
  uncertaintyLevel?: number
}

/**
 * Assign quality grade based on comprehensive criteria
 */
export async function assignQualityGrade(
  criteria: GradingCriteria
): Promise<QualityAssessment> {
  const scores = await calculateQualityScores(criteria)
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4
  
  // Determine grade based on total score
  let grade: QualityGrade
  if (totalScore >= 85) {
    grade = 'A'
  } else if (totalScore >= 65) {
    grade = 'B'
  } else {
    grade = 'C'
  }

  const reasoning = generateReasoning(scores, criteria)
  const recommendations = generateRecommendations(scores, criteria)

  return {
    grade,
    score: Math.round(totalScore),
    factors: scores,
    reasoning,
    recommendations
  }
}

/**
 * Calculate individual quality factor scores
 */
async function calculateQualityScores(criteria: GradingCriteria): Promise<{
  dataCompleteness: number
  proofQuality: number
  methodAccuracy: number
  dataFreshness: number
}> {
  const dataCompleteness = await assessDataCompleteness(criteria)
  const proofQuality = await assessProofQuality(criteria)
  const methodAccuracy = assessMethodAccuracy(criteria)
  const dataFreshness = assessDataFreshness(criteria)

  return {
    dataCompleteness,
    proofQuality,
    methodAccuracy,
    dataFreshness
  }
}

/**
 * Assess data completeness and availability
 */
async function assessDataCompleteness(criteria: GradingCriteria): Promise<number> {
  let score = 50 // Base score

  // Check if we have a specific reading
  if (criteria.readingId) {
    const reading = await prisma.reading.findUnique({
      where: { id: criteria.readingId },
      include: { document: true }
    })

    if (reading) {
      score += 20 // Has specific reading data

      // Check data quality indicators
      if (reading.value.greaterThan(0)) {
        score += 10 // Non-zero value
      }

      if (reading.unit && reading.unit.length > 0) {
        score += 5 // Has unit specified
      }

      if (reading.document?.metadata) {
        score += 10 // Has metadata
      }

      // Check for site information
      if (reading.siteId && reading.siteId.length > 0) {
        score += 5 // Has site mapping
      }
    }
  } else {
    score -= 20 // No specific reading data
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Assess proof document quality and verification
 */
async function assessProofQuality(criteria: GradingCriteria): Promise<number> {
  let score = 30 // Base score for no proofs

  if (!criteria.hasProofDocuments || !criteria.proofDocuments?.length) {
    return score
  }

  try {
    const proofs = await prisma.proofDocument.findMany({
      where: { id: { in: criteria.proofDocuments } }
    })

    if (proofs.length === 0) {
      return score
    }

    score = 50 // Base score for having proofs

    for (const proof of proofs) {
      // Verification status
      if (proof.verified) {
        score += 15
      } else {
        score += 5
      }

      // Document type quality
      switch (proof.proofType) {
        case 'GO_certificate':
          score += 20 // Highest quality
          break
        case 'PPA_contract':
          score += 15 // High quality
          break
        case 'renewable_evidence':
          score += 10 // Medium quality
          break
        default:
          score += 5 // Basic proof
      }

      // Market-based eligibility
      if (proof.marketBased && criteria.computationType === 'MARKET_BASED') {
        score += 10
      }

      // Renewable certification
      if (proof.renewable) {
        score += 5
      }
    }

    // Multiple proofs bonus
    if (proofs.length > 1) {
      score += 5
    }

  } catch (error) {
    console.warn('Error assessing proof quality:', error)
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Assess computation method accuracy
 */
function assessMethodAccuracy(criteria: GradingCriteria): number {
  let score = 50 // Base score

  // Method-specific scoring
  switch (criteria.methodUsed) {
    case 'site_direct':
      score += 30 // Direct site measurement
      break
    case 'supplier_specific':
      score += 25 // Supplier-provided data
      break
    case 'family_aggregated':
      score += 15 // Product family average
      break
    case 'industry_average':
      score += 5 // Industry benchmark
      break
    default:
      score += 10 // Generic method
  }

  // Computation type scoring
  if (criteria.computationType === 'MARKET_BASED' && criteria.hasProofDocuments) {
    score += 15 // Market-based with proofs
  } else if (criteria.computationType === 'LOCATION_BASED') {
    score += 10 // Location-based
  }

  // Factor source quality
  if (criteria.factorSource.includes('verified')) {
    score += 10
  } else if (criteria.factorSource.includes('official')) {
    score += 5
  }

  // Uncertainty consideration
  if (criteria.uncertaintyLevel !== undefined) {
    if (criteria.uncertaintyLevel < 0.1) {
      score += 5 // Low uncertainty
    } else if (criteria.uncertaintyLevel > 0.5) {
      score -= 10 // High uncertainty
    }
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Assess data freshness and temporal relevance
 */
function assessDataFreshness(criteria: GradingCriteria): number {
  let score = 100 // Start with perfect score

  const { dataAge } = criteria

  // Apply penalties based on data age
  if (dataAge <= 30) {
    // Very fresh data (within 30 days)
    score = 100
  } else if (dataAge <= 90) {
    // Fresh data (within 90 days)
    score = 90
  } else if (dataAge <= 180) {
    // Acceptable data (within 6 months)
    score = 75
  } else if (dataAge <= 365) {
    // Old data (within 1 year)
    score = 60
  } else if (dataAge <= 730) {
    // Very old data (within 2 years)
    score = 40
  } else {
    // Stale data (older than 2 years)
    score = 20
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Generate human-readable reasoning for the grade
 */
function generateReasoning(
  scores: Record<string, number>,
  criteria: GradingCriteria
): string[] {
  const reasoning: string[] = []

  // Data completeness reasoning
  if (scores.dataCompleteness >= 80) {
    reasoning.push('Complete and specific reading data available')
  } else if (scores.dataCompleteness >= 60) {
    reasoning.push('Good data availability with minor gaps')
  } else {
    reasoning.push('Limited or incomplete data available')
  }

  // Proof quality reasoning
  if (scores.proofQuality >= 80) {
    reasoning.push('High-quality verified proof documents provided')
  } else if (scores.proofQuality >= 60) {
    reasoning.push('Good proof documentation with some verification')
  } else if (scores.proofQuality >= 40) {
    reasoning.push('Basic proof documents available')
  } else {
    reasoning.push('No or insufficient proof documentation')
  }

  // Method accuracy reasoning
  if (scores.methodAccuracy >= 80) {
    reasoning.push('Highly accurate computation method applied')
  } else if (scores.methodAccuracy >= 60) {
    reasoning.push('Reliable computation method with good accuracy')
  } else {
    reasoning.push('Basic or estimated computation method used')
  }

  // Data freshness reasoning
  if (scores.dataFreshness >= 90) {
    reasoning.push('Very recent and timely data')
  } else if (scores.dataFreshness >= 70) {
    reasoning.push('Recent data within acceptable timeframe')
  } else if (scores.dataFreshness >= 50) {
    reasoning.push('Somewhat dated but still relevant data')
  } else {
    reasoning.push('Old data that may not reflect current conditions')
  }

  return reasoning
}

/**
 * Generate recommendations for quality improvement
 */
function generateRecommendations(
  scores: Record<string, number>,
  criteria: GradingCriteria
): string[] {
  const recommendations: string[] = []

  // Data completeness recommendations
  if (scores.dataCompleteness < 70) {
    recommendations.push('Collect more detailed and specific consumption data')
    recommendations.push('Implement automated meter reading systems')
    recommendations.push('Ensure all readings include proper units and metadata')
  }

  // Proof quality recommendations
  if (scores.proofQuality < 60) {
    if (criteria.computationType === 'MARKET_BASED') {
      recommendations.push('Obtain renewable energy certificates or power purchase agreements')
      recommendations.push('Ensure all proof documents are properly verified')
    }
    recommendations.push('Collect supporting documentation for all energy purchases')
  }

  // Method accuracy recommendations
  if (scores.methodAccuracy < 70) {
    recommendations.push('Use supplier-specific emission factors when available')
    recommendations.push('Implement site-specific measurement where possible')
    recommendations.push('Validate computation methods against industry standards')
  }

  // Data freshness recommendations
  if (scores.dataFreshness < 70) {
    recommendations.push('Update data collection to more recent periods')
    recommendations.push('Implement regular data refresh schedules')
    recommendations.push('Consider temporal adjustments for old data')
  }

  // Overall recommendations based on grade
  const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4
  if (overallScore < 65) {
    recommendations.push('Consider implementing a data quality improvement program')
    recommendations.push('Establish regular auditing processes for carbon data')
  }

  return recommendations
}

/**
 * Batch grade assignment for multiple computations
 */
export async function batchAssignGrades(
  criteriaList: GradingCriteria[]
): Promise<QualityAssessment[]> {
  return Promise.all(
    criteriaList.map(criteria => assignQualityGrade(criteria))
  )
}

/**
 * Get quality statistics for a dataset
 */
export function getQualityStatistics(
  assessments: QualityAssessment[]
): {
  gradeDistribution: Record<QualityGrade, number>
  averageScore: number
  qualityTrend: 'improving' | 'stable' | 'declining'
  commonIssues: string[]
} {
  const gradeDistribution: Record<QualityGrade, number> = { A: 0, B: 0, C: 0 }
  let totalScore = 0

  // Calculate distributions and scores
  assessments.forEach(assessment => {
    gradeDistribution[assessment.grade]++
    totalScore += assessment.score
  })

  const averageScore = assessments.length > 0 ? totalScore / assessments.length : 0

  // Determine trend (simplified - would need historical data in practice)
  const qualityTrend: 'improving' | 'stable' | 'declining' = 'stable'

  // Find common issues from recommendations
  const allRecommendations = assessments.flatMap(a => a.recommendations)
  const recommendationCounts = allRecommendations.reduce((counts, rec) => {
    counts[rec] = (counts[rec] || 0) + 1
    return counts
  }, {} as Record<string, number>)

  const commonIssues = Object.entries(recommendationCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([issue]) => issue)

  return {
    gradeDistribution,
    averageScore: Math.round(averageScore),
    qualityTrend,
    commonIssues
  }
}
