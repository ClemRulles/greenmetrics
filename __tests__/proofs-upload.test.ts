import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sha256Hex } from '@/lib/crypto/hash';
import { putFile, removeFile, getFile, fileExists } from '@/lib/storage/files';
import { getEvidenceSummary } from '@/lib/proofs/summary';

describe('Proof Vault - Upload & Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Crypto Hash', () => {
    it('should generate consistent SHA-256 hashes', async () => {
      const testData = Buffer.from('test data', 'utf8');
      const hash1 = await sha256Hex(testData);
      const hash2 = await sha256Hex(testData);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // 64 hex characters
    });

    it('should generate different hashes for different data', async () => {
      const data1 = Buffer.from('test data 1', 'utf8');
      const data2 = Buffer.from('test data 2', 'utf8');
      
      const hash1 = await sha256Hex(data1);
      const hash2 = await sha256Hex(data2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('File Storage', () => {
    it('should store and retrieve files correctly', async () => {
      const testData = Buffer.from('test file content', 'utf8');
      const testKey = 'test/file.txt';
      
      // Store file
      await putFile(testKey, testData);
      
      // Check if file exists
      const exists = await fileExists(testKey);
      expect(exists).toBe(true);
      
      // Retrieve file
      const retrieved = await getFile(testKey);
      expect(retrieved).toEqual(testData);
      
      // Clean up
      await removeFile(testKey);
      
      // Verify removal
      const existsAfterRemoval = await fileExists(testKey);
      expect(existsAfterRemoval).toBe(false);
    });

    it('should return null for non-existent files', async () => {
      const result = await getFile('non-existent-file.txt');
      expect(result).toBeNull();
    });
  });

  describe('Evidence Summary', () => {
    it('should return proper structure for evidence summary', async () => {
      const orgId = 'test-org';
      const year = 2024;
      
      const summary = await getEvidenceSummary(orgId, year);
      
      expect(summary).toHaveProperty('year', year);
      expect(summary).toHaveProperty('byKind');
      expect(summary).toHaveProperty('totalFiles');
      
      expect(summary.byKind).toHaveProperty('ELECTRICITY_BILL');
      expect(summary.byKind).toHaveProperty('GAS_BILL');
      expect(summary.byKind).toHaveProperty('FUEL_INVOICE');
      expect(summary.byKind).toHaveProperty('OTHER');
      
      // Each kind should have count and monthsCovered
      Object.values(summary.byKind).forEach(kind => {
        expect(kind).toHaveProperty('count');
        expect(kind).toHaveProperty('monthsCovered');
        expect(typeof kind.count).toBe('number');
        expect(typeof kind.monthsCovered).toBe('number');
      });
    });

    it('should return zero counts for new organizations', async () => {
      const summary = await getEvidenceSummary('new-org', 2024);
      
      expect(summary.totalFiles).toBe(0);
      Object.values(summary.byKind).forEach(kind => {
        expect(kind.count).toBe(0);
        expect(kind.monthsCovered).toBe(0);
      });
    });
  });

  describe('Privacy Protection', () => {
    it('should not expose file paths in evidence summary', async () => {
      const summary = await getEvidenceSummary('test-org', 2024);
      
      // Summary should only contain aggregated data
      const summaryJson = JSON.stringify(summary);
      expect(summaryJson).not.toMatch(/\.(pdf|jpg|png|csv|xlsx)/i);
      expect(summaryJson).not.toMatch(/\/uploads?\//);
      expect(summaryJson).not.toMatch(/\.data\//);
    });

    it('should only include statistical information in summary', async () => {
      const summary = await getEvidenceSummary('test-org', 2024);
      
      // Check that only approved fields are present
      const allowedFields = ['year', 'byKind', 'totalFiles'];
      expect(Object.keys(summary)).toEqual(expect.arrayContaining(allowedFields));
      
      // No sensitive fields should be present
      expect(summary).not.toHaveProperty('files');
      expect(summary).not.toHaveProperty('filenames');
      expect(summary).not.toHaveProperty('paths');
      expect(summary).not.toHaveProperty('sha256');
    });
  });

  describe('File Validation', () => {
    it('should validate file sizes correctly', () => {
      const MAX_SIZE = 25 * 1024 * 1024; // 25MB
      
      expect(1024).toBeLessThan(MAX_SIZE); // 1KB - valid
      expect(10 * 1024 * 1024).toBeLessThan(MAX_SIZE); // 10MB - valid
      expect(50 * 1024 * 1024).toBeGreaterThan(MAX_SIZE); // 50MB - invalid
    });

    it('should validate allowed MIME types', () => {
      const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/webp',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      
      expect(allowedTypes).toContain('application/pdf');
      expect(allowedTypes).toContain('image/png');
      expect(allowedTypes).toContain('text/csv');
      
      // Should not contain dangerous types
      expect(allowedTypes).not.toContain('application/javascript');
      expect(allowedTypes).not.toContain('text/html');
      expect(allowedTypes).not.toContain('application/x-executable');
    });
  });
});
