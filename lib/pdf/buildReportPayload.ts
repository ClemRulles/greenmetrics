import { prisma } from '@/lib/prisma';
import { computeReport } from '@/lib/calc';
import { getEvidenceSummary, type EvidenceSummary } from '@/lib/proofs/summary';

export type ReportPayload = {
  report: {
    id: string;
    name: string;
    framework: string;
    frameworkVersion: string;
    language: 'en'|'fr';
    periodStart: string;
    periodEnd: string;
  };
  organization: { name: string };
  activities: Array<{ kind: string; unit: string; value: number; note?: string }>;
  totals: { scope1Kg: number; scope2Kg: number; totalKg: number };
  traceCount: number;
  factorsVersion: string; // best-effort (latest version used)
  evidenceSummary: EvidenceSummary; // privacy-first evidence summary
  certificate?: {
    publicId: string;
    verificationUrl: string;
    qrCode: string;
    issuedAt: string;
  };
};

export async function buildReportPayload(reportId: string): Promise<ReportPayload> {
  const r = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true, name: true, framework: true, frameworkVersion: true, language: true,
      periodStart: true, periodEnd: true, organizationId: true
    }
  });
  if (!r) throw new Error('REPORT_NOT_FOUND');

  const org = await prisma.organization.findUnique({
    where: { id: r.organizationId },
    select: { name: true }
  });

  const acts = await prisma.activityRecord.findMany({
    where: { reportId },
    orderBy: { createdAt: 'asc' },
    select: { kind: true, unit: true, value: true, note: true }
  });

  // compute (writes traces)
  const { totals, traceCount } = await computeReport(reportId);

  // Best-effort factor version: take most recent trace's version (if any)
  const latestTrace = await prisma.computationTrace.findFirst({
    where: { reportId },
    orderBy: [{ createdAt: 'desc' }]
  });

  // Check for issued certificate (updated with new Prisma types)
  const certificate = await prisma.certificate.findFirst({
    where: { reportId },
    select: { publicId: true, qrCode: true, issuedAt: true }
  });

  // Get evidence summary for the report period
  const reportYear = r.periodStart.getFullYear();
  const evidenceSummary = await getEvidenceSummary(r.organizationId, reportYear);

  let certificateData;
  if (certificate) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    certificateData = {
      publicId: certificate.publicId,
      verificationUrl: `${baseUrl}/certificate/${certificate.publicId}`,
      qrCode: certificate.qrCode,
      issuedAt: certificate.issuedAt.toISOString(),
    };
  }

  return {
    report: {
      id: r.id,
      name: r.name,
      framework: r.framework,
      frameworkVersion: r.frameworkVersion,
      language: (r.language as 'en'|'fr'),
      periodStart: r.periodStart.toISOString().slice(0,10),
      periodEnd: r.periodEnd.toISOString().slice(0,10),
    },
    organization: { name: org?.name ?? 'Unknown org' },
    activities: acts.map(a => ({ kind: a.kind, unit: a.unit, value: Number(a.value), note: a.note || undefined })),
    totals,
    traceCount,
    factorsVersion: latestTrace?.factorVersion ?? 'unknown',
    evidenceSummary,
    certificate: certificateData,
  };
}
