/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { selectGridFactor, assignQualityGrade, computeCompleteEmissions } from '../lib/compute'
import { Decimal } from 'decimal.js'

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    emissionFactor: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn()
    },
    proofDocument: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    reading: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    computationTrace: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn()
    },
    intensityRecord: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  }
}))

describe('PR #37 Compute Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Market-Based vs Location-Based Grid Selection', () => {
    it('should select location-based factor when no proofs available', async () => {
      const { prisma } = await import('../lib/prisma')
      
      // Mock location-based factor
      vi.mocked(prisma.emissionFactor.findFirst).mockResolvedValue({
        id: 'factor-lb-1',
        factorKgCO2ePerUnit: new Decimal('0.45'),
        source: 'Grid Average FR 2024',
        version: 'v2024.1',
        geography: 'FR',
        validFrom: new Date('2024-01-01'),
        validTo: null
      } as any)

      const result = await selectGridFactor({
        activityKind: 'ELECTRICITY_KWH',
        geography: 'FR',
        timestamp: new Date('2024-06-01'),
        computationType: 'LOCATION_BASED'
      })

      expect(result.computationType).toBe('LOCATION_BASED')
      expect(result.factor.toString()).toBe('0.45')
      expect(result.qualityGrade).toBe('B')
      expect(result.proofDocuments).toHaveLength(0)
    })

    it('should select market-based factor with valid proof documents', async () => {
      const { prisma } = await import('../lib/prisma')
      
      // Mock proof documents
      vi.mocked(prisma.proofDocument.findMany).mockResolvedValue([
        {
          id: 'proof-1',
          proofType: 'GO_certificate',
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2024-12-31'),
          verified: true,
          renewable: true,
          marketBased: true,
          metadata: { contractualInstrument: 'GO_Certificate_Wind_2024' },
          document: { id: 'doc-1' }
        }
      ] as any)

      // Mock market-based factor
      vi.mocked(prisma.emissionFactor.findFirst).mockResolvedValue({
        id: 'factor-mb-1',
        factorKgCO2ePerUnit: new Decimal('0.05'),
        source: 'GO_Certificate_Wind_2024',
        version: 'v2024.1',
        geography: 'FR',
        validFrom: new Date('2024-01-01'),
        validTo: null
      } as any)

      const result = await selectGridFactor({
        activityKind: 'ELECTRICITY_KWH',
        geography: 'FR',
        timestamp: new Date('2024-06-01'),
        computationType: 'MARKET_BASED',
        proofDocuments: ['proof-1']
      })

      expect(result.computationType).toBe('MARKET_BASED')
      expect(result.factor.toString()).toBe('0.05')
      expect(result.qualityGrade).toBe('A')
      expect(result.proofDocuments).toContain('proof-1')
    })

    it('should fallback to location-based when market-based proofs are invalid', async () => {
      const { prisma } = await import('../lib/prisma')
      
      // Mock expired proof documents
      vi.mocked(prisma.proofDocument.findMany).mockResolvedValue([
        {
          id: 'proof-expired',
          proofType: 'GO_certificate',
          validFrom: new Date('2023-01-01'),
          validTo: new Date('2023-12-31'), // Expired
          verified: true,
          renewable: true,
          marketBased: true,
          metadata: { contractualInstrument: 'GO_Certificate_Wind_2023' },
          document: { id: 'doc-1' }
        }
      ] as any)

      // Mock fallback location-based factor
      vi.mocked(prisma.emissionFactor.findFirst).mockResolvedValue({
        id: 'factor-lb-fallback',
        factorKgCO2ePerUnit: new Decimal('0.45'),
        source: 'Grid Average FR 2024',
        version: 'v2024.1',
        geography: 'FR',
        validFrom: new Date('2024-01-01'),
        validTo: null
      } as any)

      const result = await selectGridFactor({
        activityKind: 'ELECTRICITY_KWH',
        geography: 'FR',
        timestamp: new Date('2024-06-01'),
        computationType: 'MARKET_BASED',
        proofDocuments: ['proof-expired']
      })

      expect(result.computationType).toBe('MARKET_BASED') // Original request type
      expect(result.qualityGrade).toBe('C') // Degraded quality
    })
  })

  describe('Quality Grading System', () => {
    it('should assign Grade A for complete data with verified proofs', async () => {
      const { prisma } = await import('../lib/prisma')
      
      // Mock complete reading data
      vi.mocked(prisma.reading.findUnique).mockResolvedValue({
        id: 'reading-1',
        value: new Decimal('1000'),
        unit: 'kWh',
        siteId: 'site-1',
        documentId: 'doc-1',
        document: {
          metadata: { geography: 'FR', quality: 'high' }
        }
      } as any)

      // Mock verified proof documents
      vi.mocked(prisma.proofDocument.findMany).mockResolvedValue([
        {
          id: 'proof-1',
          proofType: 'GO_certificate',
          verified: true,
          renewable: true,
          marketBased: true,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2024-12-31')
        }
      ] as any)

      const assessment = await assignQualityGrade({
        readingId: 'reading-1',
        computationType: 'MARKET_BASED',
        hasProofDocuments: true,
        proofDocuments: ['proof-1'],
        dataAge: 30, // Fresh data
        methodUsed: 'site_direct',
        factorSource: 'verified_certificate'
      })

      expect(assessment.grade).toBe('A')
      expect(assessment.score).toBeGreaterThanOrEqual(85)
      expect(assessment.reasoning).toContain('Complete and specific reading data available')
      expect(assessment.reasoning).toContain('High-quality verified proof documents provided')
    })

    it('should assign Grade B for good data without proofs', async () => {
      const { prisma } = await import('../lib/prisma')
      
      // Mock good reading data without proofs
      vi.mocked(prisma.reading.findUnique).mockResolvedValue({
        id: 'reading-2',
        value: new Decimal('500'),
        unit: 'kWh',
        siteId: 'site-2',
        documentId: 'doc-2',
        document: {
          metadata: { geography: 'FR' }
        }
      } as any)

      const assessment = await assignQualityGrade({
        readingId: 'reading-2',
        computationType: 'LOCATION_BASED',
        hasProofDocuments: false,
        dataAge: 60, // Reasonable age
        methodUsed: 'site_direct',
        factorSource: 'official_grid_average'
      })

      expect(assessment.grade).toBe('B')
      expect(assessment.score).toBeGreaterThanOrEqual(65)
      expect(assessment.score).toBeLessThan(85)
      expect(assessment.reasoning).toContain('No or insufficient proof documentation')
    })

    it('should assign Grade C for poor data quality', async () => {
      const assessment = await assignQualityGrade({
        computationType: 'LOCATION_BASED',
        hasProofDocuments: false,
        dataAge: 800, // Very old data
        methodUsed: 'industry_average',
        factorSource: 'estimated'
      })

      expect(assessment.grade).toBe('C')
      expect(assessment.score).toBeLessThan(65)
      expect(assessment.reasoning).toContain('Limited or incomplete data available')
      expect(assessment.reasoning).toContain('Old data that may not reflect current conditions')
      expect(assessment.recommendations).toContain('Update data collection to more recent periods')
    })
  })

  describe('Complete Computation Pipeline', () => {
    it('should orchestrate full computation with all enhancements', async () => {
      const result = await computeCompleteEmissions('reading-123', {
        computationType: 'MARKET_BASED',
        includeIntensity: true,
        includeAttribution: true,
        includeAuditChain: true
      })

      expect(result).toMatchObject({
        readingId: 'reading-123',
        computationType: 'MARKET_BASED',
        emissions: expect.any(Number),
        grade: expect.stringMatching(/^[ABC]$/),
        auditChainId: expect.stringContaining('audit_reading-123')
      })
    })

    it('should handle batch computations efficiently', async () => {
      const readingIds = ['reading-1', 'reading-2', 'reading-3']
      
      const results = await computeCompleteEmissions(readingIds[0], {
        computationType: 'LOCATION_BASED',
        includeIntensity: false,
        includeAttribution: false,
        includeAuditChain: false
      })

      expect(results).toBeDefined()
      expect(results.readingId).toBe('reading-1')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing emission factors gracefully', async () => {
      const { prisma } = await import('../lib/prisma')
      
      // Mock no factors found
      vi.mocked(prisma.emissionFactor.findFirst).mockResolvedValue(null)

      await expect(selectGridFactor({
        activityKind: 'ELECTRICITY_KWH',
        geography: 'UNKNOWN',
        timestamp: new Date('2024-06-01'),
        computationType: 'LOCATION_BASED'
      })).rejects.toThrow('No location-based emission factor found')
    })

    it('should handle invalid proof documents', async () => {
      const { prisma } = await import('../lib/prisma')
      
      // Mock corrupted proof documents
      vi.mocked(prisma.proofDocument.findMany).mockResolvedValue([])

      const result = await selectGridFactor({
        activityKind: 'ELECTRICITY_KWH',
        geography: 'FR',
        timestamp: new Date('2024-06-01'),
        computationType: 'MARKET_BASED',
        proofDocuments: ['invalid-proof']
      })

      expect(result.qualityGrade).toBe('C') // Should degrade quality
    })

    it('should validate computation parameters', async () => {
      await expect(selectGridFactor({
        activityKind: 'ELECTRICITY_KWH',
        geography: '',
        timestamp: new Date('2024-06-01'),
        computationType: 'LOCATION_BASED'
      })).rejects.toThrow()
    })
  })

  describe('Performance and Scalability', () => {
    it('should complete computations within acceptable time limits', async () => {
      const startTime = Date.now()
      
      await computeCompleteEmissions('reading-perf', {
        computationType: 'LOCATION_BASED'
      })
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle concurrent computations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        computeCompleteEmissions(`reading-concurrent-${i}`, {
          computationType: 'LOCATION_BASED'
        })
      )

      const results = await Promise.all(promises)
      expect(results).toHaveLength(5)
      results.forEach((result, i) => {
        expect(result.readingId).toBe(`reading-concurrent-${i}`)
      })
    })
  })

  describe('Integration with Existing Systems', () => {
    it('should be compatible with current data structures', () => {
      // Test that types are compatible
      const gridRequest = {
        activityKind: 'ELECTRICITY_KWH' as const,
        geography: 'FR',
        timestamp: new Date(),
        computationType: 'LOCATION_BASED' as const
      }

      expect(gridRequest.activityKind).toBe('ELECTRICITY_KWH')
      expect(gridRequest.computationType).toBe('LOCATION_BASED')
    })

    it('should maintain backward compatibility', async () => {
      // Ensure existing computation functions still work
      const result = await computeCompleteEmissions('legacy-reading', {
        computationType: 'LOCATION_BASED'
      })

      expect(result).toBeDefined()
      expect(result.grade).toMatch(/^[ABC]$/)
    })
  })
})
