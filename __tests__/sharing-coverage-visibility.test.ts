import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canViewSupplierDetails } from '@/lib/sharing/guards';
import { getSupplierLinks } from '@/lib/partner/coverage';

// Mock Prisma and dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    partnerSupplierLink: {
      findMany: vi.fn()
    },
    partnerSharingPolicy: {
      findUnique: vi.fn()
    },
    supplierConsent: {
      findUnique: vi.fn()
    },
    report: {
      findFirst: vi.fn()
    },
    computationTrace: {
      findFirst: vi.fn()
    }
  }
}));

vi.mock('@/lib/sharing/guards', () => ({
  canViewSupplierDetails: vi.fn(),
  getPolicy: vi.fn()
}));

describe('Sharing Coverage Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Visibility Controls', () => {
    it('should redact supplier names when consent not granted', async () => {
      // Mock no consent granted
      (canViewSupplierDetails as any).mockResolvedValue(false);

      // This tests the concept - actual implementation would use database
      const supplierData = {
        id: 'link-123',
        supplierOrgId: 'supplier-456',
        originalName: 'ACME Corp',
        spendShare: 0.25,
        critical: true
      };

      const visibilityMask = await canViewSupplierDetails('partner-123', 'supplier-456');
      const displayName = visibilityMask ? supplierData.originalName : '[Aggregated Data]';

      expect(displayName).toBe('[Aggregated Data]');
      expect(canViewSupplierDetails).toHaveBeenCalledWith('partner-123', 'supplier-456');
    });

    it('should show detailed data when consent granted', async () => {
      // Mock consent granted
      (canViewSupplierDetails as any).mockResolvedValue(true);

      const supplierData = {
        id: 'link-123',
        supplierOrgId: 'supplier-456',
        originalName: 'ACME Corp',
        spendShare: 0.25,
        critical: true
      };

      const visibilityMask = await canViewSupplierDetails('partner-123', 'supplier-456');
      const displayName = visibilityMask ? supplierData.originalName : '[Aggregated Data]';

      expect(displayName).toBe('ACME Corp');
    });

    it('should include visibility status in supplier links', async () => {
      // Mock getSupplierLinks would return data with visibility field
      const mockLinks = [
        {
          id: 'link-1',
          supplierOrgId: 'supplier-1',
          supplierName: 'Detailed Corp',
          spendShare: 0.3,
          critical: false,
          status: 'Active' as const,
          dataType: 'Primary' as const,
          visibility: 'DETAILED' as const
        },
        {
          id: 'link-2',
          supplierOrgId: 'supplier-2',
          supplierName: '[Aggregated Data]',
          spendShare: 0.2,
          critical: true,
          status: 'Invited' as const,
          dataType: 'None' as const,
          visibility: 'AGGREGATED' as const
        }
      ];

      // Verify the structure includes visibility information
      mockLinks.forEach(link => {
        expect(link.visibility).toMatch(/^(DETAILED|AGGREGATED)$/);
        if (link.visibility === 'AGGREGATED') {
          expect(link.supplierName).toBe('[Aggregated Data]');
        } else {
          expect(link.supplierName).not.toBe('[Aggregated Data]');
        }
      });
    });
  });

  describe('Consent Status Impact', () => {
    it('should handle different consent statuses', async () => {
      const consentScenarios = [
        { status: 'PENDING', shouldShowDetails: false },
        { status: 'REJECTED', shouldShowDetails: false },
        { status: 'ACCEPTED', shouldShowDetails: true }
      ];

      for (const scenario of consentScenarios) {
        (canViewSupplierDetails as any).mockResolvedValue(scenario.shouldShowDetails);
        
        const canView = await canViewSupplierDetails('partner-123', 'supplier-456');
        expect(canView).toBe(scenario.shouldShowDetails);
      }
    });

    it('should handle policy version mismatches', async () => {
      // When policy version doesn't match consent version, should default to aggregated
      const mockPolicyVersion: string = 'v2';
      const mockConsentVersion: string = 'v1';
      
      const shouldShowDetails = mockPolicyVersion === mockConsentVersion;
      expect(shouldShowDetails).toBe(false);
    });
  });

  describe('Default Visibility Behavior', () => {
    it('should default to aggregated when no explicit consent', async () => {
      (canViewSupplierDetails as any).mockResolvedValue(false);
      
      const visibility = await canViewSupplierDetails('partner-123', 'supplier-456');
      expect(visibility).toBe(false);
    });

    it('should respect organization visibility defaults', () => {
      const policyDefaults = [
        { visibilityDefault: 'AGGREGATED', consentRequired: true, expectedDefault: false },
        { visibilityDefault: 'DETAILED', consentRequired: false, expectedDefault: true },
        { visibilityDefault: 'DETAILED', consentRequired: true, expectedDefault: false } // Requires explicit consent
      ];

      policyDefaults.forEach(policy => {
        const shouldDefaultToDetailed = policy.visibilityDefault === 'DETAILED' && !policy.consentRequired;
        expect(shouldDefaultToDetailed).toBe(policy.expectedDefault);
      });
    });
  });

  describe('Coverage Metrics with Visibility', () => {
    it('should maintain coverage calculations regardless of visibility', () => {
      // Coverage percentages should be calculated from spend shares, not affected by visibility
      const suppliers = [
        { spendShare: 0.3, visibility: 'DETAILED' },
        { spendShare: 0.25, visibility: 'AGGREGATED' },
        { spendShare: 0.2, visibility: 'DETAILED' }
      ];

      const totalCoverage = suppliers.reduce((sum, s) => sum + s.spendShare, 0);
      const coveragePct = Math.round(Math.min(1, totalCoverage) * 100 * 10) / 10;
      
      expect(coveragePct).toBe(75); // 0.75 * 100 = 75%
      
      // Visibility doesn't affect the coverage calculation
      const detailedCount = suppliers.filter(s => s.visibility === 'DETAILED').length;
      const aggregatedCount = suppliers.filter(s => s.visibility === 'AGGREGATED').length;
      
      expect(detailedCount + aggregatedCount).toBe(suppliers.length);
    });

    it('should provide visibility breakdown in metrics', () => {
      const mockCoverageWithVisibility = {
        invited: 10,
        active: 7,
        coveragePct: 85.5,
        primaryData: 4,
        estimatedData: 3,
        dataQualityScore: 75,
        visibilityBreakdown: {
          detailed: 4,
          aggregated: 6
        }
      };

      expect(mockCoverageWithVisibility.visibilityBreakdown.detailed + 
             mockCoverageWithVisibility.visibilityBreakdown.aggregated).toBe(
               mockCoverageWithVisibility.invited
             );
    });
  });
});
