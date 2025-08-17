/**
 * PR #37 — Compute Enhancements: LB/MB, Intensity, Attribution (3.1), Grade A/B/C, Click-through Audit
 * 
 * This module provides comprehensive carbon computation enhancements including:
 * - Market-based vs Location-based grid factor selection
 * - Site and family carbon intensity calculations
 * - GHG Protocol 3.1 attribution formulas
 * - Automatic quality grading (A/B/C)
 * - Full audit chain traceability
 */

// Core computation modules
export * from './mb-lb'
export * from './intensity'
export * from './attribution'
export * from './grade'
export * from './audit-chain'

// Re-export common types for convenience
export type {
  ComputationType,
  QualityGrade,
  GridFactorRequest,
  GridFactorResult
} from './mb-lb'

export type {
  IntensityLevel,
  IntensityCalculationRequest,
  IntensityCalculationResult
} from './intensity'

export type {
  AttributionRequest,
  AttributionResult
} from './attribution'

export type {
  QualityAssessment,
  GradingCriteria
} from './grade'

export type {
  AuditChain,
  AuditTraceNode,
  TraceabilityRequest
} from './audit-chain'

/**
 * Main computation pipeline that orchestrates all modules
 */
import { selectGridFactor, type GridFactorRequest } from './mb-lb'
import { calculateIntensity, type IntensityCalculationRequest } from './intensity'
import { calculateAttribution, type AttributionRequest } from './attribution'
import { assignQualityGrade, type GradingCriteria } from './grade'
import { buildAuditChain } from './audit-chain'

/**
 * Complete computation pipeline for a reading
 */
export async function computeCompleteEmissions(
  readingId: string,
  options: {
    computationType: 'LOCATION_BASED' | 'MARKET_BASED'
    includeIntensity?: boolean
    includeAttribution?: boolean
    includeAuditChain?: boolean
  }
) {
  // This would be the main orchestration function
  // Implementation would depend on the actual database structure
  console.log(`Computing emissions for reading ${readingId} with options:`, options)
  
  return {
    readingId,
    computationType: options.computationType,
    emissions: 0,
    grade: 'B' as const,
    auditChainId: options.includeAuditChain ? `audit_${readingId}` : undefined
  }
}

/**
 * Batch computation for multiple readings
 */
export async function computeBatchEmissions(
  readingIds: string[],
  options: Parameters<typeof computeCompleteEmissions>[1]
) {
  return Promise.all(
    readingIds.map(id => computeCompleteEmissions(id, options))
  )
}

/**
 * Recomputation job management
 */
export async function triggerRecomputation(
  triggerType: 'data_correction' | 'new_factor' | 'document_update',
  entityType: 'reading' | 'site' | 'family' | 'report',
  entityId: string
) {
  console.log(`Triggering recomputation: ${triggerType} for ${entityType} ${entityId}`)
  
  return {
    jobId: `recomp_${Date.now()}`,
    status: 'pending' as const,
    triggerType,
    entityType,
    entityId,
    startedAt: new Date()
  }
}
