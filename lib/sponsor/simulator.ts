export type VolumeTier = { 
  min: number; 
  max: number | null; 
  discount: number; 
};

export const TIERS: VolumeTier[] = [
  { min: 5, max: 19, discount: 0.10 },
  { min: 20, max: 49, discount: 0.20 },
  { min: 50, max: 99, discount: 0.25 },
  { min: 100, max: null, discount: 0.30 },
];

export type CostSimulation = {
  seats: number;
  discount: number;
  monthly: number;
  annual: number;
  tier?: string;
};

export function simulateCost(basicSeats: number, proSeats: number): CostSimulation {
  const BASIC_PRICE = 49;
  const PRO_PRICE = 99;
  
  const base = BASIC_PRICE * basicSeats + PRO_PRICE * proSeats;
  const seats = basicSeats + proSeats;
  
  const tier = TIERS.find(t => seats >= t.min && (t.max === null || seats <= t.max));
  const discount = tier ? tier.discount : 0;
  
  const monthly = Math.round(base * (1 - discount) * 100) / 100;
  const annual = Math.round(monthly * 12 * 100) / 100;
  
  let tierDescription = '';
  if (tier) {
    if (tier.max === null) {
      tierDescription = `${tier.min}+ seats`;
    } else {
      tierDescription = `${tier.min}-${tier.max} seats`;
    }
  }
  
  return { 
    seats, 
    discount, 
    monthly, 
    annual,
    tier: tierDescription
  };
}

export function getTierInfo(seats: number): { discount: number; description: string } {
  const tier = TIERS.find(t => seats >= t.min && (t.max === null || seats <= t.max));
  
  if (!tier) {
    return { discount: 0, description: 'No discount' };
  }
  
  const description = tier.max === null 
    ? `${tier.min}+ seats (${Math.round(tier.discount * 100)}% discount)`
    : `${tier.min}-${tier.max} seats (${Math.round(tier.discount * 100)}% discount)`;
    
  return { discount: tier.discount, description };
}
