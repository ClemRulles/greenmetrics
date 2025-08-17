import { createHmac, timingSafeEqual, randomUUID } from 'crypto';

// Environment variable for certificate signing secret
const CERT_SIGNING_SECRET = process.env.CERT_SIGNING_SECRET || 'dev-cert-secret-change-in-prod';

export type CertificatePayload = {
  supplierOrgId: string;
  periodStart: Date;
  periodEnd: Date;
  scope1Kg: number;
  scope2LBKg: number;
  scope2MBKg: number;
  intensityPerUnitKg: number;
  unitLabel: string;
  factorsVersion: string;
  frameworkVersion: string;
  qualityGrade: string;
};

export function hmacSign(payload: CertificatePayload): string {
  // Create a canonical string representation for signing
  const canonicalData = {
    supplierOrgId: payload.supplierOrgId,
    periodStart: payload.periodStart.toISOString(),
    periodEnd: payload.periodEnd.toISOString(),
    scope1Kg: payload.scope1Kg,
    scope2LBKg: payload.scope2LBKg,
    scope2MBKg: payload.scope2MBKg,
    intensityPerUnitKg: payload.intensityPerUnitKg,
    unitLabel: payload.unitLabel,
    factorsVersion: payload.factorsVersion,
    frameworkVersion: payload.frameworkVersion,
    qualityGrade: payload.qualityGrade
  };

  const canonicalString = JSON.stringify(canonicalData, Object.keys(canonicalData).sort());
  return createHmac('sha256', CERT_SIGNING_SECRET)
    .update(canonicalString)
    .digest('hex');
}

export function hmacVerify(certificate: {
  supplierOrgId: string;
  periodStart: Date;
  periodEnd: Date;
  scope1Kg: any; // Prisma Decimal
  scope2LBKg: any;
  scope2MBKg: any;
  intensityPerUnitKg: any;
  unitLabel: string;
  factorsVersion: string;
  frameworkVersion: string;
  qualityGrade: string;
  signature: string;
}): boolean {
  try {
    const payload: CertificatePayload = {
      supplierOrgId: certificate.supplierOrgId,
      periodStart: certificate.periodStart,
      periodEnd: certificate.periodEnd,
      scope1Kg: Number(certificate.scope1Kg),
      scope2LBKg: Number(certificate.scope2LBKg),
      scope2MBKg: Number(certificate.scope2MBKg),
      intensityPerUnitKg: Number(certificate.intensityPerUnitKg),
      unitLabel: certificate.unitLabel,
      factorsVersion: certificate.factorsVersion,
      frameworkVersion: certificate.frameworkVersion,
      qualityGrade: certificate.qualityGrade
    };

    const expectedSignature = hmacSign(payload);
    
    // Handle different signature lengths safely
    if (expectedSignature.length !== certificate.signature.length) {
      return false;
    }
    
    return timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(certificate.signature, 'hex')
    );
  } catch (error) {
    // Return false for any verification errors (invalid hex, etc.)
    return false;
  }
}

export function generatePublicId(): string {
  // Generate a URL-safe public ID using randomUUID()
  return randomUUID();
}
