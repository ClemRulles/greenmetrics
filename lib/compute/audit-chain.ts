/**
 * Audit Chain Infrastructure for Carbon Computation Traceability
 * 
 * Provides full traceability from readings through factors to final documents
 * with click-through navigation and comprehensive audit trails
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from 'decimal.js'
import type { QualityGrade, ComputationType } from './mb-lb'

export interface AuditTraceNode {
  id: string
  type: 'reading' | 'factor' | 'computation' | 'document' | 'proof'
  timestamp: Date
  data: any
  metadata: Record<string, any>
  children: string[] // IDs of dependent nodes
  parents: string[] // IDs of source nodes
}

export interface AuditChain {
  id: string
  rootNodeId: string
  leafNodeIds: string[]
  nodes: Record<string, AuditTraceNode>
  summary: {
    totalNodes: number
    inputReadings: number
    factorsUsed: number
    proofsProvided: number
    finalEmissions: Decimal
    grade: QualityGrade
    computationType: ComputationType
  }
  created: Date
  version: string
}

export interface TraceabilityRequest {
  startFrom: 'reading' | 'document' | 'computation'
  entityId: string
  direction: 'forward' | 'backward' | 'both'
  maxDepth?: number
  includeMetadata?: boolean
}

/**
 * Build complete audit chain for a computation trace
 */
export async function buildAuditChain(
  computationTraceId: string,
  includeMetadata: boolean = true
): Promise<AuditChain> {
  const trace = await prisma.computationTrace.findUnique({
    where: { id: computationTraceId },
    include: {
      reading: {
        include: { document: true }
      },
      emissionFactor: true,
      document: true
    }
  })

  if (!trace) {
    throw new Error(`Computation trace ${computationTraceId} not found`)
  }

  const nodes: Record<string, AuditTraceNode> = {}
  const nodeIds: string[] = []

  // Build computation node (center of the chain)
  const computationNode: AuditTraceNode = {
    id: trace.id,
    type: 'computation',
    timestamp: trace.computedAt,
    data: {
      intensity: trace.intensity,
      attribution: trace.attribution,
      grade: trace.grade,
      computationType: trace.computationType,
      version: trace.version
    },
    metadata: includeMetadata ? (trace.metadata as Record<string, any>) || {} : {},
    children: trace.documentId ? [trace.documentId] : [],
    parents: [trace.readingId, trace.emissionFactorId].filter(Boolean)
  }
  nodes[trace.id] = computationNode
  nodeIds.push(trace.id)

  // Build reading node (input)
  if (trace.reading) {
    const readingNode: AuditTraceNode = {
      id: trace.reading.id,
      type: 'reading',
      timestamp: trace.reading.month,
      data: {
        value: trace.reading.value,
        unit: trace.reading.unit,
        siteId: trace.reading.siteId
      },
      metadata: includeMetadata ? {
        documentSource: trace.reading.document?.source,
        documentStatus: trace.reading.document?.status
      } : {},
      children: [trace.id],
      parents: trace.reading.documentId ? [trace.reading.documentId] : []
    }
    nodes[trace.reading.id] = readingNode
    nodeIds.push(trace.reading.id)

    // Build source document node
    if (trace.reading.document) {
      const docNode: AuditTraceNode = {
        id: trace.reading.document.id,
        type: 'document',
        timestamp: trace.reading.document.createdAt,
        data: {
          filename: trace.reading.document.filename,
          source: trace.reading.document.source,
          status: trace.reading.document.status,
          sha256: trace.reading.document.sha256
        },
        metadata: includeMetadata ? (trace.reading.document.metadata as Record<string, any>) || {} : {},
        children: [trace.reading.id],
        parents: []
      }
      nodes[trace.reading.document.id] = docNode
      nodeIds.push(trace.reading.document.id)
    }
  }

  // Build emission factor node
  if (trace.emissionFactor) {
    const factorNode: AuditTraceNode = {
      id: trace.emissionFactor.id,
      type: 'factor',
      timestamp: trace.emissionFactor.validFrom,
      data: {
        kind: trace.emissionFactor.kind,
        unit: trace.emissionFactor.unit,
        factorKgCO2ePerUnit: trace.emissionFactor.factorKgCO2ePerUnit,
        geography: trace.emissionFactor.geography,
        source: trace.emissionFactor.source,
        version: trace.emissionFactor.version
      },
      metadata: includeMetadata ? {
        validTo: trace.emissionFactor.validTo,
        createdAt: trace.emissionFactor.createdAt
      } : {},
      children: [trace.id],
      parents: []
    }
    nodes[trace.emissionFactor.id] = factorNode
    nodeIds.push(trace.emissionFactor.id)
  }

  // Build output document node (if exists)
  if (trace.document) {
    const outputDocNode: AuditTraceNode = {
      id: trace.document.id,
      type: 'document',
      timestamp: trace.document.createdAt,
      data: {
        filename: trace.document.filename,
        source: trace.document.source,
        status: trace.document.status
      },
      metadata: includeMetadata ? (trace.document.metadata as Record<string, any>) || {} : {},
      children: [],
      parents: [trace.id]
    }
    nodes[trace.document.id] = outputDocNode
    nodeIds.push(trace.document.id)
  }

  // Add proof document nodes if market-based computation
  if (trace.computationType === 'MARKET_BASED') {
    const proofDocs = await prisma.proofDocument.findMany({
      where: {
        OR: [
          { documentId: trace.reading?.documentId },
          { document: { metadata: { path: ['computationTraceId'], equals: trace.id } } }
        ]
      },
      include: { document: true }
    })

    for (const proof of proofDocs) {
      const proofNode: AuditTraceNode = {
        id: proof.id,
        type: 'proof',
        timestamp: proof.validFrom,
        data: {
          proofType: proof.proofType,
          verified: proof.verified,
          renewable: proof.renewable,
          marketBased: proof.marketBased
        },
        metadata: includeMetadata ? {
          validTo: proof.validTo,
          verifiedBy: proof.verifiedBy,
          verifiedAt: proof.verifiedAt,
          ...(proof.metadata as Record<string, any> || {})
        } : {},
        children: [trace.id],
        parents: proof.documentId ? [proof.documentId] : []
      }
      nodes[proof.id] = proofNode
      nodeIds.push(proof.id)

      // Update computation node to reference proof
      computationNode.parents.push(proof.id)
    }
  }

  // Calculate summary
  const inputReadings = Object.values(nodes).filter(n => n.type === 'reading').length
  const factorsUsed = Object.values(nodes).filter(n => n.type === 'factor').length
  const proofsProvided = Object.values(nodes).filter(n => n.type === 'proof').length

  const summary = {
    totalNodes: Object.keys(nodes).length,
    inputReadings,
    factorsUsed,
    proofsProvided,
    finalEmissions: trace.attribution || new Decimal(0),
    grade: trace.grade as QualityGrade,
    computationType: trace.computationType as ComputationType
  }

  return {
    id: `audit_chain_${computationTraceId}`,
    rootNodeId: trace.reading?.documentId || trace.readingId,
    leafNodeIds: trace.documentId ? [trace.documentId] : [trace.id],
    nodes,
    summary,
    created: new Date(),
    version: '1.0'
  }
}

