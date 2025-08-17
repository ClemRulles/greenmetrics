import { describe, it, expect } from 'vitest';
import { geographyForReport, normalizeGeography } from '@/lib/geo';

describe('geography utilities', () => {
  describe('normalizeGeography', () => {
    it('normalizes valid country codes', () => {
      expect(normalizeGeography('be')).toBe('BE');
      expect(normalizeGeography(' fr ')).toBe('FR');
      expect(normalizeGeography('US')).toBe('US');
    });

    it('rejects invalid codes', () => {
      expect(normalizeGeography('xyz')).toBe(null);
      expect(normalizeGeography('123')).toBe(null);
      expect(normalizeGeography('')).toBe(null);
      expect(normalizeGeography(null)).toBe(null);
      expect(normalizeGeography(undefined)).toBe(null);
    });
  });

  describe('geographyForReport', () => {
    it('prefers report override then org country then EU', () => {
      expect(geographyForReport({ geography: 'BE' }, { countryCode: 'FR' })).toBe('BE');
      expect(geographyForReport({ geography: null }, { countryCode: 'fr' })).toBe('FR');
      expect(geographyForReport({ geography: null }, { countryCode: 'FR' })).toBe('FR');
      expect(geographyForReport({ geography: null }, undefined)).toBe('EU');
      expect(geographyForReport({ geography: null }, { countryCode: null })).toBe('EU');
      expect(geographyForReport({ geography: '' }, { countryCode: 'invalid' })).toBe('EU');
    });
  });
});
