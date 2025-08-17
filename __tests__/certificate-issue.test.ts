import { describe, it, expect, vi, beforeEach } from 'vitest';
import { issueCertificate, gradeFromCoverage } from '@/lib/certificates/issue';

// Mock the signature module
vi.mock('@/lib/certificates/signature', () => ({
  hmacSign: vi.fn(() => 'mock-signature-hash'),
  generatePublicId: vi.fn(() => 'mock-public-id-123')
}));

describe('Certificate Issuance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gradeFromCoverage', () => {
    it('assigns grade A for high coverage with production data', () => {
      const result = gradeFromCoverage(12, true);
      expect(result).toBe('A');
    });

    it('assigns grade A for 10+ months with production data', () => {
      const result = gradeFromCoverage(10, true);
      expect(result).toBe('A');
    });

    it('assigns grade B for medium coverage with production data', () => {
      const result = gradeFromCoverage(8, true);
      expect(result).toBe('B');
    });

    it('assigns grade B for 6+ months with production data', () => {
      const result = gradeFromCoverage(6, true);
      expect(result).toBe('B');
    });

    it('assigns grade C for low coverage with production data', () => {
      const result = gradeFromCoverage(4, true);
      expect(result).toBe('C');
    });

    it('assigns grade C for high coverage without production data', () => {
      const result = gradeFromCoverage(12, false);
      expect(result).toBe('C');
    });

    it('assigns grade C for zero coverage', () => {
      const result = gradeFromCoverage(0, true);
      expect(result).toBe('C');
    });

    it('assigns grade C for negative coverage', () => {
      const result = gradeFromCoverage(-1, false);
      expect(result).toBe('C');
    });
  });

  describe('issueCertificate', () => {
    const mockRequest = {
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-12-31'),
      unitLabel: 'units produced'
    };

    it('issues certificate with correct structure', async () => {
      const result = await issueCertificate('supplier-123', mockRequest);
      
      expect(result).toMatchObject({
        id: expect.any(String),
        publicId: 'mock-public-id-123',
        publicUrl: '/certificate/mock-public-id-123',
        qrPngDataUrl: expect.stringContaining('data:image/svg+xml;base64,')
      });
    });

    it('generates unique database ID', async () => {
      const result1 = await issueCertificate('supplier-123', mockRequest);
      const result2 = await issueCertificate('supplier-456', mockRequest);
      
      expect(result1.id).not.toBe(result2.id);
    });

    it('creates QR code data URL', async () => {
      const result = await issueCertificate('supplier-123', mockRequest);
      
      expect(result.qrPngDataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('generates public URL with correct format', async () => {
      const result = await issueCertificate('supplier-123', mockRequest);
      
      expect(result.publicUrl).toBe('/certificate/mock-public-id-123');
    });

    it('calls signature generation', async () => {
      const { hmacSign } = await import('@/lib/certificates/signature');
      
      await issueCertificate('supplier-123', mockRequest);
      
      expect(hmacSign).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierOrgId: 'supplier-123',
          periodStart: mockRequest.periodStart,
          periodEnd: mockRequest.periodEnd,
          unitLabel: mockRequest.unitLabel
        })
      );
    });

    it('calls public ID generation', async () => {
      const { generatePublicId } = await import('@/lib/certificates/signature');
      
      await issueCertificate('supplier-123', mockRequest);
      
      expect(generatePublicId).toHaveBeenCalled();
    });

    it('handles different unit labels', async () => {
      const customRequest = {
        ...mockRequest,
        unitLabel: 'widgets manufactured'
      };
      
      const result = await issueCertificate('supplier-456', customRequest);
      
      expect(result).toMatchObject({
        id: expect.any(String),
        publicId: 'mock-public-id-123',
        publicUrl: '/certificate/mock-public-id-123',
        qrPngDataUrl: expect.stringContaining('data:image/svg+xml;base64,')
      });
    });

    it('handles different date ranges', async () => {
      const customRequest = {
        periodStart: new Date('2024-06-01'),
        periodEnd: new Date('2024-06-30'),
        unitLabel: 'products'
      };
      
      const result = await issueCertificate('supplier-789', customRequest);
      
      expect(result).toMatchObject({
        id: expect.any(String),
        publicId: 'mock-public-id-123',
        publicUrl: '/certificate/mock-public-id-123',
        qrPngDataUrl: expect.stringContaining('data:image/svg+xml;base64,')
      });
    });
  });

  describe('error handling', () => {
    const mockRequest = {
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-12-31'),
      unitLabel: 'units produced'
    };

    it('handles invalid supplier ID', async () => {
      const result = await issueCertificate('', mockRequest);
      
      // Should still complete but with empty supplier ID
      expect(result).toMatchObject({
        id: expect.any(String),
        publicId: 'mock-public-id-123'
      });
    });

    it('handles invalid date range', async () => {
      const invalidRequest = {
        periodStart: new Date('2024-12-31'),
        periodEnd: new Date('2024-01-01'), // End before start
        unitLabel: 'units'
      };
      
      const result = await issueCertificate('supplier-123', invalidRequest);
      
      // Should still complete but with the provided dates
      expect(result).toMatchObject({
        id: expect.any(String),
        publicId: 'mock-public-id-123'
      });
    });
  });
});
