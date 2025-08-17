// import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/privacy/audit';

export async function upsertOrgOverride(params: {
  orgId: string; 
  kind: string; 
  unit: string; 
  geography?: string | null;
  validFrom: Date; 
  validTo?: Date | null; 
  factorKgCO2ePerUnit: number; 
  version: string; 
  reason?: string; 
  userId?: string;
}) {
  // TODO: Uncomment after migration
  // const rec = await prisma.emissionFactorOverride.create({
  //   data: {
  //     organizationId: params.orgId,
  //     kind: params.kind,
  //     unit: params.unit,
  //     geography: params.geography?.toUpperCase() || null,
  //     validFrom: params.validFrom,
  //     validTo: params.validTo || null,
  //     factorKgCO2ePerUnit: params.factorKgCO2ePerUnit,
  //     version: params.version,
  //     reason: params.reason || null
  //   }
  // });

  const rec = { 
    id: 'mock-override-id',
    kind: params.kind,
    version: params.version
  };

  await writeAuditLog({ 
    userId: params.userId, 
    orgId: params.orgId, 
    action: 'FACTOR_OVERRIDE_CREATE', 
    targetId: rec.id, 
    metadata: { 
      kind: rec.kind, 
      version: rec.version 
    } 
  });

  return rec;
}
