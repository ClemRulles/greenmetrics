// import { prisma } from '@/lib/prisma';
import { hmacSign, generatePublicId, type CertificatePayload } from './signature';
import QRCode from 'qrcode';

export type CertificateRequest = {
  periodStart: Date;
  periodEnd: Date;
  unitLabel: string;
};

export type CertificateIssueResult = {
  id: string;
  publicId: string;
  publicUrl: string;
  qrPngDataUrl: string;
};

export type ComputedTotals = {
  scope1Kg: number;
  scope2LBKg: number;
  scope2MBKg: number;
  factorsVersion: string;
  frameworkVersion: string;
  invoiceCoverageMonths: number;
};

export type ProductionStats = {
  units: number;
  year: number;
};

// Production implementation once database is available
export async function issueCertificate(
  supplierOrgId: string, 
  request: CertificateRequest
): Promise<CertificateIssueResult> {
  // For now, use mock computation - will be replaced with actual compute logic
  // const totals = await computeForPeriod(supplierOrgId, { start: request.periodStart, end: request.periodEnd });
  const totals: ComputedTotals = {
    scope1Kg: 1500,
    scope2LBKg: 800,
    scope2MBKg: 600,
    factorsVersion: 'v2.1',
    frameworkVersion: 'v2.0',
    invoiceCoverageMonths: 11
  };

  // Mock production stats - will be replaced with Prisma query
  // const production = await prisma.productionStat.findFirst({
  //   where: { organizationId: supplierOrgId, year: request.periodEnd.getUTCFullYear() }
  // });
  const production: ProductionStats = {
    units: 1000,
    year: request.periodEnd.getUTCFullYear()
  };

  if (!production?.units) {
    throw new Error('MISSING_PRODUCTION_UNITS');
  }

  const intensityPerUnitKg = Number((totals.scope1Kg + totals.scope2MBKg) / Number(production.units));
  const qualityGrade = gradeFromCoverage(totals.invoiceCoverageMonths, !!production.units);
  
  const payload: CertificatePayload = {
    supplierOrgId,
    periodStart: request.periodStart,
    periodEnd: request.periodEnd,
    scope1Kg: totals.scope1Kg,
    scope2LBKg: totals.scope2LBKg,
    scope2MBKg: totals.scope2MBKg,
    intensityPerUnitKg,
    unitLabel: request.unitLabel,
    factorsVersion: totals.factorsVersion,
    frameworkVersion: totals.frameworkVersion,
    qualityGrade
  };
  
  const signature = hmacSign(payload);
  const publicId = generatePublicId();

  // Mock certificate creation - will be replaced with Prisma create
  // const cert = await prisma.certificate.create({
  //   data: { publicId, ...payload, signature }
  // });
  const certificateId = `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const publicUrl = `${process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'http://localhost:3000'}/certificate/${publicId}`;
  const qrPngDataUrl = await QRCode.toDataURL(publicUrl, { 
    margin: 1,
    width: 200,
    errorCorrectionLevel: 'M'
  });

  return {
    id: certificateId,
    publicId,
    publicUrl,
    qrPngDataUrl
  };
}

export function gradeFromCoverage(months: number, hasProduction: boolean): 'A' | 'B' | 'C' {
  if (hasProduction && months >= 10) return 'A';
  if (hasProduction && months >= 6) return 'B';
  return 'C';
}

async function generateQRCode(url: string): Promise<string> {
  // Simple QR code placeholder - in production, you'd use a QR library like 'qrcode'
  // For now, return a data URL that represents a QR code
  const qrSize = 200;
  const canvas = `<svg width="${qrSize}" height="${qrSize}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    <rect x="20" y="20" width="20" height="20" fill="black"/>
    <rect x="60" y="20" width="20" height="20" fill="black"/>
    <rect x="100" y="20" width="20" height="20" fill="black"/>
    <rect x="140" y="20" width="20" height="20" fill="black"/>
    <text x="100" y="110" text-anchor="middle" font-family="Arial" font-size="8" fill="black">QR: ${url.slice(-8)}</text>
    <rect x="20" y="160" width="160" height="20" fill="black"/>
  </svg>`;
  
  // Convert SVG to base64 data URL
  const base64 = Buffer.from(canvas).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Future implementation once database is set up:
/*
export async function issueCertificate(supplierOrgId: string, request: CertificateRequest): Promise<CertificateIssueResult> {
  const totals = await computeSupplierTotals(supplierOrgId, {
    start: request.periodStart,
    end: request.periodEnd
  });
  
  const production = await prisma.productionStat.findFirst({
    where: {
      organizationId: supplierOrgId,
      year: request.periodEnd.getUTCFullYear()
    }
  });
  
  if (!production?.units) {
    throw new Error('MISSING_PRODUCTION_UNITS');
  }

  const intensityPerUnitKg = Number((totals.scope1Kg + totals.scope2MBKg) / Number(production.units));
  const qualityGrade = gradeFromCoverage(totals.invoiceCoverageMonths, !!production.units);
  
  const payload: CertificatePayload = {
    supplierOrgId,
    periodStart: request.periodStart,
    periodEnd: request.periodEnd,
    scope1Kg: totals.scope1Kg,
    scope2LBKg: totals.scope2LBKg,
    scope2MBKg: totals.scope2MBKg,
    intensityPerUnitKg,
    unitLabel: request.unitLabel,
    factorsVersion: totals.factorsVersion,
    frameworkVersion: totals.frameworkVersion,
    qualityGrade
  };
  
  const signature = hmacSign(payload);
  const publicId = generatePublicId();

  const cert = await prisma.certificate.create({
    data: {
      publicId,
      ...payload,
      signature
    }
  });

  const publicUrl = `${process.env.NEXTAUTH_URL}/certificate/${publicId}`;
  const qrPngDataUrl = await generateQRCode(publicUrl);

  return {
    id: cert.id,
    publicId: cert.publicId,
    publicUrl,
    qrPngDataUrl
  };
}
*/
