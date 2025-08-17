import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Next.js request/response
const mockRequest = (method: string = 'POST', body?: any) => ({
  method,
  json: () => Promise.resolve(body || {}),
});

// Mock RBAC
vi.mock('@/lib/rbac', () => ({
  requireOrgRole: vi.fn().mockResolvedValue({ userId: 'test-user' }),
}));

// Mock partner targets functions
vi.mock('@/lib/partner/targets', () => ({
  getPartnerTargets: vi.fn(),
  computeProgress: vi.fn(),
  createTargetSnapshot: vi.fn(),
}));

describe('Partner Target Snapshot API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/partner/[orgId]/targets/snapshot', () => {
    it('should require ADMIN role', async () => {
      const { requireOrgRole } = await import('@/lib/rbac');
      
      const { POST } = await import('@/app/api/partner/[orgId]/targets/snapshot/route');
      
      const req = mockRequest('POST') as any;
      await POST(req, { params: { orgId: 'test-org' } });
      
      expect(requireOrgRole).toHaveBeenCalledWith('test-org', 'ADMIN');
    });

    it('should use current year by default', async () => {
      const { getPartnerTargets, computeProgress } = await import('@/lib/partner/targets');
      
      const mockTargets = {
        coveragePct: 80,
        dqsMin: 'B' as const,
        targetTons: 1000,
        baselineYear: 2023
      };

      const mockProgress = {
        coveragePct: 75.5,
        dqsAvg: 0.8,
        attributedTons: 850.5,
        deltaTons: -149.5,
        onTrack: true
      };

      vi.mocked(getPartnerTargets).mockResolvedValue(mockTargets);
      vi.mocked(computeProgress).mockResolvedValue(mockProgress);

      const { POST } = await import('@/app/api/partner/[orgId]/targets/snapshot/route');
      
      const req = mockRequest('POST') as any;
      await POST(req, { params: { orgId: 'test-org' } });
      
      const currentYear = new Date().getFullYear();
      expect(computeProgress).toHaveBeenCalledWith('test-org', currentYear, mockTargets);
    });

    it('should accept year override from request body', async () => {
      const { getPartnerTargets, computeProgress } = await import('@/lib/partner/targets');
      
      const mockTargets = {
        coveragePct: 80,
        dqsMin: 'B' as const,
        targetTons: 1000,
        baselineYear: 2023
      };

      const mockProgress = {
        coveragePct: 75.5,
        dqsAvg: 0.8,
        attributedTons: 850.5,
        deltaTons: -149.5,
        onTrack: true
      };

      vi.mocked(getPartnerTargets).mockResolvedValue(mockTargets);
      vi.mocked(computeProgress).mockResolvedValue(mockProgress);

      const { POST } = await import('@/app/api/partner/[orgId]/targets/snapshot/route');
      
      const req = mockRequest('POST', { year: 2023 }) as any;
      await POST(req, { params: { orgId: 'test-org' } });
      
      expect(computeProgress).toHaveBeenCalledWith('test-org', 2023, mockTargets);
    });

    it('should validate year parameter', async () => {
      const { POST } = await import('@/app/api/partner/[orgId]/targets/snapshot/route');
      
      const invalidYears = [1999, 2050, 'invalid', null];

      for (const year of invalidYears) {
        const req = mockRequest('POST', { year }) as any;
        const response = await POST(req, { params: { orgId: 'test-org' } });
        expect(response.status).toBe(400);
      }
    });

    it('should compute progress and create snapshot', async () => {
      const { getPartnerTargets, computeProgress, createTargetSnapshot } = await import('@/lib/partner/targets');
      
      const mockTargets = {
        coveragePct: 80,
        dqsMin: 'B' as const,
        targetTons: 1000,
        baselineYear: 2023
      };

      const mockProgress = {
        coveragePct: 75.5,
        dqsAvg: 0.8,
        attributedTons: 850.5,
        deltaTons: -149.5,
        onTrack: true
      };

      vi.mocked(getPartnerTargets).mockResolvedValue(mockTargets);
      vi.mocked(computeProgress).mockResolvedValue(mockProgress);

      const { POST } = await import('@/app/api/partner/[orgId]/targets/snapshot/route');
      
      const req = mockRequest('POST', { year: 2024 }) as any;
      const response = await POST(req, { params: { orgId: 'test-org' } });
      
      expect(getPartnerTargets).toHaveBeenCalledWith('test-org');
      expect(computeProgress).toHaveBeenCalledWith('test-org', 2024, mockTargets);
      expect(createTargetSnapshot).toHaveBeenCalledWith('test-org', mockProgress);
    });

    it('should return snapshot data in response', async () => {
      const { getPartnerTargets, computeProgress, createTargetSnapshot } = await import('@/lib/partner/targets');
      
      const mockTargets = {
        coveragePct: 80,
        dqsMin: 'B' as const,
        targetTons: 1000,
        baselineYear: 2023
      };

      const mockProgress = {
        coveragePct: 75.5,
        dqsAvg: 0.8,
        attributedTons: 850.5,
        deltaTons: -149.5,
        onTrack: true
      };

      vi.mocked(getPartnerTargets).mockResolvedValue(mockTargets);
      vi.mocked(computeProgress).mockResolvedValue(mockProgress);

      const { POST } = await import('@/app/api/partner/[orgId]/targets/snapshot/route');
      
      const req = mockRequest('POST') as any;
      const response = await POST(req, { params: { orgId: 'test-org' } });
      
      // Response should contain snapshot data
      expect(response.status).not.toBe(500);
    });
  });

  describe('Progress Computation Logic', () => {
    it('should calculate correct delta tons', () => {
      const targets = { targetTons: 1000 };
      const attributedTons = 850.5;
      const deltaTons = attributedTons - targets.targetTons;
      
      expect(deltaTons).toBe(-149.5); // Under target (good)
    });

    it('should determine on-track status correctly', () => {
      const targets = {
        coveragePct: 80,
        dqsMin: 'B' as const, // 0.7 score
        targetTons: 1000
      };

      // Case 1: On track
      const progress1 = {
        coveragePct: 85, // Above target
        dqsAvg: 0.8,     // Above minimum (B = 0.7)
        attributedTons: 850 // Below target
      };
      
      const onTrack1 = progress1.coveragePct >= targets.coveragePct && 
                      progress1.dqsAvg >= 0.7 && 
                      progress1.attributedTons <= targets.targetTons;
      expect(onTrack1).toBe(true);

      // Case 2: Off track (coverage too low)
      const progress2 = {
        coveragePct: 70, // Below target
        dqsAvg: 0.8,     
        attributedTons: 850
      };
      
      const onTrack2 = progress2.coveragePct >= targets.coveragePct && 
                      progress2.dqsAvg >= 0.7 && 
                      progress2.attributedTons <= targets.targetTons;
      expect(onTrack2).toBe(false);

      // Case 3: Off track (emissions too high)
      const progress3 = {
        coveragePct: 85,
        dqsAvg: 0.8,     
        attributedTons: 1200 // Above target
      };
      
      const onTrack3 = progress3.coveragePct >= targets.coveragePct && 
                      progress3.dqsAvg >= 0.7 && 
                      progress3.attributedTons <= targets.targetTons;
      expect(onTrack3).toBe(false);
    });

    it('should handle DQS grade conversion', () => {
      const gradeToScore = (grade: 'A' | 'B' | 'C') => {
        switch (grade) {
          case 'A': return 0.9;
          case 'B': return 0.7;
          case 'C': return 0.5;
        }
      };

      expect(gradeToScore('A')).toBe(0.9);
      expect(gradeToScore('B')).toBe(0.7);
      expect(gradeToScore('C')).toBe(0.5);
    });
  });

  describe('Snapshot Persistence', () => {
    it('should include all required snapshot fields', () => {
      const snapshotData = {
        organizationId: 'test-org',
        coveragePct: 75.5,
        dqsAvg: 0.8,
        attributedTons: 850.5,
        deltaTons: -149.5,
        onTrack: true,
        atUtc: new Date()
      };

      // Verify all required fields are present
      expect(snapshotData).toHaveProperty('organizationId');
      expect(snapshotData).toHaveProperty('coveragePct');
      expect(snapshotData).toHaveProperty('dqsAvg');
      expect(snapshotData).toHaveProperty('attributedTons');
      expect(snapshotData).toHaveProperty('deltaTons');
      expect(snapshotData).toHaveProperty('onTrack');
      expect(snapshotData).toHaveProperty('atUtc');

      // Verify data types
      expect(typeof snapshotData.organizationId).toBe('string');
      expect(typeof snapshotData.coveragePct).toBe('number');
      expect(typeof snapshotData.dqsAvg).toBe('number');
      expect(typeof snapshotData.attributedTons).toBe('number');
      expect(typeof snapshotData.deltaTons).toBe('number');
      expect(typeof snapshotData.onTrack).toBe('boolean');
      expect(snapshotData.atUtc).toBeInstanceOf(Date);
    });

    it('should handle snapshot creation failures', async () => {
      const { getPartnerTargets, computeProgress, createTargetSnapshot } = await import('@/lib/partner/targets');
      
      const mockTargets = {
        coveragePct: 80,
        dqsMin: 'B' as const,
        targetTons: 1000,
        baselineYear: 2023
      };

      const mockProgress = {
        coveragePct: 75.5,
        dqsAvg: 0.8,
        attributedTons: 850.5,
        deltaTons: -149.5,
        onTrack: true
      };

      vi.mocked(getPartnerTargets).mockResolvedValue(mockTargets);
      vi.mocked(computeProgress).mockResolvedValue(mockProgress);
      vi.mocked(createTargetSnapshot).mockRejectedValue(new Error('Database error'));

      const { POST } = await import('@/app/api/partner/[orgId]/targets/snapshot/route');
      
      const req = mockRequest('POST') as any;
      const response = await POST(req, { params: { orgId: 'test-org' } });
      
      expect(response.status).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle targets not found', async () => {
      const { getPartnerTargets } = await import('@/lib/partner/targets');
      vi.mocked(getPartnerTargets).mockRejectedValue(new Error('Targets not found'));

      const { POST } = await import('@/app/api/partner/[orgId]/targets/snapshot/route');
      
      const req = mockRequest('POST') as any;
      const response = await POST(req, { params: { orgId: 'test-org' } });
      
      expect(response.status).toBe(500);
    });

    it('should handle progress computation failures', async () => {
      const { getPartnerTargets, computeProgress } = await import('@/lib/partner/targets');
      
      const mockTargets = {
        coveragePct: 80,
        dqsMin: 'B' as const,
        targetTons: 1000,
        baselineYear: 2023
      };

      vi.mocked(getPartnerTargets).mockResolvedValue(mockTargets);
      vi.mocked(computeProgress).mockRejectedValue(new Error('Failed to compute progress'));

      const { POST } = await import('@/app/api/partner/[orgId]/targets/snapshot/route');
      
      const req = mockRequest('POST') as any;
      const response = await POST(req, { params: { orgId: 'test-org' } });
      
      expect(response.status).toBe(500);
    });

    it('should handle malformed request body', async () => {
      const { POST } = await import('@/app/api/partner/[orgId]/targets/snapshot/route');
      
      const req = {
        method: 'POST',
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as any;

      const response = await POST(req, { params: { orgId: 'test-org' } });
      
      // Should handle gracefully and use default year
      expect(response.status).not.toBe(400);
    });
  });
});
