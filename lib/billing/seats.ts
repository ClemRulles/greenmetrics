// Peak-of-period seat calculation for partner billing
import { QUOTAS } from './entitlements';

export type SeatCalculation = {
  orgId: string;
  periodKey: string;
  currentSeats: number;
  peakSeats: number;
  billableSeats: number;
};

// Generate period key for monthly billing periods
export function periodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Compute daily seat snapshots for all organizations
export async function computeDailySeats(): Promise<{ processed: number; snapshots: SeatCalculation[] }> {
  // TODO: Replace with actual database queries once schema is migrated
  // This should:
  // 1. Query PartnerSupplierLink.groupBy partnerOrgId where status='ACCEPTED' and suspended=false
  // 2. Upsert UsageSnapshot with current seat count
  // 3. Update peakSeats to MAX(currentSeats, existingPeakSeats) for the period
  
  const today = new Date();
  const period = periodKey(today);
  
  // Mock seat counts for different organizations
  const mockLinksByOrg = [
    { partnerOrgId: 'org-1', _count: { _all: 12 } },
    { partnerOrgId: 'org-2', _count: { _all: 45 } },
    { partnerOrgId: 'org-3', _count: { _all: 2 } },
    { partnerOrgId: 'org-grace', _count: { _all: 15 } },
    { partnerOrgId: 'org-growing', _count: { _all: 28 } }, // Exceeds BASIC limit
  ];
  
  const snapshots: SeatCalculation[] = [];
  
  for (const row of mockLinksByOrg) {
    const currentSeats = row._count._all;
    
    // TODO: Implement actual database upsert logic
    // await prisma.usageSnapshot.upsert({
    //   where: { 
    //     orgId_periodKey: { 
    //       orgId: row.partnerOrgId, 
    //       periodKey: period 
    //     } 
    //   },
    //   update: { 
    //     currentSeats,
    //     peakSeats: { 
    //       set: Math.max(currentSeats, existingSnapshot.peakSeats) 
    //     }
    //   },
    //   create: { 
    //     orgId: row.partnerOrgId, 
    //     periodKey: period, 
    //     currentSeats, 
    //     peakSeats: currentSeats 
    //   },
    // });
    
    // Mock the snapshot result
    const snapshot: SeatCalculation = {
      orgId: row.partnerOrgId,
      periodKey: period,
      currentSeats,
      peakSeats: Math.max(currentSeats, getMockPeakSeats(row.partnerOrgId)),
      billableSeats: calculateBillableSeats(currentSeats, 'BASIC'), // Assume BASIC plan for now
    };
    
    snapshots.push(snapshot);
    console.log(`Seat snapshot for ${row.partnerOrgId}: current=${currentSeats}, peak=${snapshot.peakSeats}`);
  }
  
  return { 
    processed: mockLinksByOrg.length, 
    snapshots 
  };
}

// Get mock peak seats for testing (in real implementation, this comes from database)
function getMockPeakSeats(orgId: string): number {
  const mockPeaks: Record<string, number> = {
    'org-1': 14, // Peak was higher than current
    'org-2': 45, // Peak equals current
    'org-3': 3,  // Peak was higher than current
    'org-grace': 18, // Peak was higher than current
    'org-growing': 32, // Peak was higher than current
  };
  return mockPeaks[orgId] || 0;
}

// Calculate billable seats based on plan limits
export function calculateBillableSeats(seatCount: number, plan: 'FREE' | 'BASIC' | 'PRO'): number {
  if (plan === 'FREE') return 0;
  
  const quotas = QUOTAS[plan];
  const includedSeats = quotas.supplierLinks;
  
  // Base subscription (1 seat) + additional seats beyond plan limit
  const additionalSeats = Math.max(0, seatCount - includedSeats);
  return 1 + additionalSeats;
}

// Get current seat count for an organization
export async function getCurrentSeats(orgId: string): Promise<number> {
  // TODO: Replace with actual database query
  // SELECT COUNT(*) FROM PartnerSupplierLink 
  // WHERE partnerOrgId = ? AND status = 'ACCEPTED' AND suspended = false
  
  const mockCounts: Record<string, number> = {
    'org-1': 12,
    'org-2': 45,
    'org-3': 2,
    'org-grace': 15,
    'org-growing': 28,
  };
  
  return mockCounts[orgId] || 0;
}

// Get peak seats for billing period
export async function getPeakSeats(orgId: string, period?: string): Promise<number> {
  const targetPeriod = period || periodKey(new Date());
  
  // TODO: Replace with actual database query
  // SELECT peakSeats FROM UsageSnapshot 
  // WHERE orgId = ? AND periodKey = ?
  
  const mockPeaks: Record<string, Record<string, number>> = {
    'org-1': { [targetPeriod]: 14 },
    'org-2': { [targetPeriod]: 45 },
    'org-3': { [targetPeriod]: 3 },
    'org-grace': { [targetPeriod]: 18 },
    'org-growing': { [targetPeriod]: 32 },
  };
  
  return mockPeaks[orgId]?.[targetPeriod] || 0;
}

// Validate seat calculations for billing accuracy
export function validateSeatBilling(calculation: SeatCalculation): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (calculation.currentSeats < 0) {
    issues.push('Current seats cannot be negative');
  }
  
  if (calculation.peakSeats < calculation.currentSeats) {
    issues.push('Peak seats cannot be less than current seats');
  }
  
  if (calculation.billableSeats < 0) {
    issues.push('Billable seats cannot be negative');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

// Calculate monthly billing amount based on seats
export function calculateMonthlyBilling(peakSeats: number, plan: 'BASIC' | 'PRO'): number {
  const basePrices = {
    BASIC: 49, // EUR
    PRO: 99,   // EUR
  };
  
  const seatPrices = {
    BASIC: 5,  // EUR per additional seat
    PRO: 8,    // EUR per additional seat
  };
  
  const quotas = QUOTAS[plan];
  const basePrice = basePrices[plan];
  const seatPrice = seatPrices[plan];
  const includedSeats = quotas.supplierLinks;
  
  const additionalSeats = Math.max(0, peakSeats - includedSeats);
  
  return basePrice + (additionalSeats * seatPrice);
}
