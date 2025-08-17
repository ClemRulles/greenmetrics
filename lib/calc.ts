import { prisma } from './prisma';
import { resolveFactor } from './factors';
import { normalizeUnit } from './units';
import { geographyForReport } from './geo';
import { Decimal } from '@prisma/client/runtime/library';

type Totals = { scope1Kg: number; scope2Kg: number; totalKg: number };
type ActivityKind = 'ELECTRICITY_KWH' | 'FUEL_L' | 'WASTE_TONNES' | 'TRAVEL_KM';

function toNumber(d: Decimal | number | string): number {
  return Number(d instanceof Decimal ? d.toString() : d);
}

// Scope mapping by kind (MVP assumption)
const SCOPE: Record<ActivityKind, 1|2> = {
  ELECTRICITY_KWH: 2,
  FUEL_L: 1,
  WASTE_TONNES: 1,   // placeholder classification
  TRAVEL_KM: 1,      // business car travel → Scope 1 for company-owned; adjust later
};

export async function computeReport(reportId: string, opts?: { method?: string }) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { organization: { select: { countryCode: true } } }
  });
  if (!report) throw new Error('REPORT_NOT_FOUND');

  const geography = geographyForReport(
    { geography: report.geography }, 
    report.organization ?? undefined
  );
  const items = await prisma.activityRecord.findMany({ where: { reportId } });
  const periodDate = report.periodEnd; // pick end date for factor window

  let scope1 = 0, scope2 = 0;
  const tracesToCreate: {
    reportId: string;
    activityRecordId: string;
    factorId: string;
    geographyUsed: string;
    factorVersion: string;
    method: string;
    inputValue: number;
    inputUnit: string;
    resultKgCO2e: number;
    note?: string;
  }[] = [];

  let lastFactorVersion = 'unknown';

  for (const it of items) {
    const expected = normalizeUnit(it.kind as ActivityKind, it.unit);
    const factor = await resolveFactor({ kind: it.kind as ActivityKind, geography, periodDate });
    lastFactorVersion = factor.version || lastFactorVersion;

    const value = toNumber(it.value);
    const factorNum = toNumber(factor.factorKgCO2ePerUnit);
    const resultKg = value * factorNum;

    const scope = SCOPE[it.kind as ActivityKind] || 1;
    if (scope === 1) scope1 += resultKg;
    else scope2 += resultKg;

    tracesToCreate.push({
      reportId,
      activityRecordId: it.id,
      factorId: factor.id,
      geographyUsed: factor.geography,
      factorVersion: factor.version,
      method: (opts?.method ?? 'location-based'),
      inputValue: value,
      inputUnit: expected.unit,
      resultKgCO2e: resultKg,
      note: expected.note,
    });
  }

  // Persist traces atomically
  if (tracesToCreate.length) {
    await prisma.$transaction(
      tracesToCreate.map((t) => prisma.computationTrace.create({ data: t }))
    );
  }

  const engine = (process.env.PDF_ENGINE || 'mock').toLowerCase();

  // Create or update totals snapshot (idempotent)
  await prisma.reportTotalsSnapshot.upsert({
    where: { reportId },
    update: {
      scope1Kg: scope1,
      scope2Kg: scope2,
      totalKg: scope1 + scope2,
      factorsVersion: lastFactorVersion,
      frameworkVersion: report.frameworkVersion,
      engine,
      computedAt: new Date()
    },
    create: {
      reportId,
      scope1Kg: scope1,
      scope2Kg: scope2,
      totalKg: scope1 + scope2,
      factorsVersion: lastFactorVersion,
      frameworkVersion: report.frameworkVersion,
      engine
    }
  });

  const totals: Totals = { scope1Kg: scope1, scope2Kg: scope2, totalKg: scope1 + scope2 };
  return { 
    totals, 
    traceCount: tracesToCreate.length, 
    geography, 
    factorsVersion: lastFactorVersion, 
    snapshotted: true 
  };
}
