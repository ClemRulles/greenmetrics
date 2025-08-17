import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('i18n Billing Parity', () => {
  let enBilling: any;
  let frBilling: any;

  beforeAll(async () => {
    try {
      // Load EN billing translations
      const enPath = join(process.cwd(), 'public/locales/en/billing.json');
      const enContent = await readFile(enPath, 'utf-8');
      enBilling = JSON.parse(enContent);

      // Load FR billing translations
      const frPath = join(process.cwd(), 'public/locales/fr/billing.json');
      const frContent = await readFile(frPath, 'utf-8');
      frBilling = JSON.parse(frContent);
    } catch (error) {
      console.error('Failed to load translation files:', error);
      throw error;
    }
  });

  it('should have both EN and FR billing translation files', async () => {
    expect(enBilling).toBeDefined();
    expect(frBilling).toBeDefined();
    expect(typeof enBilling).toBe('object');
    expect(typeof frBilling).toBe('object');
  });

  describe('Root level keys', () => {
    const expectedRootKeys = [
      'title',
      'subtitle', 
      'currentPlan',
      'perMonth',
      'active',
      'inactive',
      'includedFeatures',
      'reports',
      'suppliers',
      'exports',
      'storage',
      'actions',
      'upgradeToBasic',
      'upgradeToPro',
      'manageSubscription',
      'comparePlans',
      'subscriptionCreated',
      'subscriptionCanceled',
      'billingError',
      'unableToLoad',
    ];

    expectedRootKeys.forEach(key => {
      it(`should have '${key}' in both EN and FR`, () => {
        expect(enBilling).toHaveProperty(key);
        expect(frBilling).toHaveProperty(key);
        expect(typeof enBilling[key]).toBe('string');
        expect(typeof frBilling[key]).toBe('string');
        expect(enBilling[key].length).toBeGreaterThan(0);
        expect(frBilling[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Plans section', () => {
    it('should have plans object in both languages', () => {
      expect(enBilling).toHaveProperty('plans');
      expect(frBilling).toHaveProperty('plans');
      expect(typeof enBilling.plans).toBe('object');
      expect(typeof frBilling.plans).toBe('object');
    });

    const planTypes = ['free', 'basic', 'pro'];
    
    planTypes.forEach(planType => {
      it(`should have ${planType} plan in both languages`, () => {
        expect(enBilling.plans).toHaveProperty(planType);
        expect(frBilling.plans).toHaveProperty(planType);
        
        // Check plan name
        expect(enBilling.plans[planType]).toHaveProperty('name');
        expect(frBilling.plans[planType]).toHaveProperty('name');
        expect(typeof enBilling.plans[planType].name).toBe('string');
        expect(typeof frBilling.plans[planType].name).toBe('string');
        
        // Check features array
        expect(enBilling.plans[planType]).toHaveProperty('features');
        expect(frBilling.plans[planType]).toHaveProperty('features');
        expect(Array.isArray(enBilling.plans[planType].features)).toBe(true);
        expect(Array.isArray(frBilling.plans[planType].features)).toBe(true);
        
        // Features should have same length
        expect(enBilling.plans[planType].features.length).toBe(
          frBilling.plans[planType].features.length
        );
        
        // All features should be non-empty strings
        enBilling.plans[planType].features.forEach((feature: string) => {
          expect(typeof feature).toBe('string');
          expect(feature.length).toBeGreaterThan(0);
        });
        
        frBilling.plans[planType].features.forEach((feature: string) => {
          expect(typeof feature).toBe('string');
          expect(feature.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Usage section', () => {
    it('should have usage object in both languages', () => {
      expect(enBilling).toHaveProperty('usage');
      expect(frBilling).toHaveProperty('usage');
      expect(typeof enBilling.usage).toBe('object');
      expect(typeof frBilling.usage).toBe('object');
    });

    const usageKeys = [
      'reportsGenerated',
      'suppliersLinked', 
      'exportsRequested',
      'storageUsed'
    ];

    usageKeys.forEach(key => {
      it(`should have usage.${key} in both EN and FR`, () => {
        expect(enBilling.usage).toHaveProperty(key);
        expect(frBilling.usage).toHaveProperty(key);
        expect(typeof enBilling.usage[key]).toBe('string');
        expect(typeof frBilling.usage[key]).toBe('string');
        expect(enBilling.usage[key].length).toBeGreaterThan(0);
        expect(frBilling.usage[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Entitlements section', () => {
    it('should have entitlements object in both languages', () => {
      expect(enBilling).toHaveProperty('entitlements');
      expect(frBilling).toHaveProperty('entitlements');
      expect(typeof enBilling.entitlements).toBe('object');
      expect(typeof frBilling.entitlements).toBe('object');
    });

    const entitlementKeys = [
      'targetsDisabled',
      'proofVaultDisabled',
      'reportLimitExceeded',
      'supplierLimitExceeded',
      'exportLimitExceeded', 
      'apiLimitExceeded'
    ];

    entitlementKeys.forEach(key => {
      it(`should have entitlements.${key} in both EN and FR`, () => {
        expect(enBilling.entitlements).toHaveProperty(key);
        expect(frBilling.entitlements).toHaveProperty(key);
        expect(typeof enBilling.entitlements[key]).toBe('string');
        expect(typeof frBilling.entitlements[key]).toBe('string');
        expect(enBilling.entitlements[key].length).toBeGreaterThan(0);
        expect(frBilling.entitlements[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Billing section', () => {
    it('should have billing object in both languages', () => {
      expect(enBilling).toHaveProperty('billing');
      expect(frBilling).toHaveProperty('billing');
      expect(typeof enBilling.billing).toBe('object');
      expect(typeof frBilling.billing).toBe('object');
    });

    const billingKeys = [
      'noCustomer',
      'subscriptionInactive',
      'cannotDowngrade'
    ];

    billingKeys.forEach(key => {
      it(`should have billing.${key} in both EN and FR`, () => {
        expect(enBilling.billing).toHaveProperty(key);
        expect(frBilling.billing).toHaveProperty(key);
        expect(typeof enBilling.billing[key]).toBe('string');
        expect(typeof frBilling.billing[key]).toBe('string');
        expect(enBilling.billing[key].length).toBeGreaterThan(0);
        expect(frBilling.billing[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Translation quality', () => {
    it('should not have EN and FR translations be identical', () => {
      // Ensure translations are actually translated, not just copied
      expect(enBilling.title).not.toBe(frBilling.title);
      expect(enBilling.currentPlan).not.toBe(frBilling.currentPlan);
      expect(enBilling.perMonth).not.toBe(frBilling.perMonth);
      expect(enBilling.active).not.toBe(frBilling.active);
      expect(enBilling.inactive).not.toBe(frBilling.inactive);
    });

    it('should have appropriate length differences for common phrases', () => {
      // French translations are typically longer than English
      // This is a general check, not absolute rule
      const enLength = enBilling.subtitle.length;
      const frLength = frBilling.subtitle.length;
      
      // Allow some variance but expect FR to be different length
      expect(Math.abs(enLength - frLength)).toBeGreaterThan(0);
    });

    it('should preserve formatting markers', () => {
      // Check that special characters and formatting are preserved
      if (enBilling.subscriptionCreated.includes('✅')) {
        expect(frBilling.subscriptionCreated).toContain('✅');
      }
      
      if (enBilling.subscriptionCanceled.includes('⚠️')) {
        expect(frBilling.subscriptionCanceled).toContain('⚠️');
      }
    });

    it('should have consistent currency formatting', () => {
      // Both should use EUR currency symbol €
      expect(enBilling.upgradeToBasic).toContain('€');
      expect(frBilling.upgradeToBasic).toContain('€');
      expect(enBilling.upgradeToPro).toContain('€');
      expect(frBilling.upgradeToPro).toContain('€');
    });
  });

  describe('Structural consistency', () => {
    it('should have identical nested structure', () => {
      function getStructure(obj: any, path = ''): string[] {
        const keys: string[] = [];
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          keys.push(currentPath);
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys.push(...getStructure(value, currentPath));
          }
        }
        return keys.sort();
      }

      const enStructure = getStructure(enBilling);
      const frStructure = getStructure(frBilling);

      expect(enStructure).toEqual(frStructure);
    });

    it('should have matching array lengths for all nested arrays', () => {
      function compareArrayLengths(enObj: any, frObj: any, path = ''): void {
        for (const [key, enValue] of Object.entries(enObj)) {
          const currentPath = path ? `${path}.${key}` : key;
          const frValue = frObj[key];
          
          if (Array.isArray(enValue) && Array.isArray(frValue)) {
            expect(enValue.length).toBe(frValue.length);
          } else if (typeof enValue === 'object' && enValue !== null && typeof frValue === 'object' && frValue !== null) {
            compareArrayLengths(enValue, frValue, currentPath);
          }
        }
      }

      compareArrayLengths(enBilling, frBilling);
    });
  });
});
