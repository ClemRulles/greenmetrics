// Billing types for API endpoints
export interface BillingStatus {
  plan: string;
  status: 'active' | 'inactive' | 'trial';
  billingPeriodEnd: string;
  customerId?: string;
  subscriptionId?: string;
}

export interface BillingEntitlements {
  reports: number;
  teamSeats: number;
  features: string[];
  storage: number;
  apiCalls: number;
}

export interface BillingUsage {
  reportsUsed: number;
  seatsUsed: number;
  storageUsed: number;
  apiCallsUsed: number;
  period: string;
  billingCycle: 'monthly' | 'yearly';
}

export interface UiEntitlements {
  reports: number;
  teamSeats: number;
  features: string[];
}

export interface UiUsage {
  reportsUsed: number;
  seatsUsed: number;
  period: string;
}
