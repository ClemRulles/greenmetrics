export type PlanId = 'FREE' | 'BASIC' | 'PRO';

// Plan catalog with EUR pricing and entitlements
export const PLAN_RULES: Record<PlanId, {
  label: { en: string; fr: string };
  monthlyEUR: number;
  features: string[];
  entitlements: {
    maxReportsPerMonth: number;
    maxSuppliersLinked: number;    // for partners (seat-based)
    exportsPerHour: number;
    targetsEnabled: boolean;
    proofVaultEnabled: boolean;
    apiCallsPerDay: number;
    storageGB: number;
  };
  stripePriceId?: string;
}> = {
  FREE: {
    label: { en: 'Free', fr: 'Gratuit' },
    monthlyEUR: 0,
    features: ['Basic reporting', 'Community support', '3 supplier links'],
    entitlements: {
      maxReportsPerMonth: 2,
      maxSuppliersLinked: 3,
      exportsPerHour: 1,
      targetsEnabled: false,
      proofVaultEnabled: false,
      apiCallsPerDay: 100,
      storageGB: 1,
    },
  },
  BASIC: {
    label: { en: 'Basic', fr: 'Basic' },
    monthlyEUR: 49,
    features: ['PDF exports', 'Email support', '25 supplier links', 'Partner targets'],
    entitlements: {
      maxReportsPerMonth: 20,
      maxSuppliersLinked: 25,
      exportsPerHour: 5,
      targetsEnabled: true,
      proofVaultEnabled: true,
      apiCallsPerDay: 1000,
      storageGB: 10,
    },
    stripePriceId: process.env.STRIPE_PRICE_BASIC,
  },
  PRO: {
    label: { en: 'Pro', fr: 'Pro' },
    monthlyEUR: 99,
    features: ['Unlimited exports', 'Priority support', '200 supplier links', 'Advanced analytics'],
    entitlements: {
      maxReportsPerMonth: 100,
      maxSuppliersLinked: 200,
      exportsPerHour: 20,
      targetsEnabled: true,
      proofVaultEnabled: true,
      apiCallsPerDay: 10000,
      storageGB: 100,
    },
    stripePriceId: process.env.STRIPE_PRICE_PRO,
  },
};

// Get plan by ID with fallback to FREE
export function getPlan(planId: PlanId | string): typeof PLAN_RULES[PlanId] {
  if (planId in PLAN_RULES) {
    return PLAN_RULES[planId as PlanId];
  }
  return PLAN_RULES.FREE;
}

// Get plan ID from Stripe price ID
export function getPlanFromPriceId(priceId: string): PlanId {
  for (const [planId, plan] of Object.entries(PLAN_RULES)) {
    if (plan.stripePriceId === priceId) {
      return planId as PlanId;
    }
  }
  return 'FREE';
}

// Calculate seat-based pricing for partners
export function calculateSeats(activeSuppliers: number, planId: PlanId): number {
  const plan = PLAN_RULES[planId];
  if (planId === 'FREE') return 0;
  
  // Base subscription + additional seats beyond included limit
  const includedSeats = Math.min(activeSuppliers, plan.entitlements.maxSuppliersLinked);
  const additionalSeats = Math.max(0, activeSuppliers - includedSeats);
  
  return 1 + additionalSeats; // Base subscription + extra seats
}

// Billing cycle helpers
export const BILLING_CYCLE = {
  MONTHLY: 'month' as const,
  YEARLY: 'year' as const,
} as const;

export type BillingCycle = typeof BILLING_CYCLE[keyof typeof BILLING_CYCLE];
