import { describe, it, expect } from 'vitest';
import { calculateActiveSuppliers } from '@/lib/billing/entitlements';
import { calculateSeats, PLAN_RULES } from '@/lib/billing/plans';

describe('Billing Seat Calculation', () => {
  describe('calculateActiveSuppliers', () => {
    it('should return correct supplier counts for different orgs', async () => {
      // Test known mock data
      const org1Count = await calculateActiveSuppliers('org-1');
      expect(org1Count).toBe(12);

      const org2Count = await calculateActiveSuppliers('org-2');
      expect(org2Count).toBe(45);

      const org3Count = await calculateActiveSuppliers('org-3');
      expect(org3Count).toBe(2);
    });

    it('should return 0 for unknown organizations', async () => {
      const unknownCount = await calculateActiveSuppliers('unknown-org-id');
      expect(unknownCount).toBe(0);
    });

    it('should handle custom date periods', async () => {
      const period = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-31T23:59:59Z'),
      };

      const count = await calculateActiveSuppliers('org-1', period);
      expect(count).toBe(12); // Mock data returns same value regardless of period
    });

    it('should handle current month period calculation', async () => {
      // Test without explicit period (should use current month)
      const count = await calculateActiveSuppliers('org-1');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateSeats', () => {
    it('should return 0 seats for FREE plan', () => {
      const seats = calculateSeats(5, 'FREE');
      expect(seats).toBe(0);
    });

    it('should calculate seats correctly for BASIC plan', () => {
      const basicLimit = PLAN_RULES.BASIC.entitlements.maxSuppliersLinked;
      
      // Within limit - should be base subscription only
      const seatsWithinLimit = calculateSeats(10, 'BASIC');
      expect(seatsWithinLimit).toBe(1);

      // At limit - should be base subscription only
      const seatsAtLimit = calculateSeats(basicLimit, 'BASIC');
      expect(seatsAtLimit).toBe(1);

      // Over limit - should be base + additional seats
      const seatsOverLimit = calculateSeats(basicLimit + 5, 'BASIC');
      expect(seatsOverLimit).toBe(1 + 5);
    });

    it('should calculate seats correctly for PRO plan', () => {
      const proLimit = PLAN_RULES.PRO.entitlements.maxSuppliersLinked;
      
      // Within limit - should be base subscription only
      const seatsWithinLimit = calculateSeats(50, 'PRO');
      expect(seatsWithinLimit).toBe(1);

      // At limit - should be base subscription only
      const seatsAtLimit = calculateSeats(proLimit, 'PRO');
      expect(seatsAtLimit).toBe(1);

      // Over limit - should be base + additional seats
      const seatsOverLimit = calculateSeats(proLimit + 10, 'PRO');
      expect(seatsOverLimit).toBe(1 + 10);
    });

    it('should handle edge cases', () => {
      // Zero suppliers
      expect(calculateSeats(0, 'BASIC')).toBe(1);
      expect(calculateSeats(0, 'PRO')).toBe(1);
      expect(calculateSeats(0, 'FREE')).toBe(0);

      // Negative suppliers (shouldn't happen but test defensive programming)
      expect(calculateSeats(-1, 'BASIC')).toBe(1);
      expect(calculateSeats(-5, 'PRO')).toBe(1);
    });
  });

  describe('Seat-based billing scenarios', () => {
    it('should demonstrate realistic billing scenarios', async () => {
      // Small organization with few suppliers
      const smallOrgSuppliers = await calculateActiveSuppliers('org-3'); // 2 suppliers
      const smallOrgBasicSeats = calculateSeats(smallOrgSuppliers, 'BASIC');
      expect(smallOrgBasicSeats).toBe(1); // Base subscription only

      // Medium organization pushing limits
      const mediumOrgSuppliers = await calculateActiveSuppliers('org-1'); // 12 suppliers
      const mediumOrgBasicSeats = calculateSeats(mediumOrgSuppliers, 'BASIC');
      expect(mediumOrgBasicSeats).toBe(1); // Still within BASIC limits

      // Large organization exceeding basic limits
      const largeOrgSuppliers = await calculateActiveSuppliers('org-2'); // 45 suppliers
      const largeOrgBasicSeats = calculateSeats(largeOrgSuppliers, 'BASIC');
      const basicLimit = PLAN_RULES.BASIC.entitlements.maxSuppliersLinked; // 25
      const expectedAdditionalSeats = largeOrgSuppliers - basicLimit; // 45 - 25 = 20
      expect(largeOrgBasicSeats).toBe(1 + expectedAdditionalSeats); // Base + 20 additional

      // Same org on PRO plan
      const largeOrgProSeats = calculateSeats(largeOrgSuppliers, 'PRO');
      expect(largeOrgProSeats).toBe(1); // 45 is within PRO limit of 200
    });

    it('should validate plan upgrade scenarios', async () => {
      const orgSuppliers = 30; // Exceeds BASIC (25) but within PRO (200)

      // On BASIC plan - needs additional seats
      const basicSeats = calculateSeats(orgSuppliers, 'BASIC');
      expect(basicSeats).toBe(1 + 5); // Base + 5 additional

      // On PRO plan - base subscription only
      const proSeats = calculateSeats(orgSuppliers, 'PRO');
      expect(proSeats).toBe(1); // Within limits

      // Demonstrates PRO is more cost-effective for this usage
      expect(proSeats).toBeLessThan(basicSeats);
    });

    it('should handle monthly billing period calculations', () => {
      // Test current month period boundaries
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      expect(monthStart.getDate()).toBe(1);
      expect(monthEnd.getMonth()).toBe(now.getMonth());
      
      // Verify dates are properly formatted for seat calculation period
      expect(monthStart.getTime()).toBeLessThan(monthEnd.getTime());
    });
  });

  describe('Partner seat calculation integration', () => {
    it('should reflect realistic partner-supplier relationships', async () => {
      // A partner with many suppliers should have higher seat count
      const enterprisePartnerSuppliers = 150;
      
      // On BASIC: way over limit, expensive with additional seats
      const basicSeats = calculateSeats(enterprisePartnerSuppliers, 'BASIC');
      expect(basicSeats).toBe(1 + (150 - 25)); // 1 + 125 = 126 seats
      
      // On PRO: within limit, just base subscription
      const proSeats = calculateSeats(enterprisePartnerSuppliers, 'PRO');
      expect(proSeats).toBe(1);
      
      // Clear cost advantage for PRO at this scale
      expect(proSeats).toBeLessThan(basicSeats);
    });

    it('should validate supplier linking affects billing', async () => {
      // Scenario: partner starts small, grows over time
      const phases = [
        { suppliers: 5, expectedBasicSeats: 1 },      // Early stage
        { suppliers: 20, expectedBasicSeats: 1 },     // Growing
        { suppliers: 30, expectedBasicSeats: 6 },     // Exceeded basic limit
        { suppliers: 50, expectedBasicSeats: 26 },    // Significant overage
      ];

      phases.forEach(({ suppliers, expectedBasicSeats }) => {
        const actualSeats = calculateSeats(suppliers, 'BASIC');
        expect(actualSeats).toBe(expectedBasicSeats);
      });
    });
  });
});
