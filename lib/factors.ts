import { prisma } from './prisma';

type ActivityKind = 'ELECTRICITY_KWH' | 'FUEL_L' | 'WASTE_TONNES' | 'TRAVEL_KM';

export async function resolveFactor(params: {
  kind: ActivityKind;
  geography?: string;      // e.g., "BE", "FR", default fallback "EU"
  periodDate: Date;        // any date within the reporting period
}) {
  const geo = params.geography || 'EU';
  // Try exact geography first, then EU fallback
  for (const g of [geo, 'EU']) {
    const rows = await prisma.emissionFactor.findMany({
      where: {
        kind: params.kind as 'ELECTRICITY_KWH' | 'FUEL_L' | 'WASTE_TONNES' | 'TRAVEL_KM',
        geography: g,
        validFrom: { lte: params.periodDate },
        OR: [{ validTo: null }, { validTo: { gte: params.periodDate } }],
      },
      orderBy: [{ validFrom: 'desc' }, { version: 'desc' }],
      take: 1,
    });
    if (rows[0]) {
      return rows[0];
    }
  }
  throw new Error(`FACTOR_NOT_FOUND for kind=${params.kind}`);
}