/**
 * Trace computation chain from any starting point
 */
export async function traceFromEntity(
  request: TraceabilityRequest
): Promise<{
  chains: AuditChain[]
  totalTraces: number
  summary: {
    averageChainLength: number
    qualityDistribution: Record<QualityGrade, number>
    computationTypes: Record<ComputationType, number>
  }
}> {
  const { startFrom, entityId, direction, maxDepth = 10 } = request
  const chains: AuditChain[] = []

  try {
    if (startFrom === 'reading') {
      // Find all computation traces that use this reading
      const traces = await prisma.computationTrace.findMany({
        where: { readingId: entityId },
        take: maxDepth
      })

      for (const trace of traces) {
        const chain = await buildAuditChain(trace.id, request.includeMetadata)
        chains.push(chain)
      }

    } else if (startFrom === 'document') {
      // Find all readings from this document, then their traces
      const readings = await prisma.reading.findMany({
        where: { documentId: entityId },
        take: maxDepth
      })

      for (const reading of readings) {
        const traces = await prisma.computationTrace.findMany({
          where: { readingId: reading.id }
        })

        for (const trace of traces) {
          const chain = await buildAuditChain(trace.id, request.includeMetadata)
          chains.push(chain)
        }
      }

    } else if (startFrom === 'computation') {
      // Direct trace from computation
      const chain = await buildAuditChain(entityId, request.includeMetadata)
      chains.push(chain)
    }

  } catch (error) {
    console.warn(`Error tracing from ${startFrom} ${entityId}:`, error)
  }

  // Calculate summary statistics
  const totalTraces = chains.length
  const averageChainLength = chains.length > 0 
    ? chains.reduce((sum, chain) => sum + chain.summary.totalNodes, 0) / chains.length 
    : 0

  const qualityDistribution: Record<QualityGrade, number> = { A: 0, B: 0, C: 0 }
  const computationTypes: Record<ComputationType, number> = { LOCATION_BASED: 0, MARKET_BASED: 0 }

  chains.forEach(chain => {
    qualityDistribution[chain.summary.grade]++
    computationTypes[chain.summary.computationType]++
  })

  return {
    chains,
    totalTraces,
    summary: {
      averageChainLength: Math.round(averageChainLength * 100) / 100,
      qualityDistribution,
      computationTypes
    }
  }
}

/**
 * Get audit chain navigation paths for UI
 */
