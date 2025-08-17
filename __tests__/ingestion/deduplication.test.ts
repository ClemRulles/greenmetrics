/**
 * Deduplication Tests
 * 
 * Tests for SHA256-based document deduplication across all ingestion sources.
 */

import { describe, it, expect } from 'vitest';
import { 
  generateDocumentHash,
  validateDocumentIdentifier,
  normalizePeriodMonth,
  extractPeriodMonth,
  createDocumentHash,
  type DocumentIdentifier 
} from '@/lib/ingestion/deduplication';

describe('Deduplication', () => {
  describe('generateDocumentHash', () => {
    it('should generate consistent SHA256 hash', () => {
      const identifier: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const hash1 = generateDocumentHash(identifier);
      const hash2 = generateDocumentHash(identifier);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
    });

    it('should generate different hashes for different content', () => {
      const identifier1: DocumentIdentifier = {
        content: 'content 1',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const identifier2: DocumentIdentifier = {
        content: 'content 2',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const hash1 = generateDocumentHash(identifier1);
      const hash2 = generateDocumentHash(identifier2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different suppliers', () => {
      const identifier1: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const identifier2: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'engie',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const hash1 = generateDocumentHash(identifier1);
      const hash2 = generateDocumentHash(identifier2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different invoice numbers', () => {
      const identifier1: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const identifier2: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'edf',
        invoiceNo: 'INV002',
        periodMonth: '2024-01'
      };

      const hash1 = generateDocumentHash(identifier1);
      const hash2 = generateDocumentHash(identifier2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different periods', () => {
      const identifier1: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const identifier2: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-02'
      };

      const hash1 = generateDocumentHash(identifier1);
      const hash2 = generateDocumentHash(identifier2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle missing invoice number', () => {
      const identifier: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'edf',
        periodMonth: '2024-01'
      };

      const hash = generateDocumentHash(identifier);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle Buffer content', () => {
      const identifier: DocumentIdentifier = {
        content: Buffer.from('test content', 'utf-8'),
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const hash = generateDocumentHash(identifier);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('validateDocumentIdentifier', () => {
    it('should validate valid identifier', () => {
      const identifier: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const result = validateDocumentIdentifier(identifier);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty content', () => {
      const identifier: DocumentIdentifier = {
        content: '',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const result = validateDocumentIdentifier(identifier);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content cannot be empty');
    });

    it('should reject empty supplier ID', () => {
      const identifier: DocumentIdentifier = {
        content: 'test content',
        supplierId: '',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const result = validateDocumentIdentifier(identifier);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Supplier ID is required');
    });

    it('should reject invalid period format', () => {
      const identifier: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-1' // Invalid format
      };

      const result = validateDocumentIdentifier(identifier);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Period month must be in YYYY-MM format');
    });

    it('should accept valid period formats', () => {
      const validPeriods = ['2024-01', '2024-12', '2023-06'];

      validPeriods.forEach(period => {
        const identifier: DocumentIdentifier = {
          content: 'test content',
          supplierId: 'edf',
          periodMonth: period
        };

        const result = validateDocumentIdentifier(identifier);
        expect(result.isValid).toBe(true);
      });
    });

    it('should accumulate multiple errors', () => {
      const identifier: DocumentIdentifier = {
        content: '',
        supplierId: '',
        periodMonth: 'invalid'
      };

      const result = validateDocumentIdentifier(identifier);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('normalizePeriodMonth', () => {
    it('should normalize Date objects', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const result = normalizePeriodMonth(date);
      expect(result).toBe('2024-01');
    });

    it('should normalize date strings', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = normalizePeriodMonth(dateString);
      expect(result).toBe('2024-01');
    });

    it('should pad single-digit months', () => {
      const date = new Date(2024, 8, 15); // September 15, 2024
      const result = normalizePeriodMonth(date);
      expect(result).toBe('2024-09');
    });

    it('should handle December correctly', () => {
      const date = new Date(2024, 11, 15); // December 15, 2024
      const result = normalizePeriodMonth(date);
      expect(result).toBe('2024-12');
    });
  });

  describe('extractPeriodMonth', () => {
    it('should use start date for period extraction', () => {
      const periodStart = new Date(2024, 0, 1); // January 1, 2024
      const periodEnd = new Date(2024, 0, 31);   // January 31, 2024
      
      const result = extractPeriodMonth(periodStart, periodEnd);
      expect(result).toBe('2024-01');
    });

    it('should handle cross-month periods', () => {
      const periodStart = new Date(2024, 0, 15); // January 15, 2024
      const periodEnd = new Date(2024, 1, 15);   // February 15, 2024
      
      const result = extractPeriodMonth(periodStart, periodEnd);
      expect(result).toBe('2024-01'); // Should use start date
    });
  });

  describe('createDocumentHash', () => {
    it('should create hash for valid identifier', async () => {
      const identifier: DocumentIdentifier = {
        content: 'test content',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const result = await createDocumentHash(identifier);
      
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.isDuplicate).toBe(false); // Assuming no database
      expect(result.existingDocumentId).toBeUndefined();
    });

    it('should reject invalid identifier', async () => {
      const identifier: DocumentIdentifier = {
        content: '',
        supplierId: '',
        periodMonth: 'invalid'
      };

      await expect(createDocumentHash(identifier)).rejects.toThrow('Invalid document identifier');
    });
  });

  describe('hash consistency across sources', () => {
    it('should generate same hash for identical content from different sources', () => {
      const baseIdentifier: DocumentIdentifier = {
        content: 'identical utility bill content',
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      // Same content from CSV upload
      const csvHash = generateDocumentHash(baseIdentifier);
      
      // Same content from email
      const emailHash = generateDocumentHash(baseIdentifier);
      
      // Same content from Drive
      const driveHash = generateDocumentHash(baseIdentifier);

      expect(csvHash).toBe(emailHash);
      expect(emailHash).toBe(driveHash);
    });

    it('should handle different content encodings consistently', () => {
      const content = 'test content with special chars: é à ñ';
      
      const stringIdentifier: DocumentIdentifier = {
        content,
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const bufferIdentifier: DocumentIdentifier = {
        content: Buffer.from(content, 'utf-8'),
        supplierId: 'edf',
        invoiceNo: 'INV001',
        periodMonth: '2024-01'
      };

      const stringHash = generateDocumentHash(stringIdentifier);
      const bufferHash = generateDocumentHash(bufferIdentifier);

      expect(stringHash).toBe(bufferHash);
    });
  });

  describe('collision resistance', () => {
    it('should generate different hashes for similar content', () => {
      const hashes = new Set<string>();
      
      // Generate many similar identifiers
      for (let i = 0; i < 1000; i++) {
        const identifier: DocumentIdentifier = {
          content: `test content ${i}`,
          supplierId: 'edf',
          invoiceNo: `INV${i.toString().padStart(3, '0')}`,
          periodMonth: '2024-01'
        };
        
        const hash = generateDocumentHash(identifier);
        hashes.add(hash);
      }
      
      // All hashes should be unique
      expect(hashes.size).toBe(1000);
    });

    it('should handle edge cases without collisions', () => {
      const edgeCases: DocumentIdentifier[] = [
        {
          content: 'empty-supplier',
          supplierId: 'a',
          periodMonth: '2024-01'
        },
        {
          content: 'a',
          supplierId: 'empty-content',
          periodMonth: '2024-01'
        },
        {
          content: 'very long content that exceeds normal document sizes and contains lots of repetitive text that might cause hash collisions if the algorithm is not properly implemented',
          supplierId: 'supplier-with-very-long-name-that-exceeds-normal-limits',
          invoiceNo: 'INVOICE-NUMBER-WITH-SPECIAL-CHARS-!@#$%^&*()',
          periodMonth: '2024-12'
        }
      ];

      const hashes = edgeCases.map(generateDocumentHash);
      
      // All hashes should be unique
      expect(new Set(hashes).size).toBe(hashes.length);
      
      // Verify all hashes are valid SHA256 format
      hashes.forEach(hash => {
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });
});
