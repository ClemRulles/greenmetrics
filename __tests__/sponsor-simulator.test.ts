import { describe, it, expect } from 'vitest';
import { simulateCost, getTierInfo, TIERS } from '@/lib/sponsor/simulator';

describe('Cost Simulator', () => {
  it('should calculate basic pricing correctly', () => {
    const result = simulateCost(10, 0); // 10 basic, 0 pro
    
    expect(result.seats).toBe(10);
    expect(result.discount).toBe(0.10); // 5-19 seats tier
    expect(result.monthly).toBe(441); // 490 * 0.9 = 441
    expect(result.annual).toBe(5292); // 441 * 12
  });

  it('should calculate pro pricing correctly', () => {
    const result = simulateCost(0, 5); // 0 basic, 5 pro
    
    expect(result.seats).toBe(5);
    expect(result.discount).toBe(0.10); // 5-19 seats tier
    expect(result.monthly).toBe(445.5); // 495 * 0.9 = 445.5
    expect(result.annual).toBe(5346); // 445.5 * 12
  });

  it('should calculate mixed pricing correctly', () => {
    const result = simulateCost(10, 5); // 10 basic, 5 pro
    
    expect(result.seats).toBe(15);
    expect(result.discount).toBe(0.10); // 5-19 seats tier
    expect(result.monthly).toBe(886.5); // (490 + 495) * 0.9 = 886.5
    expect(result.annual).toBe(10638); // 886.5 * 12
  });

  it('should apply correct discounts for tier boundaries', () => {
    // Test each tier boundary
    
    // 4 seats - no discount
    let result = simulateCost(4, 0);
    expect(result.discount).toBe(0);
    
    // 5 seats - 10% discount
    result = simulateCost(5, 0);
    expect(result.discount).toBe(0.10);
    
    // 19 seats - 10% discount
    result = simulateCost(19, 0);
    expect(result.discount).toBe(0.10);
    
    // 20 seats - 20% discount
    result = simulateCost(20, 0);
    expect(result.discount).toBe(0.20);
    
    // 49 seats - 20% discount
    result = simulateCost(49, 0);
    expect(result.discount).toBe(0.20);
    
    // 50 seats - 25% discount
    result = simulateCost(50, 0);
    expect(result.discount).toBe(0.25);
    
    // 99 seats - 25% discount
    result = simulateCost(99, 0);
    expect(result.discount).toBe(0.25);
    
    // 100 seats - 30% discount
    result = simulateCost(100, 0);
    expect(result.discount).toBe(0.30);
    
    // 150 seats - 30% discount
    result = simulateCost(150, 0);
    expect(result.discount).toBe(0.30);
  });

  it('should handle zero seats', () => {
    const result = simulateCost(0, 0);
    
    expect(result.seats).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.monthly).toBe(0);
    expect(result.annual).toBe(0);
  });

  it('should round monthly and annual totals correctly', () => {
    // Test rounding with a scenario that produces decimal results
    const result = simulateCost(1, 1); // Should be 148 total, no discount
    
    expect(result.monthly).toBe(148); // 49 + 99 = 148
    expect(result.annual).toBe(1776); // 148 * 12 = 1776
  });

  it('should verify tier configuration', () => {
    // Ensure tiers are configured correctly
    expect(TIERS).toHaveLength(4);
    expect(TIERS[0]).toEqual({ min: 5, max: 19, discount: 0.10 });
    expect(TIERS[1]).toEqual({ min: 20, max: 49, discount: 0.20 });
    expect(TIERS[2]).toEqual({ min: 50, max: 99, discount: 0.25 });
    expect(TIERS[3]).toEqual({ min: 100, max: null, discount: 0.30 });
  });

  it('should provide correct tier info', () => {
    let tierInfo = getTierInfo(10);
    expect(tierInfo.discount).toBe(0.10);
    expect(tierInfo.description).toBe('5-19 seats (10% discount)');
    
    tierInfo = getTierInfo(25);
    expect(tierInfo.discount).toBe(0.20);
    expect(tierInfo.description).toBe('20-49 seats (20% discount)');
    
    tierInfo = getTierInfo(75);
    expect(tierInfo.discount).toBe(0.25);
    expect(tierInfo.description).toBe('50-99 seats (25% discount)');
    
    tierInfo = getTierInfo(150);
    expect(tierInfo.discount).toBe(0.30);
    expect(tierInfo.description).toBe('100+ seats (30% discount)');
    
    tierInfo = getTierInfo(3);
    expect(tierInfo.discount).toBe(0);
    expect(tierInfo.description).toBe('No discount');
  });
});
