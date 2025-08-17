import { PLAN_RULES, type PlanId, getPlan } from './plans';

export type Plan = 'FREE' | 'BASIC' | 'PRO';
export type EntitlementType = 
  | 'REPORT' 
  | 'EXPORT' 
  | 'LINK_SUPPLIER' 
  | 'TARGETS' 
  | 'PROOF_VAULT'
  | 'API_CALL';

// Optimal plan quotas with clear progression
export const QUOTAS = {
  FREE: { 
    reportsPerMonth: 2, 
    exportsPerHour: 1, 
    apiCallsPerDay: 50, 
    supplierLinks: 3,
    storageGB: 1,
    targetsEnabled: false,
    proofVaultEnabled: false,
  },
  BASIC: { 
    reportsPerMonth: 20, 
    exportsPerHour: 5, 
    apiCallsPerDay: 500, 
    supplierLinks: 25,
    storageGB: 10,
    targetsEnabled: true,
    proofVaultEnabled: true,
  },
  PRO: { 
    reportsPerMonth: 100, 
    exportsPerHour: 20, 
    apiCallsPerDay: 5000, 
    supplierLinks: 200,
    storageGB: 100,
    targetsEnabled: true,
    proofVaultEnabled: true,
  },
} as const;

export type OrgBillingState = {
  plan: Plan;
  activeSuppliers: number; // seats for partner orgs
  reportsThisMonth: number;
  exportsThisHour: number;
  apiCallsToday: number;
  storageUsedGB: number;
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'trialing';
  inGracePeriod: boolean;
  gracePeriodEnd?: Date;
  frozenAt?: Date;
  currentPeriodEnd?: Date;
  customerId?: string;
  subscriptionId?: string;
};

export async function getOrgBillingState(orgId: string): Promise<OrgBillingState> {
  // TODO: Replace with actual database queries once schema is migrated
  // This should query BillingCustomer -> Subscription and current UsageSnapshot
  
  // Simulate database lookup with realistic test data
  const mockData: Record<string, Partial<OrgBillingState>> = {
    'org-1': { 
      plan: 'BASIC', 
      activeSuppliers: 12, 
      reportsThisMonth: 5,
      exportsThisHour: 2,
      apiCallsToday: 150,
      storageUsedGB: 3.2,
      subscriptionStatus: 'active',
      inGracePeriod: false,
    },
    'org-2': { 
      plan: 'PRO', 
      activeSuppliers: 45, 
      reportsThisMonth: 15,
      exportsThisHour: 8,
      apiCallsToday: 1200,
      storageUsedGB: 25.7,
      subscriptionStatus: 'active',
      inGracePeriod: false,
    },
    'org-3': { 
      plan: 'FREE', 
      activeSuppliers: 2, 
      reportsThisMonth: 1,
      exportsThisHour: 0,
      apiCallsToday: 15,
      storageUsedGB: 0.3,
      subscriptionStatus: 'canceled',
      inGracePeriod: false,
    },
    'org-grace': {
      plan: 'BASIC',
      activeSuppliers: 15,
      reportsThisMonth: 8,
      exportsThisHour: 3,
      apiCallsToday: 200,
      storageUsedGB: 5.1,
      subscriptionStatus: 'past_due',
      inGracePeriod: true,
      gracePeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days left
    },
  };
  
  const orgData = mockData[orgId] || {};
  
  return {
    plan: orgData.plan || 'FREE',
    activeSuppliers: orgData.activeSuppliers || 0,
    reportsThisMonth: orgData.reportsThisMonth || 0,
    exportsThisHour: orgData.exportsThisHour || 0,
    apiCallsToday: orgData.apiCallsToday || 0,
    storageUsedGB: orgData.storageUsedGB || 0,
    subscriptionStatus: orgData.subscriptionStatus || 'canceled',
    inGracePeriod: orgData.inGracePeriod || false,
    gracePeriodEnd: orgData.gracePeriodEnd,
    frozenAt: orgData.frozenAt,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  };
}

