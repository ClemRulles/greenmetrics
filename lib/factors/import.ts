import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/privacy/audit';
import { ActivityKind } from '@prisma/client';
import { z } from 'zod';
import { FactorImportPayload } from '@/lib/validators/factors';

type ImportPayload = z.infer<typeof FactorImportPayload>;

export async function importFactors(payload: ImportPayload, userId?: string) {
  const { source, version, factors } = payload;
  
  // Create source record
  // TODO: Uncomment after migration
  // const src = await prisma.emissionFactorSource.create({ 
  //   data: source 
  // });
  
  // Create import job
  // TODO: Uncomment after migration
  // const job = await prisma.factorImportJob.create({ 
  //   data: { 
  //     sourceId: src.id, 
  //     version, 
  //     status: 'PENDING' 
  //   } 
  // });

  let ok = 0, bad = 0;
  
  for (const f of factors) {
    try {
      await prisma.emissionFactor.create({
        data: {
          kind: f.kind as ActivityKind,
          unit: f.unit,
          geography: (f.geography || 'EU').toUpperCase(),
          factorKgCO2ePerUnit: f.factorKgCO2ePerUnit,
          source: source.name,
          validFrom: new Date(f.validFrom),
          validTo: f.validTo ? new Date(f.validTo) : null,
          version
        }
      });
      ok++;
    } catch (error) {
      console.error('Failed to import factor:', error);
      bad++;
    }
  }
  
  // Update job status
  // TODO: Uncomment after migration
  // await prisma.factorImportJob.update({
  //   where: { id: job.id },
  //   data: { 
  //     status: bad > 0 ? 'COMPLETED' : 'COMPLETED', 
  //     inserted: ok, 
  //     failed: bad, 
  //     completedAt: new Date() 
  //   }
  // });

  // Audit log
  await writeAuditLog({ 
    userId, 
    action: 'FACTORS_IMPORT', 
    metadata: { 
      version, 
      ok, 
      bad, 
      source: source.name 
    } 
  });
  
  return { 
    inserted: ok, 
    failed: bad, 
    version, 
    source: source.name 
  };
}