export function getNavigationPaths(chain: AuditChain): {
  forward: Array<{nodeId: string, label: string, type: string}>
  backward: Array<{nodeId: string, label: string, type: string}>
} {
  const forward: Array<{nodeId: string, label: string, type: string}> = []
  const backward: Array<{nodeId: string, label: string, type: string}> = []

  // Find computation node as the center
  const computationNodeId = Object.keys(chain.nodes).find(
    id => chain.nodes[id].type === 'computation'
  )

  if (!computationNodeId) {
    return { forward, backward }
  }

  const computationNode = chain.nodes[computationNodeId]

  // Build backward path (inputs)
  const buildBackwardPath = (nodeId: string, depth: number = 0) => {
    if (depth > 5) return // Prevent infinite loops

    const node = chain.nodes[nodeId]
    if (!node) return

    let label = `${node.type}: ${nodeId.slice(0, 8)}...`
    if (node.type === 'reading') {
      label = `Reading: ${node.data.value} ${node.data.unit}`
    } else if (node.type === 'factor') {
      label = `Factor: ${node.data.source}`
    } else if (node.type === 'document') {
      label = `Document: ${node.data.filename}`
    } else if (node.type === 'proof') {
      label = `Proof: ${node.data.proofType}`
    }

    backward.push({ nodeId, label, type: node.type })

    // Recursively add parents
    node.parents.forEach(parentId => buildBackwardPath(parentId, depth + 1))
  }

  // Build forward path (outputs)
  const buildForwardPath = (nodeId: string, depth: number = 0) => {
    if (depth > 5) return // Prevent infinite loops

    const node = chain.nodes[nodeId]
    if (!node) return

    let label = `${node.type}: ${nodeId.slice(0, 8)}...`
    if (node.type === 'document') {
      label = `Output: ${node.data.filename}`
    }

    forward.push({ nodeId, label, type: node.type })

    // Recursively add children
    node.children.forEach(childId => buildForwardPath(childId, depth + 1))
  }

  // Build paths from computation node
  computationNode.parents.forEach(parentId => buildBackwardPath(parentId))
  computationNode.children.forEach(childId => buildForwardPath(childId))

  return { forward, backward }
}

/**
 * Validate audit chain integrity
 */
export function validateAuditChain(chain: AuditChain): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for orphaned nodes
  const referencedIds = new Set<string>()
  Object.values(chain.nodes).forEach(node => {
    node.parents.forEach(id => referencedIds.add(id))
    node.children.forEach(id => referencedIds.add(id))
  })

  Object.keys(chain.nodes).forEach(nodeId => {
    const node = chain.nodes[nodeId]
    
    // Check parent references exist
    node.parents.forEach(parentId => {
      if (!chain.nodes[parentId]) {
        errors.push(`Node ${nodeId} references missing parent ${parentId}`)
      }
    })

    // Check child references exist
    node.children.forEach(childId => {
      if (!chain.nodes[childId]) {
        errors.push(`Node ${nodeId} references missing child ${childId}`)
      }
    })

    // Validate node data completeness
    if (!node.data || Object.keys(node.data).length === 0) {
      warnings.push(`Node ${nodeId} has no data`)
    }

    // Check timestamp consistency
    if (node.type === 'computation') {
      node.parents.forEach(parentId => {
        const parent = chain.nodes[parentId]
        if (parent && parent.timestamp > node.timestamp) {
          warnings.push(`Parent node ${parentId} timestamp is after child ${nodeId}`)
        }
      })
    }
  })

  // Check for circular references
  const visited = new Set<string>()
  const visiting = new Set<string>()
  
  const hasCycle = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visiting.add(nodeId)
    const node = chain.nodes[nodeId]
    if (node) {
      for (const childId of node.children) {
        if (hasCycle(childId)) return true
      }
    }
    visiting.delete(nodeId)
    visited.add(nodeId)
    return false
  }

  Object.keys(chain.nodes).forEach(nodeId => {
    if (hasCycle(nodeId)) {
      errors.push(`Circular reference detected involving node ${nodeId}`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Export audit chain for external systems
 */
export function exportAuditChain(
  chain: AuditChain,
  format: 'json' | 'csv' | 'xml' = 'json'
): string {
  if (format === 'json') {
    return JSON.stringify(chain, null, 2)
  }

  if (format === 'csv') {
    const headers = ['NodeId', 'Type', 'Timestamp', 'Data', 'Parents', 'Children']
    const rows = [headers.join(',')]

    Object.entries(chain.nodes).forEach(([nodeId, node]) => {
      const row = [
        nodeId,
        node.type,
        node.timestamp.toISOString(),
        JSON.stringify(node.data).replace(/,/g, ';'),
        node.parents.join(';'),
        node.children.join(';')
      ]
      rows.push(row.join(','))
    })

    return rows.join('\n')
  }

  // XML format would be implemented here
  return JSON.stringify(chain, null, 2)
}
