import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the cadence modules first
vi.mock('@/lib/cadence/close', () => ({
  runMonthlyClose: vi.fn(),
}));

vi.mock('@/lib/cadence/backfill', () => ({
  runBackfillProcess: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cadenceJob: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock environment
vi.mock('process', () => ({
  env: {
    JOB_SECRET: 'test-secret-123',
  },
}));

// Import after mocking
import { POST } from '@/app/api/jobs/cadence/run/route';
import { runMonthlyClose } from '@/lib/cadence/close';
import { runBackfillProcess } from '@/lib/cadence/backfill';
import { prisma } from '@/lib/prisma';

describe('/api/jobs/cadence/run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const request = new NextRequest('http://localhost/api/jobs/cadence/run', {
        method: 'POST',
        body: JSON.stringify({ type: 'monthly_close', period: '2025-08' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid authorization', async () => {
      const request = new NextRequest('http://localhost/api/jobs/cadence/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({ type: 'monthly_close', period: '2025-08' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept requests with valid authorization', async () => {
      vi.mocked(prisma.cadenceJob.create).mockResolvedValue({
        id: 'job-123',
        type: 'monthly_close',
        status: 'RUNNING',
      } as any);

      vi.mocked(runMonthlyClose).mockResolvedValue({
        processedOrganizations: 5,
        realDataRecords: 3,
        estimatedRecords: 2,
        errors: [],
      } as any);

      vi.mocked(prisma.cadenceJob.update).mockResolvedValue({
        id: 'job-123',
        status: 'COMPLETED',
      } as any);

      const request = new NextRequest('http://localhost/api/jobs/cadence/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-secret-123',
        },
        body: JSON.stringify({ type: 'monthly_close', period: '2025-08' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobId).toBe('job-123');
      expect(data.status).toBe('COMPLETED');
    });
  });

  describe('Request Validation', () => {
    const createAuthenticatedRequest = (body: any) => {
      return new NextRequest('http://localhost/api/jobs/cadence/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-secret-123',
        },
        body: JSON.stringify(body),
      });
    };

    it('should validate required fields', async () => {
      const request = createAuthenticatedRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('validation');
    });

    it('should validate job type enum', async () => {
      const request = createAuthenticatedRequest({
        type: 'invalid_type',
        period: '2025-08',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid enum value');
    });

    it('should validate period format', async () => {
      const request = createAuthenticatedRequest({
        type: 'monthly_close',
        period: 'invalid-period',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('validation');
    });

    it('should accept valid monthly_close request', async () => {
      mockPrisma.cadenceJob.create.mockResolvedValue({
        id: 'job-123',
        type: 'monthly_close',
        status: 'RUNNING',
      });

      mockRunMonthlyClose.mockResolvedValue({
        processedOrganizations: 10,
        realDataRecords: 8,
        estimatedRecords: 2,
        errors: [],
      });

      mockPrisma.cadenceJob.update.mockResolvedValue({
        id: 'job-123',
        status: 'COMPLETED',
      });

      const request = createAuthenticatedRequest({
        type: 'monthly_close',
        period: '2025-08',
        organizationId: 'org-123',
        forceRecompute: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('COMPLETED');
      expect(data.result.processedOrganizations).toBe(10);
      expect(mockRunMonthlyClose).toHaveBeenCalledWith(
        '2025-08',
        'org-123',
        true
      );
    });

    it('should accept valid backfill request', async () => {
      mockPrisma.cadenceJob.create.mockResolvedValue({
        id: 'job-456',
        type: 'backfill',
        status: 'RUNNING',
      });

      mockRunBackfillProcess.mockResolvedValue({
        backfilledRecords: 5,
        upgradedGrades: 3,
        regeneratedComputations: 8,
        errors: [],
      });

      mockPrisma.cadenceJob.update.mockResolvedValue({
        id: 'job-456',
        status: 'COMPLETED',
      });

      const request = createAuthenticatedRequest({
        type: 'backfill',
        period: '2025-08',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('COMPLETED');
      expect(data.result.backfilledRecords).toBe(5);
      expect(mockRunBackfillProcess).toHaveBeenCalledWith('2025-08');
    });
  });

  describe('Job Management', () => {
    const createAuthenticatedRequest = (body: any) => {
      return new NextRequest('http://localhost/api/jobs/cadence/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-secret-123',
        },
        body: JSON.stringify(body),
      });
    };

    it('should create job record before execution', async () => {
      mockPrisma.cadenceJob.create.mockResolvedValue({
        id: 'job-789',
        type: 'monthly_close',
        status: 'RUNNING',
      });

      mockRunMonthlyClose.mockResolvedValue({
        processedOrganizations: 3,
        realDataRecords: 2,
        estimatedRecords: 1,
        errors: [],
      });

      mockPrisma.cadenceJob.update.mockResolvedValue({
        id: 'job-789',
        status: 'COMPLETED',
      });

      const request = createAuthenticatedRequest({
        type: 'monthly_close',
        period: '2025-08',
      });

      await POST(request);

      expect(mockPrisma.cadenceJob.create).toHaveBeenCalledWith({
        data: {
          type: 'monthly_close',
          period: '2025-08',
          status: 'RUNNING',
          organizationId: undefined,
          forceRecompute: false,
          startedAt: expect.any(Date),
        },
      });
    });

    it('should update job status on completion', async () => {
      const jobId = 'job-complete';
      
      mockPrisma.cadenceJob.create.mockResolvedValue({
        id: jobId,
        type: 'monthly_close',
        status: 'RUNNING',
      });

      mockRunMonthlyClose.mockResolvedValue({
        processedOrganizations: 7,
        realDataRecords: 5,
        estimatedRecords: 2,
        errors: [],
      });

      mockPrisma.cadenceJob.update.mockResolvedValue({
        id: jobId,
        status: 'COMPLETED',
      });

      const request = createAuthenticatedRequest({
        type: 'monthly_close',
        period: '2025-08',
      });

      await POST(request);

      expect(mockPrisma.cadenceJob.update).toHaveBeenCalledWith({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          result: {
            processedOrganizations: 7,
            realDataRecords: 5,
            estimatedRecords: 2,
            errors: [],
          },
        },
      });
    });

    it('should update job status on failure', async () => {
      const jobId = 'job-failed';
      
      mockPrisma.cadenceJob.create.mockResolvedValue({
        id: jobId,
        type: 'monthly_close',
        status: 'RUNNING',
      });

      const testError = new Error('Processing failed');
      mockRunMonthlyClose.mockRejectedValue(testError);

      mockPrisma.cadenceJob.update.mockResolvedValue({
        id: jobId,
        status: 'FAILED',
      });

      const request = createAuthenticatedRequest({
        type: 'monthly_close',
        period: '2025-08',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Processing failed');
      expect(mockPrisma.cadenceJob.update).toHaveBeenCalledWith({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: expect.any(Date),
          errorMessage: 'Processing failed',
        },
      });
    });
  });

  describe('Error Handling', () => {
    const createAuthenticatedRequest = (body: any) => {
      return new NextRequest('http://localhost/api/jobs/cadence/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-secret-123',
        },
        body: JSON.stringify(body),
      });
    };

    it('should handle database errors during job creation', async () => {
      mockPrisma.cadenceJob.create.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createAuthenticatedRequest({
        type: 'monthly_close',
        period: '2025-08',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Database connection failed');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/jobs/cadence/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-secret-123',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should handle processing errors with partial results', async () => {
      const jobId = 'job-partial';
      
      mockPrisma.cadenceJob.create.mockResolvedValue({
        id: jobId,
        type: 'monthly_close',
        status: 'RUNNING',
      });

      // Simulate partial failure
      mockRunMonthlyClose.mockResolvedValue({
        processedOrganizations: 3,
        realDataRecords: 2,
        estimatedRecords: 1,
        errors: [
          { organizationId: 'org-failed', error: 'Processing timeout' }
        ],
      });

      mockPrisma.cadenceJob.update.mockResolvedValue({
        id: jobId,
        status: 'COMPLETED_WITH_ERRORS',
      });

      const request = createAuthenticatedRequest({
        type: 'monthly_close',
        period: '2025-08',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('COMPLETED_WITH_ERRORS');
      expect(data.result.errors).toHaveLength(1);
      expect(data.result.errors[0].organizationId).toBe('org-failed');
    });
  });

  describe('Regeneration Jobs', () => {
    const createAuthenticatedRequest = (body: any) => {
      return new NextRequest('http://localhost/api/jobs/cadence/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-secret-123',
        },
        body: JSON.stringify(body),
      });
    };

    it('should handle regeneration requests', async () => {
      mockPrisma.cadenceJob.create.mockResolvedValue({
        id: 'job-regen',
        type: 'regeneration',
        status: 'RUNNING',
      });

      // For regeneration, we mock running both close and backfill
      mockRunMonthlyClose.mockResolvedValue({
        processedOrganizations: 1,
        realDataRecords: 1,
        estimatedRecords: 0,
        errors: [],
      });

      mockRunBackfillProcess.mockResolvedValue({
        backfilledRecords: 0,
        upgradedGrades: 0,
        regeneratedComputations: 5,
        errors: [],
      });

      mockPrisma.cadenceJob.update.mockResolvedValue({
        id: 'job-regen',
        status: 'COMPLETED',
      });

      const request = createAuthenticatedRequest({
        type: 'regeneration',
        period: '2025-08',
        organizationId: 'org-123',
        forceRecompute: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('COMPLETED');
      expect(data.result.closeResult).toBeDefined();
      expect(data.result.backfillResult).toBeDefined();
      
      expect(mockRunMonthlyClose).toHaveBeenCalledWith(
        '2025-08',
        'org-123',
        true
      );
      expect(mockRunBackfillProcess).toHaveBeenCalledWith('2025-08');
    });
  });

  describe('Health Check', () => {
    it('should handle GET requests as health check', async () => {
      const request = new NextRequest('http://localhost/api/jobs/cadence/run', {
        method: 'GET',
      });

      const response = await POST(request); // POST handler will return method not allowed
      
      // Since we only have POST handler, GET should fail
      expect(response.status).toBe(405);
    });
  });

  describe('Concurrent Jobs', () => {
    const createAuthenticatedRequest = (body: any) => {
      return new NextRequest('http://localhost/api/jobs/cadence/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-secret-123',
        },
        body: JSON.stringify(body),
      });
    };

    it('should handle multiple simultaneous requests', async () => {
      // Mock two different jobs
      mockPrisma.cadenceJob.create
        .mockResolvedValueOnce({
          id: 'job-1',
          type: 'monthly_close',
          status: 'RUNNING',
        })
        .mockResolvedValueOnce({
          id: 'job-2',
          type: 'backfill',
          status: 'RUNNING',
        });

      mockRunMonthlyClose.mockResolvedValue({
        processedOrganizations: 5,
        realDataRecords: 4,
        estimatedRecords: 1,
        errors: [],
      });

      mockRunBackfillProcess.mockResolvedValue({
        backfilledRecords: 2,
        upgradedGrades: 2,
        regeneratedComputations: 4,
        errors: [],
      });

      mockPrisma.cadenceJob.update
        .mockResolvedValueOnce({
          id: 'job-1',
          status: 'COMPLETED',
        })
        .mockResolvedValueOnce({
          id: 'job-2',
          status: 'COMPLETED',
        });

      const request1 = createAuthenticatedRequest({
        type: 'monthly_close',
        period: '2025-08',
      });

      const request2 = createAuthenticatedRequest({
        type: 'backfill',
        period: '2025-08',
      });

      // Run both requests concurrently
      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2),
      ]);

      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json(),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data1.jobId).toBe('job-1');
      expect(data2.jobId).toBe('job-2');
    });
  });
});
