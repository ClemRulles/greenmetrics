import { prisma } from '@/lib/prisma';
import { ActivityKind } from '@prisma/client';

export async function resolveWithOverrides(args: {
  orgId?: string;
  kind: string;
  date: Date;
  fallbackGeo?: string; // if no org country is available
}) {
  const date = args.date;
  const org = args.orgId ? await prisma.organization.findUnique({ 
    where: { id: args.orgId }, 
    select: { countryCode: true } 
  }) : null;

  // 1) org override window
  if (args.orgId) {
    // TODO: Uncomment after migration
    // const ovr = await prisma.emissionFactorOverride.findFirst({
    //   where: {
    //     organizationId: args.orgId,
    //     kind: args.kind,
    //     OR: [
    //       { validTo: null, validFrom: { lte: date } }, 
    //       { validFrom: { lte: date }, validTo: { gte: date } }
    //     ]
    //   },
    //   orderBy: { createdAt: 'desc' }
    // });
    
    // if (ovr) {
    //   return {
    //     geography: ovr.geography || org?.countryCode || args.fallbackGeo || 'EU',
    //     factorKgCO2ePerUnit: Number(ovr.factorKgCO2ePerUnit),
    //     version: ovr.version,
    //     provenance: 'ORG_OVERRIDE'
    //   };
    // }
  }

  // 2) country
  const geo = (org?.countryCode || args.fallbackGeo || 'EU').toUpperCase();
  const country = await prisma.emissionFactor.findFirst({
    where: { 
      kind: args.kind as ActivityKind, 
      geography: geo, 
      validFrom: { lte: date }, 
      OR: [{ validTo: null }, { validTo: { gte: date } }] 
    },
    orderBy: [{ validFrom: 'desc' }, { version: 'desc' }]
  });
  
  if (country) {
    return { 
      geography: country.geography, 
      factorKgCO2ePerUnit: Number(country.factorKgCO2ePerUnit), 
      version: country.version, 
      provenance: 'COUNTRY' 
    };
  }

  // 3) EU fallback
  const eu = await prisma.emissionFactor.findFirst({
    where: { 
      kind: args.kind as ActivityKind, 
      geography: 'EU', 
      validFrom: { lte: date }, 
      OR: [{ validTo: null }, { validTo: { gte: date } }] 
    },
    orderBy: [{ validFrom: 'desc' }, { version: 'desc' }]
  });
  
  if (eu) {
    return { 
      geography: eu.geography, 
      factorKgCO2ePerUnit: Number(eu.factorKgCO2ePerUnit), 
      version: eu.version, 
      provenance: 'EU' 
    };
  }

  throw new Error('FACTOR_NOT_FOUND');
}
