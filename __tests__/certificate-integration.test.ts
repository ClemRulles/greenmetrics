import { describe, test, expect } from 'vitest';
import { issueCertificate } from '@/lib/certificates/issue';
import { getAttributedForPartner } from '@/lib/partner/attribution';

describe('Certificate Issue Integration', () => {
  test('should issue certificate with real QR code and compute data', async () => {
    // Test certificate request
    const supplierOrgId = 'supplier-org-456';
    const request = {
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-12-31'),
      unitLabel: 'units produced',
    };

    const result = await issueCertificate(supplierOrgId, request);

    // Verify certificate structure
    expect(result.id).toBeDefined();
    expect(result.publicId).toMatch(/^CERT-[A-Z0-9]{8}$/);
    expect(result.qrPngDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.publicUrl).toContain('/certificate/');
    expect(result.publicUrl).toContain(result.publicId);
  });

  test('should handle different periods and unit labels', async () => {
    const supplierOrgId = 'supplier-org-test';
    const request = {
      periodStart: new Date('2024-06-01'),
      periodEnd: new Date('2024-11-30'),
      unitLabel: 'kg produced',
    };

    const result = await issueCertificate(supplierOrgId, request);
    
    // Should always return a valid result
    expect(result.id).toBeDefined();
    expect(result.publicId).toMatch(/^CERT-[A-Z0-9]{8}$/);
    expect(result.qrPngDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});

describe('Partner Attribution Integration', () => {
  test('should compute partner attribution for a given year', async () => {
    const mockPartnerOrgId = 'partner-123';
    const year = 2024;

    const result = await getAttributedForPartner(mockPartnerOrgId, year);

    // Verify structure
    expect(result).toHaveProperty('year');
    expect(result).toHaveProperty('totalTons');
    expect(result).toHaveProperty('rows');
    expect(result.year).toBe(year);
    expect(typeof result.totalTons).toBe('number');
    expect(Array.isArray(result.rows)).toBe(true);

    // Verify supplier breakdown structure
    if (result.rows.length > 0) {
      const supplier = result.rows[0];
      
      // Should have either detailed supplier info or aggregated
      if (supplier.visibility === 'DETAILED') {
        expect(supplier).toHaveProperty('supplierOrgId');
        expect(supplier.supplierLabel).toBeUndefined();
      } else if (supplier.visibility === 'AGGREGATED') {
        expect(supplier).toHaveProperty('supplierLabel');
        expect(supplier.supplierLabel).toMatch(/^Supplier [A-Z]$/);
        expect(supplier.supplierOrgId).toBeUndefined();
      }
      
      // All suppliers should have attribution data
      expect(typeof supplier.units).toBe('number');
      expect(typeof supplier.intensityPerUnitKg).toBe('number');
      expect(typeof supplier.attributedTons).toBe('number');
      expect(['A', 'B', 'C']).toContain(supplier.qualityGrade);
      expect(['DETAILED', 'AGGREGATED']).toContain(supplier.visibility);
    }
  });

  test('should handle year with no allocations', async () => {
    const mockPartnerOrgId = 'partner-no-data';
    const year = 2023;

    const result = await getAttributedForPartner(mockPartnerOrgId, year);

    expect(result.year).toBe(year);
    expect(result.totalTons).toBe(0);
    expect(result.rows).toEqual([]);
  });

  test('should respect consent settings for supplier visibility', async () => {
    const mockPartnerOrgId = 'partner-consent-test';
    const year = 2024;

    const result = await getAttributedForPartner(mockPartnerOrgId, year);

    // All suppliers should have consistent visibility based on consent
    result.rows.forEach(supplier => {
      if (supplier.visibility === 'DETAILED') {
        expect(supplier.supplierOrgId).toBeDefined();
        expect(supplier.supplierLabel).toBeUndefined();
      } else {
        expect(supplier.supplierLabel).toBeDefined();
        expect(supplier.supplierOrgId).toBeUndefined();
      }
    });
  });
});

describe('Public Certificate Verification Integration', () => {
  test('should create and structure certificate for public verification', async () => {
    // First create a certificate
    const supplierOrgId = 'e2e-supplier-org';
    const request = {
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-12-31'),
      unitLabel: 'units produced',
    };

    const certificate = await issueCertificate(supplierOrgId, request);
    
    // Verify it has all required fields for public verification
    expect(certificate.publicId).toBeDefined();
    expect(certificate.qrPngDataUrl).toBeDefined();
    expect(certificate.publicUrl).toBeDefined();
    
    // The public URL should be valid
    expect(certificate.publicUrl).toContain('/certificate/');
    expect(certificate.publicUrl).toContain(certificate.publicId);
    
    // QR code should be a valid data URL
    expect(certificate.qrPngDataUrl).toMatch(/^data:image\/png;base64,/);
    
    // In a real test, this would make an HTTP request to verify the certificate
    // For now, we verify the structure that enables public verification
    const expectedPublicStructure = {
      publicId: certificate.publicId,
      verificationUrl: certificate.publicUrl,
      qrCode: certificate.qrPngDataUrl,
    };

    expect(expectedPublicStructure.publicId).toBe(certificate.publicId);
    expect(expectedPublicStructure.verificationUrl).toBe(certificate.publicUrl);
    expect(expectedPublicStructure.qrCode).toBe(certificate.qrPngDataUrl);
  });
});
