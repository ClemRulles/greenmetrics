import { Plan } from '@/lib/billing/entitlements';

export interface BillingUIState {
  plan: Plan;
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'unpaid';
  inGracePeriod?: boolean;
  frozenAt?: Date | null;
  gracePeriodEnd?: Date | null;
}

export type BillingStatus = 'ok'|'grace'|'frozen';

export function deriveStatus(isFrozen: boolean, graceUntil: string | null): BillingStatus {
  if (isFrozen) return 'frozen';
  if (graceUntil) return 'grace';
  return 'ok';
}

export function formatPlanName(plan: Plan, locale: 'en' | 'fr'): string {
  const planNames = {
    en: { FREE: 'Free', BASIC: 'Basic', PRO: 'Pro' },
    fr: { FREE: 'Gratuite', BASIC: 'Basic', PRO: 'Pro' }
  };
  return planNames[locale][plan];
}

export function formatSubscriptionStatus(
  status: BillingUIState['subscriptionStatus'], 
  locale: 'en' | 'fr'
): string {
  const statusNames = {
    en: {
      active: 'Active',
      trialing: 'Trial',
      past_due: 'Past due',
      canceled: 'Canceled',
      incomplete: 'Incomplete',
      unpaid: 'Unpaid'
    },
    fr: {
      active: 'Actif',
      trialing: 'Essai',
      past_due: 'En retard',
      canceled: 'Annulé',
      incomplete: 'Incomplet',
      unpaid: 'Impayé'
    }
  };
  return statusNames[locale][status] || status;
}

export function getStatusBadgeColor(status: BillingUIState['subscriptionStatus']): string {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'bg-green-100 text-green-800';
    case 'past_due':
    case 'incomplete':
      return 'bg-yellow-100 text-yellow-800';
    case 'canceled':
    case 'unpaid':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getBillingState(billingData: BillingUIState): 'ok' | 'grace' | 'frozen' {
  if (billingData.frozenAt) return 'frozen';
  if (billingData.inGracePeriod || billingData.gracePeriodEnd) return 'grace';
  return 'ok';
}

export function formatCurrency(amount: number, currency: 'EUR' | 'USD' = 'EUR', locale: 'en' | 'fr' = 'en'): string {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: Date, locale: 'en' | 'fr' = 'en'): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function getUpgradeTarget(currentPlan: Plan): Plan | null {
  switch (currentPlan) {
    case 'FREE':
      return 'BASIC';
    case 'BASIC':
      return 'PRO';
    case 'PRO':
      return null; // Already at top tier
    default:
      return null;
  }
}

export function canDowngrade(currentPlan: Plan): boolean {
  return currentPlan !== 'FREE';
}

// Grace period utilities
export function isInGracePeriod(billingData: BillingUIState): boolean {
  if (!billingData.gracePeriodEnd) return false;
  return new Date() < billingData.gracePeriodEnd;
}

export function getGraceDaysRemaining(gracePeriodEnd: Date | null): number {
  if (!gracePeriodEnd) return 0;
  const now = new Date();
  const diffMs = gracePeriodEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