// Enhanced entitlement guard with grace period logic
export async function requireEntitlement(
  orgId: string, 
  entitlement: EntitlementType,
  options?: { increment?: boolean }
): Promise<void> {
  const billingState = await getOrgBillingState(orgId);
  const quotas = QUOTAS[billingState.plan];
  
  // Check if features are frozen due to payment failure
  if (billingState.frozenAt && billingState.plan !== 'FREE') {
    throw new Error('FEATURES_FROZEN_PAYMENT_FAILURE');
  }
  
  // Grace period restrictions (reduced functionality)
  if (billingState.inGracePeriod) {
    switch (entitlement) {
      case 'EXPORT':
        if (billingState.exportsThisHour >= 1) { // Reduced to 1 export/hour in grace
          throw new Error('GRACE_LIMIT_EXPORT_EXCEEDED');
        }
        break;
      case 'API_CALL':
        if (billingState.apiCallsToday >= 100) { // Reduced to 100 API calls/day in grace
          throw new Error('GRACE_LIMIT_API_EXCEEDED');
        }
        break;
    }
  }
  
  // Check subscription status for paid features
  if (billingState.plan !== 'FREE' && !['active', 'trialing'].includes(billingState.subscriptionStatus)) {
    if (!billingState.inGracePeriod) {
      throw new Error('SUBSCRIPTION_INACTIVE');
    }
  }
  
  // Check specific entitlements
  switch (entitlement) {
    case 'TARGETS':
      if (!quotas.targetsEnabled) {
        throw new Error('ENTITLEMENT_TARGETS_DISABLED');
      }
      break;
      
    case 'PROOF_VAULT':
      if (!quotas.proofVaultEnabled) {
        throw new Error('ENTITLEMENT_PROOF_VAULT_DISABLED');
      }
      break;
      
    case 'REPORT':
      if (billingState.reportsThisMonth >= quotas.reportsPerMonth) {
        throw new Error('ENTITLEMENT_REPORT_LIMIT_EXCEEDED');
      }
      break;
      
    case 'LINK_SUPPLIER':
      if (billingState.activeSuppliers >= quotas.supplierLinks) {
        throw new Error('ENTITLEMENT_SUPPLIER_LIMIT_EXCEEDED');
      }
      break;
      
    case 'EXPORT':
      if (billingState.exportsThisHour >= quotas.exportsPerHour) {
        throw new Error('ENTITLEMENT_EXPORT_LIMIT_EXCEEDED');
      }
      break;
      
    case 'API_CALL':
      if (billingState.apiCallsToday >= quotas.apiCallsPerDay) {
        throw new Error('ENTITLEMENT_API_LIMIT_EXCEEDED');
      }
      break;
      
    default:
      throw new Error('UNKNOWN_ENTITLEMENT_TYPE');
  }
  
  // TODO: If options.increment is true, increment usage counters in database
  if (options?.increment) {
    console.log(`Incrementing usage for ${entitlement} in org ${orgId}`);
  }
}

export async function getUsageStats(orgId: string) {
  const billingState = await getOrgBillingState(orgId);
  const quotas = QUOTAS[billingState.plan];
  
  return {
    plan: billingState.plan,
    subscriptionStatus: billingState.subscriptionStatus,
    inGracePeriod: billingState.inGracePeriod,
    gracePeriodEnd: billingState.gracePeriodEnd,
    frozenAt: billingState.frozenAt,
    currentPeriodEnd: billingState.currentPeriodEnd,
    usage: {
      reports: {
        used: billingState.reportsThisMonth,
        limit: quotas.reportsPerMonth,
        percentage: Math.round((billingState.reportsThisMonth / quotas.reportsPerMonth) * 100),
      },
      suppliers: {
        used: billingState.activeSuppliers,
        limit: quotas.supplierLinks,
        percentage: Math.round((billingState.activeSuppliers / quotas.supplierLinks) * 100),
      },
      exports: {
        used: billingState.exportsThisHour,
        limit: billingState.inGracePeriod ? 1 : quotas.exportsPerHour, // Reduced in grace
        percentage: Math.round((billingState.exportsThisHour / (billingState.inGracePeriod ? 1 : quotas.exportsPerHour)) * 100),
      },
      apiCalls: {
        used: billingState.apiCallsToday,
        limit: billingState.inGracePeriod ? 100 : quotas.apiCallsPerDay, // Reduced in grace
        percentage: Math.round((billingState.apiCallsToday / (billingState.inGracePeriod ? 100 : quotas.apiCallsPerDay)) * 100),
      },
      storage: {
        used: billingState.storageUsedGB,
        limit: quotas.storageGB,
        percentage: Math.round((billingState.storageUsedGB / quotas.storageGB) * 100),
      },
    },
    features: {
      targetsEnabled: quotas.targetsEnabled,
      proofVaultEnabled: quotas.proofVaultEnabled,
    },
    limits: {
      canUpgrade: billingState.plan !== 'PRO',
      canDowngrade: canDowngrade(billingState.plan, billingState),
      requiresPayment: billingState.subscriptionStatus === 'past_due',
    },
  };
}

