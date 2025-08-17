// Edge-compatible certificate verification
// Uses Web Crypto API instead of Node.js crypto

const CERT_SIGNING_SECRET = process.env.CERT_SIGNING_SECRET || 'dev-cert-secret-change-in-prod';

export async function hmacVerifyEdge(certificate: {
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
}): Promise<boolean> {
  try {
    const payload = {
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
    
    // Convert to ArrayBuffer
    const encoder = new TextEncoder();
    const secretBuffer = encoder.encode(CERT_SIGNING_SECRET);
    const dataBuffer = encoder.encode(canonicalString);

    // Import the secret as a key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the data
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, dataBuffer);
    
    // Convert to hex
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Handle different signature lengths safely
    if (expectedSignature.length !== certificate.signature.length) {
      return false;
    }
    
    // Timing-safe comparison
    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= expectedSignature.charCodeAt(i) ^ certificate.signature.charCodeAt(i);
    }

    return result === 0;
  } catch {
    // Return false for any verification errors
    return false;
  }
}
