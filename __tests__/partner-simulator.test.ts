import { describe, it, expect } from 'vitest';
import { simulateCost, getTierInfo, TIERS } from '@/lib/partner/simulator';

describe('Partner Cost Simulator', () => {
  it('should calculate basic costs correctly', () => {
    const result = simulateCost(10, 0); // 10 basic seats, 0 pro
    expect(result.seats).toBe(10);
    expect(result.discount).toBe(0.10); // 5-19 seats tier
    expect(result.monthly).toBe(441); // 490 * 0.9
    expect(result.annual).toBe(5292); // 441 * 12
  });

  it('should calculate pro seat costs correctly', () => {
    const result = simulateCost(0, 5); // 0 basic, 5 pro seats
    expect(result.seats).toBe(5);
    expect(result.discount).toBe(0.10); // 5-19 seats tier
    expect(result.monthly).toBe(445.5); // 495 * 0.9
    expect(result.annual).toBe(5346); // 445.5 * 12
  });

  it('should calculate mixed seat costs correctly', () => {
    const result = simulateCost(10, 5); // 10 basic + 5 pro = 15 seats
    expect(result.seats).toBe(15);
    expect(result.discount).toBe(0.10); // 5-19 seats tier
    const expectedBase = 10 * 49 + 5 * 99; // 490 + 495 = 985
    const expectedMonthly = Math.round(expectedBase * 0.9 * 100) / 100;
    expect(result.monthly).toBe(expectedMonthly);
  });

  it('should apply correct tier discounts', () => {
    // Test each tier
    const tier1 = simulateCost(10, 0); // 10 seats = 5-19 tier (10%)
    expect(tier1.discount).toBe(0.10);

    const tier2 = simulateCost(25, 0); // 25 seats = 20-49 tier (20%)
    expect(tier2.discount).toBe(0.20);

    const tier3 = simulateCost(60, 0); // 60 seats = 50-99 tier (25%)
    expect(tier3.discount).toBe(0.25);

    const tier4 = simulateCost(150, 0); // 150 seats = 100+ tier (30%)
    expect(tier4.discount).toBe(0.30);
  });

  it('should handle no discount for small volumes', () => {
    const result = simulateCost(2, 0); // 2 seats = below minimum tier
    expect(result.discount).toBe(0);
    expect(result.monthly).toBe(98); // 2 * 49, no discount
  });

  it('should format tier descriptions correctly', () => {
    const tier1Info = getTierInfo(10);
    expect(tier1Info.description).toBe('5-19 seats (10% discount)');

    const tier4Info = getTierInfo(150);
    expect(tier4Info.description).toBe('100+ seats (30% discount)');

    const noTierInfo = getTierInfo(3);
    expect(noTierInfo.description).toBe('No discount');
  });

  it('should handle edge cases for tier boundaries', () => {
    // Test exact boundaries
    const result5 = simulateCost(5, 0); // Minimum for tier 1
    expect(result5.discount).toBe(0.10);

    const result19 = simulateCost(19, 0); // Maximum for tier 1
    expect(result19.discount).toBe(0.10);

    const result20 = simulateCost(20, 0); // Minimum for tier 2
    expect(result20.discount).toBe(0.20);

    const result100 = simulateCost(100, 0); // Minimum for tier 4
    expect(result100.discount).toBe(0.30);
  });

  it('should verify tier configuration', () => {
    expect(TIERS).toHaveLength(4);
    expect(TIERS[0]).toEqual({ min: 5, max: 19, discount: 0.10 });
    expect(TIERS[1]).toEqual({ min: 20, max: 49, discount: 0.20 });
    expect(TIERS[2]).toEqual({ min: 50, max: 99, discount: 0.25 });
    expect(TIERS[3]).toEqual({ min: 100, max: null, discount: 0.30 });
  });

  it('should handle zero seats', () => {
    const result = simulateCost(0, 0);
    expect(result.seats).toBe(0);
    expect(result.monthly).toBe(0);
    expect(result.annual).toBe(0);
    expect(result.discount).toBe(0);
  });
});
