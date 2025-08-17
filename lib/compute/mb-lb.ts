/**
 * Market-Based vs Location-Based Grid Factor Selection
 * 
 * Implements GHG Protocol Scope 2 guidance for electricity emission factors:
 * - Market-Based (MB): Uses specific renewable energy contracts/certificates
 * - Location-Based (LB): Uses average grid emission factors for the location
 */

import { prisma } from '@/lib/prisma'
import { ActivityKind } from '@prisma/client'
import { Decimal } from 'decimal.js'

// Define enums locally until Prisma client is updated
export type ComputationType = 'LOCATION_BASED' | 'MARKET_BASED'
export type QualityGrade = 'A' | 'B' | 'C'

export interface GridFactorRequest {
  activityKind: ActivityKind
  geography: string
  timestamp: Date
  computationType: ComputationType
  proofDocuments?: string[] // Document IDs for market-based factors
}

export interface GridFactorResult {
  factor: Decimal
  factorId: string
  computationType: ComputationType
  source: string
  version: string
  proofDocuments: string[]
  qualityGrade: 'A' | 'B' | 'C'
}

/**
 * Select appropriate emission factor based on computation type
 */
export async function selectGridFactor(
  request: GridFactorRequest
): Promise<GridFactorResult> {
  const { activityKind, geography, timestamp, computationType, proofDocuments = [] } = request

  if (computationType === 'MARKET_BASED') {
    return await selectMarketBasedFactor(activityKind, geography, timestamp, proofDocuments)
  } else {
    return await selectLocationBasedFactor(activityKind, geography, timestamp)
  }
}

/**
 * Select market-based emission factor with proof validation
 */
async function selectMarketBasedFactor(
  activityKind: ActivityKind,
  geography: string,
  timestamp: Date,
  proofDocuments: string[]
): Promise<GridFactorResult> {
  // First, try to find market-based factor with valid proof documents
  if (proofDocuments.length > 0) {
    const proofValidation = await validateProofDocuments(proofDocuments, timestamp)
    
    if (proofValidation.isValid) {
      const marketFactor = await findMarketBasedFactor(
        activityKind,
        geography,
        timestamp,
        proofValidation.contractualInstrument || ''
      )
      
      if (marketFactor) {
        return {
          factor: new Decimal(marketFactor.factorKgCO2ePerUnit),
          factorId: marketFactor.id,
          computationType: 'MARKET_BASED',
          source: marketFactor.source,
          version: marketFactor.version,
          proofDocuments,
          qualityGrade: 'A' // Exact market-based with proofs
        }
      }
    }
  }

  // Fallback to location-based if no valid market-based factor found
  console.warn(`No valid market-based factor found for ${activityKind} in ${geography}, falling back to location-based`)
  
  const locationResult = await selectLocationBasedFactor(activityKind, geography, timestamp)
  return {
    ...locationResult,
    computationType: 'MARKET_BASED', // Keep original request type
    qualityGrade: 'C' // Degraded to estimated
  }
}

/**
 * Select location-based emission factor (grid average)
 */
async function selectLocationBasedFactor(
  activityKind: ActivityKind,
  geography: string,
  timestamp: Date
): Promise<GridFactorResult> {
  // Look for most recent valid location-based factor
  const locationFactor = await prisma.emissionFactor.findFirst({
    where: {
      kind: activityKind,
      geography,
      validFrom: { lte: timestamp },
      OR: [
        { validTo: null },
        { validTo: { gte: timestamp } }
      ]
    },
    orderBy: [
      { validFrom: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  if (!locationFactor) {
    throw new Error(`No location-based emission factor found for ${activityKind} in ${geography}`)
  }

  return {
    factor: new Decimal(locationFactor.factorKgCO2ePerUnit),
    factorId: locationFactor.id,
    computationType: 'LOCATION_BASED',
    source: locationFactor.source,
    version: locationFactor.version,
    proofDocuments: [],
    qualityGrade: 'B' // Site-specific location data
  }
}

/**
 * Find market-based emission factor from contractual instruments
 */
async function findMarketBasedFactor(
  activityKind: ActivityKind,
  geography: string,
  timestamp: Date,
  contractualInstrument: string
): Promise<any> {
  // Look for market-based factors that match the contractual instrument
  // This could be from renewable energy certificates, power purchase agreements, etc.
  return await prisma.emissionFactor.findFirst({
    where: {
      kind: activityKind,
      geography,
      source: { contains: contractualInstrument },
      validFrom: { lte: timestamp },
      OR: [
        { validTo: null },
        { validTo: { gte: timestamp } }
      ]
    },
    orderBy: [
      { validFrom: 'desc' },
      { createdAt: 'desc' }
    ]
  })
}

/**
 * Validate proof documents for market-based calculations
 */
async function validateProofDocuments(
  documentIds: string[],
  timestamp: Date
): Promise<{
  isValid: boolean
  contractualInstrument?: string
  validationErrors: string[]
}> {
  const validationErrors: string[] = []
  
  if (documentIds.length === 0) {
    validationErrors.push('No proof documents provided')
    return { isValid: false, validationErrors }
  }

  // Fetch proof documents
  const proofDocs = await prisma.proofDocument.findMany({
    where: {
      id: { in: documentIds }
    },
    include: {
      document: true
    }
  })

  if (proofDocs.length !== documentIds.length) {
    validationErrors.push('Some proof documents not found')
  }

  let contractualInstrument: string | undefined

  for (const proofDoc of proofDocs) {
    // Validate document type
    if (!['GO_certificate', 'PPA_contract', 'renewable_evidence'].includes(proofDoc.proofType)) {
      validationErrors.push(`Invalid document type: ${proofDoc.proofType}`)
      continue
    }

    // Validate validity period
    if (proofDoc.validFrom && proofDoc.validFrom > timestamp) {
      validationErrors.push(`Document ${proofDoc.id} not yet valid`)
      continue
    }

    if (proofDoc.validTo && proofDoc.validTo < timestamp) {
      validationErrors.push(`Document ${proofDoc.id} has expired`)
      continue
    }

    // Extract contractual instrument identifier from metadata or proof type
    const instrument = (proofDoc.metadata as any)?.contractualInstrument || proofDoc.proofType
    if (instrument) {
      if (contractualInstrument && contractualInstrument !== instrument) {
        validationErrors.push('Inconsistent contractual instruments across documents')
      } else {
        contractualInstrument = instrument
      }
    }
  }

  const isValid = validationErrors.length === 0 && contractualInstrument !== undefined

  return {
    isValid,
    contractualInstrument,
    validationErrors
  }
}

/**
 * Get grid factor selection summary for audit trail
 */
export async function getGridFactorSelectionSummary(
  factorId: string,
  computationType: ComputationType
): Promise<{
  factor: any
  selection_logic: string
  alternatives_considered: number
  proof_validation?: any
}> {
  const factor = await prisma.emissionFactor.findUnique({
    where: { id: factorId }
  })

  if (!factor) {
    throw new Error(`Emission factor ${factorId} not found`)
  }

  // Count alternative factors available
  const alternatives = await prisma.emissionFactor.count({
    where: {
      kind: factor.kind,
      geography: factor.geography,
      id: { not: factorId },
      validFrom: { lte: factor.validFrom },
      OR: [
        { validTo: null },
        { validTo: { gte: factor.validFrom } }
      ]
    }
  })

  const selectionLogic = computationType === 'MARKET_BASED'
    ? 'Market-based factor selected based on contractual instruments and proof documents'
    : 'Location-based factor selected as grid average for geographic region'

  return {
    factor,
    selection_logic: selectionLogic,
    alternatives_considered: alternatives
  }
}
