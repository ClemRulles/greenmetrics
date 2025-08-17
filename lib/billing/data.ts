import { prisma } from '@/lib/prisma';

/** Returned by UI — keep fields minimal and stable for SSR */
export type UiEntitlements = {
  plan: 'FREE'|'BASIC'|'PRO';
  isFrozen: boolean;
  graceUntil: string | null;   // ISO
};

export type UiUsage = {
  reports: { used: number; max: number };
  exports: { used: number; max: number };
  api:     { used: number; max: number };
  storage: { used: number; max: number };
};

export async function loadEntitlementsForOrg(orgId: string): Promise<UiEntitlements> {
  // Load billing customer and subscription for the organization
  const billingCustomer = await prisma.billingCustomer.findUnique({
    where: { organizationId: orgId },
    include: {
      subscriptions: {
        where: { status: { not: 'CANCELED' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { 
          planType: true, 
          inGracePeriod: true, 
          gracePeriodEnd: true, 
          frozenAt: true 
        }
      }
    }
  });

  const subscription = billingCustomer?.subscriptions[0];

  // Fallbacks so UI never crashes
  return {
    plan: (subscription?.planType as UiEntitlements['plan']) ?? 'FREE',
    isFrozen: !!subscription?.frozenAt,
    graceUntil: subscription?.gracePeriodEnd?.toISOString() ?? null,
  };
}

export async function loadUsageForOrg(orgId: string): Promise<UiUsage> {
  // Get the billing customer for this org
  const billingCustomer = await prisma.billingCustomer.findUnique({
    where: { organizationId: orgId },
    select: { id: true }
  });

  if (!billingCustomer) {
    // No billing customer yet, return defaults
    return {
      reports: { used: 0, max: 50 },
      exports: { used: 0, max: 1 },
      api:     { used: 0, max: 100 },
      storage: { used: 0, max: 1 },
    };
  }

  // Get latest usage snapshot
  const snap = await prisma.usageSnapshot.findFirst({
    where: { customerId: billingCustomer.id },
    orderBy: { snapshotAt: 'desc' },
    select: { 
      reportsGenerated: true, 
      exportsRequested: true, 
      apiCalls: true, 
      storageUsedBytes: true 
    }
  });

  // Convert storage from bytes to GB
  const storageGb = snap ? Number(snap.storageUsedBytes) / (1024 * 1024 * 1024) : 0;

  return {
    reports: { used: snap?.reportsGenerated ?? 0,  max: 50 },
    exports: { used: snap?.exportsRequested ?? 0,  max: 1 },
    api:     { used: snap?.apiCalls ?? 0,          max: 100 },
    storage: { used: Math.round(storageGb * 100) / 100, max: 1 }, // Round to 2 decimals
  };
}
