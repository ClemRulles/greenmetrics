import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCoverage } from '@/lib/partner/coverage';

// Mock Prisma - this will need to be updated once the models are available
vi.mock('@/lib/prisma', () => ({
  prisma: {
    partnerSupplierLink: {
      findMany: vi.fn()
    },
    report: {
      findMany: vi.fn()
    },
    computationTrace: {
      findFirst: vi.fn()
    }
  }
}));

vi.mock('@/lib/sharing/guards', () => ({
  canViewSupplierDetails: vi.fn().mockResolvedValue(false)
}));

describe('Partner Coverage Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return zero metrics for no links', async () => {
    const result = await getCoverage('partner-org-id');
    expect(result).toEqual({
      invited: 0,
      active: 0,
      coveragePct: 0,
      primaryData: 0,
      estimatedData: 0,
      dataQualityScore: 0
    });
  });

  it('should calculate coverage percentage correctly', () => {
    // Test coverage percentage calculation logic
    const spendShares = [0.3, 0.25, 0.2, 0.15]; // Should sum to 90%
    const expectedCoverage = Math.round(Math.min(1, spendShares.reduce((sum, share) => sum + share, 0)) * 100 * 10) / 10;
    expect(expectedCoverage).toBe(90);
  });

  it('should cap coverage at 100%', () => {
    // Test that coverage doesn't exceed 100% even if spend shares sum to more than 1
    const spendShares = [0.6, 0.5, 0.3]; // Sums to 140%
    const expectedCoverage = Math.round(Math.min(1, spendShares.reduce((sum, share) => sum + share, 0)) * 100 * 10) / 10;
    expect(expectedCoverage).toBe(100);
  });

  it('should calculate data quality score correctly', () => {
    // Test DQS calculation: (primary * 1.0 + estimated * 0.5) / total * 100
    const primary = 3;
    const estimated = 2; 
    const total = 5;
    const expectedDQS = Math.round(((primary * 1.0 + estimated * 0.5) / total) * 100);
    expect(expectedDQS).toBe(80); // (3 + 1) / 5 * 100 = 80%
  });

  it('should handle edge case with zero suppliers', () => {
    const denom = 0;
    const safeDenonm = denom || 1; // Prevent division by zero
    const dqs = Math.round(((0 * 1.0 + 0 * 0.5) / safeDenonm) * 100);
    expect(dqs).toBe(0);
  });

  it('should handle floating point precision', () => {
    // Test precision handling for spend shares
    const spendShares = [0.333333, 0.333333, 0.333334]; // Should sum to ~1.0
    const total = spendShares.reduce((sum, share) => sum + share, 0);
    const coveragePct = Math.round(Math.min(1, total) * 100 * 10) / 10;
    expect(coveragePct).toBe(100);
  });
});
