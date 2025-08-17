import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireEntitlement, getUsageStats, calculateActiveSuppliers, isEntitlementEnabled } from '@/lib/billing/entitlements';
import type { PlanId } from '@/lib/billing/plans';

describe('Entitlements Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireEntitlement', () => {
    it('should allow TARGETS for BASIC plan', async () => {
      // Mock getOrgBillingState to return BASIC plan
      vi.doMock('@/lib/billing/entitlements', async () => {
        const actual = await vi.importActual('@/lib/billing/entitlements');
        return {
          ...actual,
          getOrgBillingState: vi.fn().mockResolvedValue({
            plan: 'BASIC',
            activeSuppliers: 10,
            reportsThisMonth: 5,
            exportsThisHour: 1,
            apiCallsToday: 50,
            storageUsedGB: 2,
            subscriptionStatus: 'active',
          }),
        };
      });

      await expect(requireEntitlement('org-1', 'TARGETS')).resolves.not.toThrow();
    });

    it('should deny TARGETS for FREE plan', async () => {
      // Test with the actual implementation that returns FREE for org-3
      await expect(requireEntitlement('org-3', 'TARGETS')).rejects.toThrow('ENTITLEMENT_TARGETS_DISABLED');
    });

    it('should deny PROOF_VAULT for FREE plan', async () => {
      await expect(requireEntitlement('org-3', 'PROOF_VAULT')).rejects.toThrow('ENTITLEMENT_PROOF_VAULT_DISABLED');
    });

    it('should allow PROOF_VAULT for BASIC plan', async () => {
      await expect(requireEntitlement('org-1', 'PROOF_VAULT')).resolves.not.toThrow();
    });

    it('should deny REPORT when limit exceeded', async () => {
      // Mock high usage
      vi.doMock('@/lib/billing/entitlements', async () => {
        const actual = await vi.importActual('@/lib/billing/entitlements');
        return {
          ...actual,
          getOrgBillingState: vi.fn().mockResolvedValue({
            plan: 'FREE',
            activeSuppliers: 0,
            reportsThisMonth: 10, // Exceeds FREE plan limit of 2
            exportsThisHour: 0,
            apiCallsToday: 0,
            storageUsedGB: 0,
            subscriptionStatus: 'canceled',
          }),
        };
      });

      const { requireEntitlement: mockRequireEntitlement } = await import('@/lib/billing/entitlements');
      
      await expect(mockRequireEntitlement('org-test', 'REPORT')).rejects.toThrow('ENTITLEMENT_REPORT_LIMIT_EXCEEDED');
    });

    it('should deny LINK_SUPPLIER when limit exceeded', async () => {
      // Mock high usage
      vi.doMock('@/lib/billing/entitlements', async () => {
        const actual = await vi.importActual('@/lib/billing/entitlements');
        return {
          ...actual,
          getOrgBillingState: vi.fn().mockResolvedValue({
            plan: 'FREE',
            activeSuppliers: 5, // Exceeds FREE plan limit of 3
            reportsThisMonth: 0,
            exportsThisHour: 0,
            apiCallsToday: 0,
            storageUsedGB: 0,
            subscriptionStatus: 'canceled',
          }),
        };
      });

      const { requireEntitlement: mockRequireEntitlement } = await import('@/lib/billing/entitlements');
      
      await expect(mockRequireEntitlement('org-test', 'LINK_SUPPLIER')).rejects.toThrow('ENTITLEMENT_SUPPLIER_LIMIT_EXCEEDED');
    });

    it('should deny EXPORT when limit exceeded', async () => {
      // Mock high usage
      vi.doMock('@/lib/billing/entitlements', async () => {
        const actual = await vi.importActual('@/lib/billing/entitlements');
        return {
          ...actual,
          getOrgBillingState: vi.fn().mockResolvedValue({
            plan: 'FREE',
            activeSuppliers: 0,
            reportsThisMonth: 0,
            exportsThisHour: 2, // Exceeds FREE plan limit of 1
            apiCallsToday: 0,
            storageUsedGB: 0,
            subscriptionStatus: 'canceled',
          }),
        };
      });

      const { requireEntitlement: mockRequireEntitlement } = await import('@/lib/billing/entitlements');
      
      await expect(mockRequireEntitlement('org-test', 'EXPORT')).rejects.toThrow('ENTITLEMENT_EXPORT_LIMIT_EXCEEDED');
    });

    it('should deny API_CALL when limit exceeded', async () => {
      // Mock high usage
      vi.doMock('@/lib/billing/entitlements', async () => {
        const actual = await vi.importActual('@/lib/billing/entitlements');
        return {
          ...actual,
          getOrgBillingState: vi.fn().mockResolvedValue({
            plan: 'FREE',
            activeSuppliers: 0,
            reportsThisMonth: 0,
            exportsThisHour: 0,
            apiCallsToday: 200, // Exceeds FREE plan limit of 100
            storageUsedGB: 0,
            subscriptionStatus: 'canceled',
          }),
        };
      });

      const { requireEntitlement: mockRequireEntitlement } = await import('@/lib/billing/entitlements');
      
      await expect(mockRequireEntitlement('org-test', 'API_CALL')).rejects.toThrow('ENTITLEMENT_API_LIMIT_EXCEEDED');
    });

    it('should deny access when subscription is inactive', async () => {
      // Mock inactive subscription
      vi.doMock('@/lib/billing/entitlements', async () => {
        const actual = await vi.importActual('@/lib/billing/entitlements');
        return {
          ...actual,
          getOrgBillingState: vi.fn().mockResolvedValue({
            plan: 'BASIC',
            activeSuppliers: 0,
            reportsThisMonth: 0,
            exportsThisHour: 0,
            apiCallsToday: 0,
            storageUsedGB: 0,
            subscriptionStatus: 'past_due',
          }),
        };
      });

      const { requireEntitlement: mockRequireEntitlement } = await import('@/lib/billing/entitlements');
      
      await expect(mockRequireEntitlement('org-test', 'TARGETS')).rejects.toThrow('SUBSCRIPTION_INACTIVE');
    });

    it('should throw error for unknown entitlement type', async () => {
      // @ts-ignore - Testing invalid entitlement type
      await expect(requireEntitlement('org-1', 'INVALID_TYPE')).rejects.toThrow('UNKNOWN_ENTITLEMENT_TYPE');
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics with percentages', async () => {
      const stats = await getUsageStats('org-1');
      
      expect(stats).toHaveProperty('plan');
      expect(stats).toHaveProperty('subscriptionStatus');
      expect(stats).toHaveProperty('usage');
      expect(stats).toHaveProperty('features');
      
      expect(stats.usage.reports).toHaveProperty('used');
      expect(stats.usage.reports).toHaveProperty('limit');
      expect(stats.usage.reports).toHaveProperty('percentage');
      
      expect(stats.usage.suppliers).toHaveProperty('used');
      expect(stats.usage.suppliers).toHaveProperty('limit');
      expect(stats.usage.suppliers).toHaveProperty('percentage');
      
      expect(stats.usage.exports).toHaveProperty('used');
      expect(stats.usage.exports).toHaveProperty('limit');
      expect(stats.usage.exports).toHaveProperty('percentage');
      
      expect(stats.usage.storage).toHaveProperty('used');
      expect(stats.usage.storage).toHaveProperty('limit');
      expect(stats.usage.storage).toHaveProperty('percentage');
    });

    it('should calculate percentages correctly', async () => {
      const stats = await getUsageStats('org-1');
      
      // Verify percentage calculations
      const reportsPercentage = Math.round((stats.usage.reports.used / stats.usage.reports.limit) * 100);
      expect(stats.usage.reports.percentage).toBe(reportsPercentage);
      
      const suppliersPercentage = Math.round((stats.usage.suppliers.used / stats.usage.suppliers.limit) * 100);
      expect(stats.usage.suppliers.percentage).toBe(suppliersPercentage);
    });

    it('should include feature flags', async () => {
      const freeStats = await getUsageStats('org-3'); // FREE plan
      expect(freeStats.features.targetsEnabled).toBe(false);
      expect(freeStats.features.proofVaultEnabled).toBe(false);
      
      const basicStats = await getUsageStats('org-1'); // BASIC plan  
      expect(basicStats.features.targetsEnabled).toBe(true);
      expect(basicStats.features.proofVaultEnabled).toBe(true);
    });
  });

  describe('calculateActiveSuppliers', () => {
    it('should return mock supplier count', async () => {
      const count = await calculateActiveSuppliers('org-1');
      expect(count).toBe(12);
      
      const count2 = await calculateActiveSuppliers('org-2');
      expect(count2).toBe(45);
      
      const count3 = await calculateActiveSuppliers('org-3');
      expect(count3).toBe(2);
      
      const unknownCount = await calculateActiveSuppliers('unknown-org');
      expect(unknownCount).toBe(0);
    });

    it('should handle custom time periods', async () => {
      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };
      
      const count = await calculateActiveSuppliers('org-1', period);
      expect(count).toBe(12); // Same mock data regardless of period for now
    });
  });

  describe('isEntitlementEnabled', () => {
    it('should return correct entitlement status for FREE plan', () => {
      expect(isEntitlementEnabled('FREE', 'TARGETS')).toBe(false);
      expect(isEntitlementEnabled('FREE', 'PROOF_VAULT')).toBe(false);
      expect(isEntitlementEnabled('FREE', 'REPORT')).toBe(true);
      expect(isEntitlementEnabled('FREE', 'EXPORT')).toBe(true);
      expect(isEntitlementEnabled('FREE', 'LINK_SUPPLIER')).toBe(true);
      expect(isEntitlementEnabled('FREE', 'API_CALL')).toBe(true);
    });

    it('should return correct entitlement status for BASIC plan', () => {
      expect(isEntitlementEnabled('BASIC', 'TARGETS')).toBe(true);
      expect(isEntitlementEnabled('BASIC', 'PROOF_VAULT')).toBe(true);
      expect(isEntitlementEnabled('BASIC', 'REPORT')).toBe(true);
      expect(isEntitlementEnabled('BASIC', 'EXPORT')).toBe(true);
      expect(isEntitlementEnabled('BASIC', 'LINK_SUPPLIER')).toBe(true);
      expect(isEntitlementEnabled('BASIC', 'API_CALL')).toBe(true);
    });

    it('should return correct entitlement status for PRO plan', () => {
      expect(isEntitlementEnabled('PRO', 'TARGETS')).toBe(true);
      expect(isEntitlementEnabled('PRO', 'PROOF_VAULT')).toBe(true);
      expect(isEntitlementEnabled('PRO', 'REPORT')).toBe(true);
      expect(isEntitlementEnabled('PRO', 'EXPORT')).toBe(true);
      expect(isEntitlementEnabled('PRO', 'LINK_SUPPLIER')).toBe(true);
      expect(isEntitlementEnabled('PRO', 'API_CALL')).toBe(true);
    });

    it('should return false for unknown entitlement types', () => {
      // @ts-ignore - Testing invalid entitlement type
      expect(isEntitlementEnabled('BASIC', 'UNKNOWN_FEATURE')).toBe(false);
    });
  });
});
