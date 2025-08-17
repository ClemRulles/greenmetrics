import { describe, it, expect, vi } from 'vitest';

// Create a minimal test for debugging
describe('Billing Debug', () => {
  it('should be able to import functions without crashing', async () => {
    try {
      const { applyPlanEntitlements, applyGraceEntitlements, freezeEntitlements } = await import('@/lib/billing/entitlements');
      const { onCheckoutSessionCompleted } = await import('@/lib/billing/handlers');
      
      expect(typeof applyPlanEntitlements).toBe('function');
      expect(typeof applyGraceEntitlements).toBe('function');
      expect(typeof freezeEntitlements).toBe('function');
      expect(typeof onCheckoutSessionCompleted).toBe('function');
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  });
});
