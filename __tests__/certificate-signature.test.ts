import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hmacSign, hmacVerify, generatePublicId } from '@/lib/certificates/signature';

describe('Certificate Signature', () => {
  beforeEach(() => {
    // Mock environment variable
    vi.stubEnv('CERT_SIGNING_SECRET', 'test-secret-key-for-signing');
  });

  describe('generatePublicId', () => {
    it('generates valid UUID format', () => {
      const publicId = generatePublicId();
      expect(publicId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('generates unique IDs', () => {
      const id1 = generatePublicId();
      const id2 = generatePublicId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('hmacSign', () => {
    const mockPayload = {
      supplierOrgId: 'supplier-123',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-12-31'),
      scope1Kg: 1000,
      scope2LBKg: 500,
      scope2MBKg: 300,
      intensityPerUnitKg: 1.8,
      unitLabel: 'units produced',
      factorsVersion: 'v1.0',
      frameworkVersion: 'v1.0',
      qualityGrade: 'A'
    };

    it('generates consistent signatures for same payload', () => {
      const signature1 = hmacSign(mockPayload);
      const signature2 = hmacSign(mockPayload);
      expect(signature1).toBe(signature2);
    });

    it('generates different signatures for different payloads', () => {
      const payload1 = { ...mockPayload };
      const payload2 = { ...mockPayload, scope1Kg: 2000 };
      
      const signature1 = hmacSign(payload1);
      const signature2 = hmacSign(payload2);
      expect(signature1).not.toBe(signature2);
    });

    it('generates hex string signature', () => {
      const signature = hmacSign(mockPayload);
      expect(signature).toMatch(/^[0-9a-f]+$/i);
      expect(signature.length).toBe(64); // SHA256 hex digest
    });
  });

  describe('hmacVerify', () => {
    const mockCertificate = {
      supplierOrgId: 'supplier-123',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-12-31'),
      scope1Kg: 1000,
      scope2LBKg: 500,
      scope2MBKg: 300,
      intensityPerUnitKg: 1.8,
      unitLabel: 'units produced',
      factorsVersion: 'v1.0',
      frameworkVersion: 'v1.0',
      qualityGrade: 'A',
      signature: ''
    };

    it('verifies valid signature', () => {
      const payload = {
        supplierOrgId: mockCertificate.supplierOrgId,
        periodStart: mockCertificate.periodStart,
        periodEnd: mockCertificate.periodEnd,
        scope1Kg: mockCertificate.scope1Kg,
        scope2LBKg: mockCertificate.scope2LBKg,
        scope2MBKg: mockCertificate.scope2MBKg,
        intensityPerUnitKg: mockCertificate.intensityPerUnitKg,
        unitLabel: mockCertificate.unitLabel,
        factorsVersion: mockCertificate.factorsVersion,
        frameworkVersion: mockCertificate.frameworkVersion,
        qualityGrade: mockCertificate.qualityGrade
      };
      
      const validSignature = hmacSign(payload);
      const certificateWithSignature = { ...mockCertificate, signature: validSignature };
      
      expect(hmacVerify(certificateWithSignature)).toBe(true);
    });

    it('rejects invalid signature', () => {
      const certificateWithInvalidSignature = { 
        ...mockCertificate, 
        signature: 'invalid-signature'
      };
      
      expect(hmacVerify(certificateWithInvalidSignature)).toBe(false);
    });

    it('rejects tampered data', () => {
      const payload = {
        supplierOrgId: mockCertificate.supplierOrgId,
        periodStart: mockCertificate.periodStart,
        periodEnd: mockCertificate.periodEnd,
        scope1Kg: mockCertificate.scope1Kg,
        scope2LBKg: mockCertificate.scope2LBKg,
        scope2MBKg: mockCertificate.scope2MBKg,
        intensityPerUnitKg: mockCertificate.intensityPerUnitKg,
        unitLabel: mockCertificate.unitLabel,
        factorsVersion: mockCertificate.factorsVersion,
        frameworkVersion: mockCertificate.frameworkVersion,
        qualityGrade: mockCertificate.qualityGrade
      };
      
      const validSignature = hmacSign(payload);
      
      // Tamper with the data but keep original signature
      const tamperedCertificate = { 
        ...mockCertificate, 
        scope1Kg: 9999, // Changed value
        signature: validSignature 
      };
      
      expect(hmacVerify(tamperedCertificate)).toBe(false);
    });

    it('handles Prisma Decimal-like objects', () => {
      const mockDecimal = {
        toString: () => '1000',
        valueOf: () => 1000
      };
      
      const certificateWithDecimals = {
        ...mockCertificate,
        scope1Kg: mockDecimal,
        scope2LBKg: mockDecimal,
        scope2MBKg: mockDecimal,
        intensityPerUnitKg: mockDecimal,
        signature: ''
      };
      
      const payload = {
        supplierOrgId: certificateWithDecimals.supplierOrgId,
        periodStart: certificateWithDecimals.periodStart,
        periodEnd: certificateWithDecimals.periodEnd,
        scope1Kg: Number(certificateWithDecimals.scope1Kg),
        scope2LBKg: Number(certificateWithDecimals.scope2LBKg),
        scope2MBKg: Number(certificateWithDecimals.scope2MBKg),
        intensityPerUnitKg: Number(certificateWithDecimals.intensityPerUnitKg),
        unitLabel: certificateWithDecimals.unitLabel,
        factorsVersion: certificateWithDecimals.factorsVersion,
        frameworkVersion: certificateWithDecimals.frameworkVersion,
        qualityGrade: certificateWithDecimals.qualityGrade
      };
      
      const validSignature = hmacSign(payload);
      certificateWithDecimals.signature = validSignature;
      
      expect(hmacVerify(certificateWithDecimals)).toBe(true);
    });
  });

  describe('round-trip verification', () => {
    it('signs and verifies successfully', () => {
      const payload = {
        supplierOrgId: 'supplier-456',
        periodStart: new Date('2024-06-01'),
        periodEnd: new Date('2024-06-30'),
        scope1Kg: 2000,
        scope2LBKg: 1000,
        scope2MBKg: 600,
        intensityPerUnitKg: 3.6,
        unitLabel: 'widgets',
        factorsVersion: 'v2.0',
        frameworkVersion: 'v2.0',
        qualityGrade: 'B'
      };
      
      const signature = hmacSign(payload);
      const certificate = { ...payload, signature };
      
      expect(hmacVerify(certificate)).toBe(true);
    });
  });
});
