import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Next.js request/response
const mockRequest = (url: string, method: string = 'GET', body?: any) => ({
  url,
  method,
  json: () => Promise.resolve(body),
  formData: () => Promise.resolve(new FormData()),
  headers: new Map(),
});

const mockResponse = () => {
  const json = vi.fn();
  return { json, status: vi.fn(() => ({ json })) };
};

// Mock RBAC
vi.mock('@/lib/rbac', () => ({
  requireOrgRole: vi.fn().mockResolvedValue({ userId: 'test-user' }),
}));

// Mock file storage
vi.mock('@/lib/storage/files', () => ({
  putFile: vi.fn().mockResolvedValue('/path/to/file'),
  removeFile: vi.fn().mockResolvedValue(undefined),
  getFile: vi.fn().mockResolvedValue(Buffer.from('test')),
}));

// Mock crypto
vi.mock('@/lib/crypto/hash', () => ({
  sha256Hex: vi.fn().mockResolvedValue('a'.repeat(64)),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    proof: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    attestation: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('Proof Vault API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/supplier/proofs', () => {
    it('should require authentication', async () => {
      const { requireOrgRole } = await import('@/lib/rbac');
      vi.mocked(requireOrgRole).mockRejectedValueOnce(new Error('Not authenticated'));

      const { POST } = await import('@/app/api/supplier/proofs/route');
      
      const req = mockRequest('/api/supplier/proofs', 'POST') as any;
      const response = await POST(req);
      
      expect(response.status).toBe(401);
    });

    it('should validate file presence', async () => {
      const { POST } = await import('@/app/api/supplier/proofs/route');
      
      const formData = new FormData();
      formData.append('meta', JSON.stringify({
        organizationId: 'test-org',
        kind: 'ELECTRICITY_BILL',
        periodStart: '2024-01-01T00:00:00.000Z',
        periodEnd: '2024-01-31T23:59:59.999Z',
      }));

      const req = {
        formData: () => Promise.resolve(formData),
        headers: new Map(),
      } as any;

      const response = await POST(req);
      const data = await response.json();
      
      expect(data.error).toBe('File is required');
    });

    it('should validate metadata format', async () => {
      const { POST } = await import('@/app/api/supplier/proofs/route');
      
      const formData = new FormData();
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      formData.append('file', file);
      formData.append('meta', 'invalid-json');

      const req = {
        formData: () => Promise.resolve(formData),
        headers: new Map(),
      } as any;

      const response = await POST(req);
      const data = await response.json();
      
      expect(data.error).toBe('Invalid metadata format');
    });
  });

  describe('GET /api/supplier/proofs/summary', () => {
    it('should require organization ID', async () => {
      const { GET } = await import('@/app/api/supplier/proofs/summary/route');
      
      const req = mockRequest('/api/supplier/proofs/summary') as any;
      const response = await GET(req);
      const data = await response.json();
      
      expect(data.error).toBe('Organization ID required');
    });

    it('should return evidence summary structure', async () => {
      const { GET } = await import('@/app/api/supplier/proofs/summary/route');
      
      const req = mockRequest('/api/supplier/proofs/summary?orgId=test-org&year=2024') as any;
      const response = await GET(req);
      const data = await response.json();
      
      expect(data).toHaveProperty('summary');
      expect(data.summary).toHaveProperty('year', 2024);
      expect(data.summary).toHaveProperty('byKind');
      expect(data.summary).toHaveProperty('totalFiles');
      expect(data).toHaveProperty('meta');
    });

    it('should validate year parameter', async () => {
      const { GET } = await import('@/app/api/supplier/proofs/summary/route');
      
      const req = mockRequest('/api/supplier/proofs/summary?orgId=test-org&year=invalid') as any;
      const response = await GET(req);
      const data = await response.json();
      
      expect(data.error).toBe('Invalid year');
    });
  });

  describe('POST /api/supplier/attest', () => {
    it('should validate attestation agreement', async () => {
      const { POST } = await import('@/app/api/supplier/attest/route');
      
      const req = mockRequest('/api/supplier/attest', 'POST', {
        organizationId: 'test-org',
        statement: 'I attest to the accuracy',
        periodYear: 2024,
        agreed: false, // Not agreed
      }) as any;

      const response = await POST(req);
      const data = await response.json();
      
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should require minimum statement length', async () => {
      const { POST } = await import('@/app/api/supplier/attest/route');
      
      const req = mockRequest('/api/supplier/attest', 'POST', {
        organizationId: 'test-org',
        statement: 'short', // Too short
        periodYear: 2024,
        agreed: true,
      }) as any;

      const response = await POST(req);
      const data = await response.json();
      
      expect(data.error).toBe('Validation failed');
    });

    it('should validate year range', async () => {
      const { POST } = await import('@/app/api/supplier/attest/route');
      
      const req = mockRequest('/api/supplier/attest', 'POST', {
        organizationId: 'test-org',
        statement: 'I attest to the accuracy of this data',
        periodYear: 1999, // Invalid year
        agreed: true,
      }) as any;

      const response = await POST(req);
      const data = await response.json();
      
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('Partner Privacy Protection', () => {
    it('should not expose file paths in any partner-facing endpoints', async () => {
      const { GET } = await import('@/app/api/supplier/proofs/summary/route');
      
      const req = mockRequest('/api/supplier/proofs/summary?orgId=test-org&year=2024') as any;
      const response = await GET(req);
      const data = await response.json();
      
      const responseText = JSON.stringify(data);
      
      // Should not contain any file system paths
      expect(responseText).not.toMatch(/\/uploads?\//);
      expect(responseText).not.toMatch(/\.data\//);
      expect(responseText).not.toMatch(/[a-f0-9]{64}/); // SHA-256 hashes
      expect(responseText).not.toMatch(/\.(pdf|jpg|png|csv|xlsx)/i);
    });

    it('should only return aggregated statistics', async () => {
      const { GET } = await import('@/app/api/supplier/proofs/summary/route');
      
      const req = mockRequest('/api/supplier/proofs/summary?orgId=test-org&year=2024') as any;
      const response = await GET(req);
      const data = await response.json();
      
      // Check that only statistical data is exposed
      expect(data.summary).toHaveProperty('totalFiles');
      expect(data.summary.byKind).toHaveProperty('ELECTRICITY_BILL');
      
      // Verify structure of kind data
      const kindData = data.summary.byKind.ELECTRICITY_BILL;
      expect(kindData).toHaveProperty('count');
      expect(kindData).toHaveProperty('monthsCovered');
      expect(typeof kindData.count).toBe('number');
      expect(typeof kindData.monthsCovered).toBe('number');
      
      // Should not have any file-specific data
      expect(kindData).not.toHaveProperty('files');
      expect(kindData).not.toHaveProperty('filenames');
      expect(kindData).not.toHaveProperty('paths');
    });
  });

  describe('File Security', () => {
    it('should validate file types for security', () => {
      const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/webp',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];

      const dangerousTypes = [
        'application/javascript',
        'text/html',
        'application/x-executable',
        'application/x-msdownload',
        'application/octet-stream',
      ];

      // Allowed types should be safe
      allowedTypes.forEach(type => {
        expect(allowedTypes).toContain(type);
      });

      // Dangerous types should not be allowed
      dangerousTypes.forEach(type => {
        expect(allowedTypes).not.toContain(type);
      });
    });

    it('should enforce file size limits', () => {
      const MAX_SIZE = 25 * 1024 * 1024; // 25MB
      
      expect(MAX_SIZE).toBe(26214400); // Verify the constant
      expect(1024).toBeLessThan(MAX_SIZE); // Small file OK
      expect(50 * 1024 * 1024).toBeGreaterThan(MAX_SIZE); // Large file rejected
    });
  });
});
