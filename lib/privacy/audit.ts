import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function writeAuditLog(params: {
  userId?: string | null;
  orgId?: string | null;
  action: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      orgId: params.orgId ?? null,
      action: params.action,
      targetId: params.targetId ?? null,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      requestId: params.requestId ?? null,
    },
  });
}
