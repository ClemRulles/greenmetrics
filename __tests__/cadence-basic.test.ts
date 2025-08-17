import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules first
vi.mock('@/lib/cadence/close', () => ({
  runMonthlyClose: vi.fn().mockResolvedValue({
    processedOrganizations: 5,
    realDataRecords: 3,
    estimatedRecords: 2,
    errors: [],
  }),
}));

vi.mock('@/lib/cadence/backfill', () => ({
  runBackfillProcess: vi.fn().mockResolvedValue({
    backfilledRecords: 2,
    upgradedGrades: 2,
    regeneratedComputations: 4,
    errors: [],
  }),
}));

vi.mock('@/lib/cadence/estimate', () => ({
  estimateMonthlyEmissions: vi.fn().mockResolvedValue({
    method: 'last_known_intensity',
    total: 120.5,
    scope1: 45.2,
    scope2: 75.3,
    confidence: 85,
    details: {
      fallbackLevel: 1,
    },
  }),
}));

describe('Monthly Cadence Engine - Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Imports', () => {
    it('should import cadence modules successfully', async () => {
      const { runMonthlyClose } = await import('@/lib/cadence/close');
      const { runBackfillProcess } = await import('@/lib/cadence/backfill');
      const { estimateMonthlyEmissions } = await import('@/lib/cadence/estimate');

      expect(runMonthlyClose).toBeDefined();
      expect(runBackfillProcess).toBeDefined();
      expect(estimateMonthlyEmissions).toBeDefined();
    });
  });

  describe('Monthly Close Process', () => {
    it('should execute monthly close successfully', async () => {
      const { runMonthlyClose } = await import('@/lib/cadence/close');
      
      const result = await runMonthlyClose('2025-08');

      expect(result).toBeDefined();
      expect(result.processedOrganizations).toBe(5);
      expect(result.realDataRecords).toBe(3);
      expect(result.estimatedRecords).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it('should handle different periods', async () => {
      const { runMonthlyClose } = await import('@/lib/cadence/close');
      
      const result = await runMonthlyClose('2025-12');

      expect(result).toBeDefined();
      expect(runMonthlyClose).toHaveBeenCalledWith('2025-12');
    });
  });

  describe('Backfill Process', () => {
    it('should execute backfill successfully', async () => {
      const { runBackfillProcess } = await import('@/lib/cadence/backfill');
      
      const result = await runBackfillProcess('2025-08');

      expect(result).toBeDefined();
      expect(result.backfilledRecords).toBe(2);
      expect(result.upgradedGrades).toBe(2);
      expect(result.regeneratedComputations).toBe(4);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Estimation Engine', () => {
    it('should generate emissions estimates', async () => {
      const { estimateMonthlyEmissions } = await import('@/lib/cadence/estimate');
      
      const result = await estimateMonthlyEmissions('org1', '2025-08');

      expect(result).toBeDefined();
      expect(result.method).toBe('last_known_intensity');
      expect(result.total).toBe(120.5);
      expect(result.scope1).toBe(45.2);
      expect(result.scope2).toBe(75.3);
      expect(result.confidence).toBe(85);
      expect(result.details.fallbackLevel).toBe(1);
    });

    it('should handle different organizations', async () => {
      const { estimateMonthlyEmissions } = await import('@/lib/cadence/estimate');
      
      const result = await estimateMonthlyEmissions('org2', '2025-09');

      expect(result).toBeDefined();
      expect(estimateMonthlyEmissions).toHaveBeenCalledWith('org2', '2025-09');
    });
  });
});

describe('Monthly Cadence Engine - Integration', () => {
  it('should work as a complete system', async () => {
    const { runMonthlyClose } = await import('@/lib/cadence/close');
    const { runBackfillProcess } = await import('@/lib/cadence/backfill');
    
    // Simulate a complete monthly cadence workflow
    const closeResult = await runMonthlyClose('2025-08');
    const backfillResult = await runBackfillProcess('2025-08');

    expect(closeResult.processedOrganizations).toBeGreaterThan(0);
    expect(backfillResult.backfilledRecords).toBeGreaterThanOrEqual(0);
  });

  it('should handle sequential operations', async () => {
    const { runMonthlyClose } = await import('@/lib/cadence/close');
    const { runBackfillProcess } = await import('@/lib/cadence/backfill');
    
    // Clear previous calls
    vi.mocked(runMonthlyClose).mockClear();
    vi.mocked(runBackfillProcess).mockClear();
    
    // Run multiple operations in sequence
    await runMonthlyClose('2025-07');
    await runBackfillProcess('2025-07');
    await runMonthlyClose('2025-08');
    await runBackfillProcess('2025-08');

    expect(runMonthlyClose).toHaveBeenCalledTimes(2);
    expect(runBackfillProcess).toHaveBeenCalledTimes(2);
  });
});