// Check if organization can downgrade without exceeding new plan limits
function canDowngrade(currentPlan: Plan, state: OrgBillingState): boolean {
  if (currentPlan === 'FREE') return false;
  
  const targetPlan = currentPlan === 'PRO' ? 'BASIC' : 'FREE';
  const targetQuotas = QUOTAS[targetPlan];
  
  return (
    state.activeSuppliers <= targetQuotas.supplierLinks &&
    state.reportsThisMonth <= targetQuotas.reportsPerMonth &&
    state.storageUsedGB <= targetQuotas.storageGB
  );
}

export function isEntitlementEnabled(planId: Plan, entitlement: EntitlementType): boolean {
  const quotas = QUOTAS[planId];
  
  switch (entitlement) {
    case 'TARGETS':
      return quotas.targetsEnabled;
    case 'PROOF_VAULT':
      return quotas.proofVaultEnabled;
    case 'REPORT':
    case 'EXPORT':
    case 'LINK_SUPPLIER':
    case 'API_CALL':
      return true; // These are always enabled, just limited by usage
    default:
      return false;
  }
}

// Calculate active suppliers for seat-based billing (Partners)
export async function calculateActiveSuppliers(orgId: string, period?: { start: Date; end: Date }): Promise<number> {
  // TODO: Replace with actual database query to PartnerSupplierLink
  // Count links with status 'ACCEPTED' and not suspended in the billing period
  
  const now = new Date();
  const defaultPeriod = {
    start: new Date(now.getFullYear(), now.getMonth(), 1), // First day of current month
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0), // Last day of current month
  };
  
  const queryPeriod = period || defaultPeriod;
  
  // Placeholder: return mock data based on orgId
  const mockCounts: Record<string, number> = {
    'org-1': 12,
    'org-2': 45,
    'org-3': 2,
    'org-grace': 15,
  };
  
  return mockCounts[orgId] || 0;
}

// New functions for handling subscription lifecycle events

const PLAN_LIMITS: Record<Plan, { reports:number; storageGb:number; apiPerDay:number; exportPerHour:number }> = {
  FREE:  { reports: 50,   storageGb: 1,   apiPerDay: 100,   exportPerHour: 1 },
  BASIC: { reports: 500,  storageGb: 10,  apiPerDay: 1000,  exportPerHour: 5 },
  PRO:   { reports: 99999,storageGb: 100, apiPerDay: 10000, exportPerHour: 20 },
};

export async function applyPlanEntitlements(orgId: string, plan: Plan) {
  // In a real implementation, this would update the organization's entitlements
  // For now, we'll log the operation since the schema uses a different entitlement model
  console.log(`Applying ${plan} plan entitlements for organization ${orgId}`);
  
  // TODO: Implement actual entitlement update logic based on subscription
  // This would involve updating the Entitlement records linked to the subscription
}

export async function applyGraceEntitlements(orgId: string, plan: Plan, until: Date) {
  // In grace period, apply reduced limits (50% of plan limits)
  console.log(`Applying grace period entitlements for organization ${orgId} until ${until.toISOString()}`);
  
  // TODO: Implement grace period logic
  // This would reduce the plan limits and set the grace period end date
}

export async function freezeEntitlements(orgId: string) {
  // Freeze all entitlements (set to minimal/zero limits)
  console.log(`Freezing entitlements for organization ${orgId}`);
  
  // TODO: Implement freezing logic
  // This would set all usage limits to zero and mark the subscription as frozen
}
