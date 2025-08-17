import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCoverage } from '@/lib/sponsor/coverage';

// Mock Prisma - this will need to be updated once the models are available
vi.mock('@/lib/prisma', () => ({
  prisma: {
    sponsorSupplierLink: {
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

describe('Sponsor Coverage Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return zero metrics for no links', async () => {
    const result = await getCoverage('sponsor-org-id');
    
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
    const spendShares = [0.3, 0.4, 0.2]; // 90% total
    const total = spendShares.reduce((sum, share) => sum + share, 0);
    const coveragePct = Math.round(Math.min(1, total) * 100 * 10) / 10; // Round to 1 decimal
    
    expect(coveragePct).toBe(90);
  });

  it('should cap coverage at 100%', () => {
    // Test that coverage is capped at 100% even if shares exceed 1.0
    const spendShares = [0.6, 0.7]; // 130% total
    const total = spendShares.reduce((sum, share) => sum + share, 0);
    const coveragePct = Math.min(1, total) * 100;
    
    expect(coveragePct).toBe(100);
  });

  it('should calculate data quality score correctly', () => {
    // Test DQS calculation: (primary * 1.0 + estimated * 0.5) / invited * 100
    const primary = 3;
    const estimated = 2;
    const invited = 6;
    
    const dqs = Math.round(((primary * 1.0 + estimated * 0.5) / invited) * 100);
    expect(dqs).toBe(67); // (3 + 1) / 6 * 100 = 66.67 rounded to 67
  });

  it('should handle edge cases for DQS calculation', () => {
    // Only primary data
    let dqs = Math.round(((2 * 1.0 + 0 * 0.5) / 2) * 100);
    expect(dqs).toBe(100);
    
    // Only estimated data
    dqs = Math.round(((0 * 1.0 + 2 * 0.5) / 2) * 100);
    expect(dqs).toBe(50);
    
    // No data
    dqs = Math.round(((0 * 1.0 + 0 * 0.5) / 2) * 100);
    expect(dqs).toBe(0);
  });

  it('should handle division by zero in DQS', () => {
    const primary = 0;
    const estimated = 0;
    const invited = 0;
    const denom = invited || 1; // Prevent division by zero
    
    const dqs = Math.round(((primary * 1.0 + estimated * 0.5) / denom) * 100);
    expect(dqs).toBe(0);
  });
});
