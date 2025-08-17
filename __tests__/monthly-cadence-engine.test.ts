import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Prisma client first
vi.mock('@/lib/prisma', () => ({
  prisma: {
    monthlyEmission: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    monthlyProduction: {
      upsert: vi.fn(),
    },
    buyerAttributionMonthly: {
      upsert: vi.fn(),
    },
    dashboardSnapshot: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    cadenceJob: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    reading: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    proof: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    productionStat: {
      findMany: vi.fn(),
    },
    partnerVolumeAllocation: {
      findMany: vi.fn(),
    },
    partnerTargets: {
      findUnique: vi.fn(),
    },
    intensityRecord: {
      findFirst: vi.fn(),
    },
    membership: {
      count: vi.fn(),
    },
    report: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    certificate: {
      findMany: vi.fn(),
    },
    partnerTargetSnapshot: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('decimal.js', () => ({
  Decimal: class MockDecimal {
    constructor(public value: number) {}
    toString() { return this.value.toString(); }
    static isDecimal() { return true; }
  },
}));

// Import after mocking
import { runMonthlyClose } from '@/lib/cadence/close';
import { runBackfillProcess } from '@/lib/cadence/backfill';
import { estimateMonthlyEmissions } from '@/lib/cadence/estimate';
import { prisma } from '@/lib/prisma';

describe('Monthly Cadence Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Monthly Close Process', () => {
    it('should run monthly close for all organizations', async () => {
      // Mock organizations
      vi.mocked(prisma.organization.findMany).mockResolvedValue([
        { id: 'org1' },
        { id: 'org2' },
      ] as any);

      // Mock no existing records
      vi.mocked(prisma.monthlyEmission.findUnique).mockResolvedValue(null);

      // Mock no readings/proofs (will trigger estimation)
      vi.mocked(prisma.reading.count).mockResolvedValue(0);
      vi.mocked(prisma.proof.count).mockResolvedValue(0);

      // Mock production stats
      vi.mocked(prisma.productionStat.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partnerVolumeAllocation.findMany).mockResolvedValue([]);

      // Mock estimation dependencies
      vi.mocked(prisma.intensityRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.membership.count).mockResolvedValue(3);
      vi.mocked(prisma.report.count).mockResolvedValue(1);

      // Mock upsert responses
      vi.mocked(prisma.monthlyEmission.upsert).mockResolvedValue({
        id: 'emission-1',
        qualityGrade: 'C',
        isEstimated: true,
      } as any);

      vi.mocked(prisma.dashboardSnapshot.upsert).mockResolvedValue({
        id: 'snapshot-1',
      } as any);

      // Mock aggregation for summary
      vi.mocked(prisma.monthlyEmission.findMany).mockResolvedValue([
        { qualityGrade: 'C', isEstimated: true, totalEmissions: 120 },
      ] as any);

      const result = await runMonthlyClose('2025-08');

      expect(result.processedOrganizations).toBe(2);
      expect(result.estimatedRecords).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(prisma.monthlyEmission.upsert).toHaveBeenCalledTimes(2);
    });

    it('should process real data when available', async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([{ id: 'org1' }] as any);
      vi.mocked(prisma.monthlyEmission.findUnique).mockResolvedValue(null);

      // Mock real data availability
      vi.mocked(prisma.reading.count).mockResolvedValue(5);
      vi.mocked(prisma.proof.count).mockResolvedValue(2);

      // Mock readings and proofs for calculation
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        {
          amount: 1000,
          activityKind: 'ELECTRICITY',
          emissionFactorOverride: { factorValue: 0.5 },
        },
        {
          amount: 500,
          activityKind: 'NATURAL_GAS',
          emissionFactorOverride: null,
        },
      ] as any);

      vi.mocked(prisma.proof.findMany).mockResolvedValue([
        { id: 'proof1' },
        { id: 'proof2' },
      ] as any);

      vi.mocked(prisma.productionStat.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partnerVolumeAllocation.findMany).mockResolvedValue([]);

      vi.mocked(prisma.monthlyEmission.upsert).mockResolvedValue({
        id: 'emission-1',
        qualityGrade: 'A',
        isEstimated: false,
      } as any);

      vi.mocked(prisma.dashboardSnapshot.upsert).mockResolvedValue({
        id: 'snapshot-1',
      } as any);

      vi.mocked(prisma.monthlyEmission.findMany).mockResolvedValue([
        { qualityGrade: 'A', isEstimated: false, totalEmissions: 1500 },
      ] as any);

      const result = await runMonthlyClose('2025-08');

      expect(result.processedOrganizations).toBe(1);
      expect(result.realDataRecords).toBe(1);
      expect(result.estimatedRecords).toBe(0);
      expect(prisma.monthlyEmission.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            qualityGrade: 'A',
            isEstimated: false,
          }),
        })
      );
    });

    it('should skip already processed organizations unless forced', async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([{ id: 'org1' }] as any);

      // Mock existing record
      vi.mocked(prisma.monthlyEmission.findUnique).mockResolvedValue({
        id: 'existing',
        qualityGrade: 'B',
      } as any);

      const result = await runMonthlyClose('2025-08', undefined, false);

      expect(result.processedOrganizations).toBe(0);
      expect(prisma.monthlyEmission.upsert).not.toHaveBeenCalled();
    });
  });

  describe('Estimation Engine', () => {
    it('should estimate from last known intensity when available', async () => {
      const mockIntensity = {
        intensityValue: 2.5,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      };

      vi.mocked(prisma.intensityRecord.findFirst).mockResolvedValue(mockIntensity as any);
      vi.mocked(prisma.productionStat.findMany).mockResolvedValue([
        { units: 1200 }
      ] as any);

      // Mock historical scope ratio
      vi.mocked(prisma.monthlyEmission.findMany).mockResolvedValue([
        { scope1Total: 300, scope2Total: 700, isEstimated: false },
        { scope1Total: 200, scope2Total: 800, isEstimated: false },
      ] as any);

      const result = await estimateMonthlyEmissions('org1', '2025-08');

      expect(result.method).toBe('last_known_intensity');
      expect(result.total).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(50); // Recent intensity should have good confidence
      expect(result.details.fallbackLevel).toBe(1);
    });

    it('should fall back to organization average when intensity unavailable', async () => {
      vi.mocked(prisma.intensityRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({ countryCode: 'BE' } as any);

      // Mock historical emissions for org average
      vi.mocked(prisma.monthlyEmission.findMany).mockResolvedValue([
        { scope1Total: 100, scope2Total: 200, totalEmissions: 300, monthPeriod: '2025-07', isEstimated: false },
        { scope1Total: 120, scope2Total: 180, totalEmissions: 300, monthPeriod: '2025-06', isEstimated: false },
      ] as any);

      const result = await estimateMonthlyEmissions('org1', '2025-08');

      expect(result.method).toBe('organization_average');
      expect(result.total).toBe(300); // Average of historical data
      expect(result.scope1).toBe(110); // Average scope 1
      expect(result.scope2).toBe(190); // Average scope 2
      expect(result.details.fallbackLevel).toBe(4);
    });

    it('should use minimal fallback when no data available', async () => {
      vi.mocked(prisma.intensityRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({ countryCode: 'BE' } as any);
      vi.mocked(prisma.monthlyEmission.findMany).mockResolvedValue([]);
      vi.mocked(prisma.productionStat.findMany).mockResolvedValue([]);
      vi.mocked(prisma.membership.count).mockResolvedValue(1);
      vi.mocked(prisma.report.count).mockResolvedValue(0);

      const result = await estimateMonthlyEmissions('org1', '2025-08');

      expect(result.method).toBe('minimal_fallback');
      expect(result.total).toBe(1.0); // Minimal baseline
      expect(result.confidence).toBe(10); // Very low confidence
      expect(result.details.fallbackLevel).toBe(5);
    });
  });

  describe('Backfill Process', () => {
    it('should find and backfill Grade C estimates with new real data', async () => {
      // Mock Grade C estimates
      vi.mocked(prisma.monthlyEmission.findMany).mockResolvedValue([
        { organizationId: 'org1' },
        { organizationId: 'org2' },
      ] as any);

      // Mock existing estimated record
      vi.mocked(prisma.monthlyEmission.findUnique).mockResolvedValue({
        id: 'estimated',
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        isEstimated: true,
        qualityGrade: 'C',
      } as any);

      // Mock new readings since estimation
      vi.mocked(prisma.reading.count).mockResolvedValue(3);
      vi.mocked(prisma.proof.count).mockResolvedValue(1);

      // Mock reading/proof data for calculation
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { amount: 800, activityKind: 'ELECTRICITY', emissionFactorOverride: null },
      ] as any);
      vi.mocked(prisma.proof.findMany).mockResolvedValue([{ id: 'proof1' }] as any);

      // Mock production and allocation data
      vi.mocked(prisma.productionStat.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partnerVolumeAllocation.findMany).mockResolvedValue([]);

      // Mock update operations
      vi.mocked(prisma.monthlyEmission.update).mockResolvedValue({
        id: 'updated',
        qualityGrade: 'B',
        isEstimated: false,
      } as any);

      // Mock regeneration dependencies
      vi.mocked(prisma.report.findMany).mockResolvedValue([{ id: 'report1' }] as any);
      vi.mocked(prisma.certificate.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partnerTargetSnapshot.findMany).mockResolvedValue([]);

      // Mock dashboard snapshot update
      vi.mocked(prisma.partnerTargets.findUnique).mockResolvedValue({
        targetTons: 1000,
      } as any);

      vi.mocked(prisma.dashboardSnapshot.update).mockResolvedValue({
        id: 'snapshot-updated',
      } as any);

      // Mock summary calculation
      vi.mocked(prisma.monthlyEmission.groupBy).mockResolvedValue([
        { qualityGrade: 'A', _count: 1 },
        { qualityGrade: 'B', _count: 1 },
        { qualityGrade: 'C', _count: 0 },
      ] as any);

      const result = await runBackfillProcess('2025-08');

      expect(result.backfilledRecords).toBe(2);
      expect(result.upgradedGrades).toBe(2);
      expect(result.regeneratedComputations).toBeGreaterThan(0);
      expect(prisma.monthlyEmission.update).toHaveBeenCalledTimes(2);
    });

    it('should skip organizations without new data', async () => {
      vi.mocked(prisma.monthlyEmission.findMany).mockResolvedValue([
        { organizationId: 'org1' },
      ] as any);

      vi.mocked(prisma.monthlyEmission.findUnique).mockResolvedValue({
        id: 'estimated',
        updatedAt: new Date(),
        isEstimated: true,
      } as any);

      // No new readings or proofs
      vi.mocked(prisma.reading.count).mockResolvedValue(0);
      vi.mocked(prisma.proof.count).mockResolvedValue(0);

      const result = await runBackfillProcess('2025-08');

      expect(result.backfilledRecords).toBe(0);
      expect(result.upgradedGrades).toBe(0);
      expect(prisma.monthlyEmission.update).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.organization.findMany).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(runMonthlyClose('2025-08')).rejects.toThrow(
        'Monthly close failed: Database connection failed'
      );
    });

    it('should continue processing other organizations if one fails', async () => {
      vi.mocked(prisma.organization.findMany).mockResolvedValue([
        { id: 'org1' },
        { id: 'org2' },
        { id: 'org3' },
      ] as any);

      // Org1 succeeds
      vi.mocked(prisma.monthlyEmission.findUnique)
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Org2 processing failed'))
        .mockResolvedValueOnce(null);

      vi.mocked(prisma.reading.count).mockResolvedValue(1);
      vi.mocked(prisma.proof.count).mockResolvedValue(0);
      vi.mocked(prisma.reading.findMany).mockResolvedValue([]);
      vi.mocked(prisma.proof.findMany).mockResolvedValue([]);
      vi.mocked(prisma.productionStat.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partnerVolumeAllocation.findMany).mockResolvedValue([]);

      vi.mocked(prisma.monthlyEmission.upsert).mockResolvedValue({
        id: 'emission-1',
      } as any);

      vi.mocked(prisma.dashboardSnapshot.upsert).mockResolvedValue({
        id: 'snapshot-1',
      } as any);

      vi.mocked(prisma.monthlyEmission.findMany).mockResolvedValue([]);

      const result = await runMonthlyClose('2025-08');

      expect(result.processedOrganizations).toBe(2); // org1 and org3 succeeded
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].organizationId).toBe('org2');
      expect(result.errors[0].error).toBe('Org2 processing failed');
    });
  });
});
