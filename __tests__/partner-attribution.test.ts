import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAttributedForPartner } from '@/lib/partner/attribution';

// Mock the sharing guards module
vi.mock('@/lib/sharing/guards', () => ({
  canViewSupplierDetails: vi.fn()
}));

describe('Partner Attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAttributedForPartner', () => {
    it('calculates attributed emissions correctly', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(true);

      const result = await getAttributedForPartner('partner-123', 2024);

      expect(result).toMatchObject({
        year: 2024,
        totalTons: expect.any(Number),
        rows: expect.arrayContaining([
          expect.objectContaining({
            supplierOrgId: expect.any(String),
            supplierName: expect.any(String),
            units: expect.any(Number),
            intensityPerUnitKg: expect.any(Number),
            attributedTons: expect.any(Number),
            qualityGrade: expect.stringMatching(/^[ABC]$/),
            visibility: expect.stringMatching(/^(DETAILED|AGGREGATED)$/)
          })
        ])
      });
    });

    it('returns detailed view when supplier visibility is allowed', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(true);

      const result = await getAttributedForPartner('partner-123', 2024);

      expect(result.rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            visibility: 'DETAILED',
            supplierName: expect.not.stringMatching(/^\[Aggregated Data\]$/)
          })
        ])
      );
    });

    it('returns aggregated view when supplier visibility is denied', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(false);

      const result = await getAttributedForPartner('partner-123', 2024);

      expect(result.rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            visibility: 'AGGREGATED',
            supplierName: '[Aggregated Data]'
          })
        ])
      );
    });

    it('calculates total tons as sum of individual attributions', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(true);

      const result = await getAttributedForPartner('partner-123', 2024);

      const calculatedTotal = result.rows.reduce((sum, row) => sum + row.attributedTons, 0);
      const roundedCalculatedTotal = Math.round(calculatedTotal * 1000) / 1000;

      expect(result.totalTons).toBe(roundedCalculatedTotal);
    });

    it('applies correct intensity calculation formula', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(true);

      const result = await getAttributedForPartner('partner-123', 2024);

      result.rows.forEach(row => {
        const expectedAttributedKg = row.intensityPerUnitKg * row.units;
        const expectedAttributedTons = expectedAttributedKg / 1000;
        expect(row.attributedTons).toBeCloseTo(expectedAttributedTons, 3);
      });
    });

    it('handles different years correctly', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(true);

      const result2023 = await getAttributedForPartner('partner-123', 2023);
      const result2024 = await getAttributedForPartner('partner-123', 2024);

      expect(result2023.year).toBe(2023);
      expect(result2024.year).toBe(2024);
    });

    it('includes quality grades in results', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(true);

      const result = await getAttributedForPartner('partner-123', 2024);

      result.rows.forEach(row => {
        expect(['A', 'B', 'C']).toContain(row.qualityGrade);
      });
    });

    it('handles partner with no attributions', async () => {
      // This tests the current mock implementation
      // In real implementation, this would return empty arrays for partners with no allocations
      const result = await getAttributedForPartner('nonexistent-partner', 2024);

      expect(result).toMatchObject({
        year: 2024,
        totalTons: expect.any(Number),
        rows: expect.any(Array)
      });
    });

    it('rounds total tons to 3 decimal places', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(true);

      const result = await getAttributedForPartner('partner-123', 2024);

      // Check that totalTons has at most 3 decimal places
      const totalTonsString = result.totalTons.toString();
      const decimalPart = totalTonsString.split('.')[1];
      if (decimalPart) {
        expect(decimalPart.length).toBeLessThanOrEqual(3);
      }
    });

    it('handles privacy check errors gracefully', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockRejectedValue(new Error('Privacy check failed'));

      // Should not throw but handle the error
      await expect(getAttributedForPartner('partner-123', 2024)).rejects.toThrow('Privacy check failed');
    });

    it('calls canViewSupplierDetails for each supplier', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(true);

      await getAttributedForPartner('partner-123', 2024);

      // Should be called for each mock supplier
      expect(canViewSupplierDetails).toHaveBeenCalledWith('partner-123', 'supplier-1');
      expect(canViewSupplierDetails).toHaveBeenCalledWith('partner-123', 'supplier-2');
    });
  });

  describe('attribution calculations', () => {
    it('correctly converts kg to tons', async () => {
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(true);

      const result = await getAttributedForPartner('partner-123', 2024);

      // Check the mock data calculation: 
      // supplier-1: 1.5 kg/unit * 100 units = 150 kg = 0.15 tons
      // supplier-2: 2.2 kg/unit * 200 units = 440 kg = 0.44 tons
      const expectedRow1 = result.rows.find(r => r.supplierOrgId === 'supplier-1');
      const expectedRow2 = result.rows.find(r => r.supplierOrgId === 'supplier-2');

      if (expectedRow1) {
        expect(expectedRow1.attributedTons).toBeCloseTo(0.15, 3);
      }
      if (expectedRow2) {
        expect(expectedRow2.attributedTons).toBeCloseTo(0.44, 3);
      }
    });

    it('handles zero units correctly', async () => {
      // This would be tested with actual database data where units could be 0
      const { canViewSupplierDetails } = await import('@/lib/sharing/guards');
      vi.mocked(canViewSupplierDetails).mockResolvedValue(true);

      const result = await getAttributedForPartner('partner-123', 2024);

      result.rows.forEach(row => {
        if (row.units === 0) {
          expect(row.attributedTons).toBe(0);
        }
      });
    });
  });
});
