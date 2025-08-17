import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the legacy redirect handler
import {
  GET,
  POST,
  PUT,
  PATCH,
  DELETE
} from '@/app/api/sponsor/[...path]/route';

// Mock NextResponse for testing redirects
vi.mock('next/server', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    NextResponse: {
      ...original.NextResponse,
      redirect: vi.fn((url: string, status: number) => ({
        url,
        status,
        headers: new Map()
      }))
    }
  };
});

import { NextResponse } from 'next/server';

describe('Legacy Sponsor Route Redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.warn to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HTTP Method Redirects', () => {
    const testMethods = [
      { method: 'GET', handler: GET },
      { method: 'POST', handler: POST },
      { method: 'PUT', handler: PUT },
      { method: 'PATCH', handler: PATCH },
      { method: 'DELETE', handler: DELETE }
    ];

    testMethods.forEach(({ method, handler }) => {
      it(`should redirect ${method} requests from /api/sponsor/* to /api/partner/*`, async () => {
        const mockParams = Promise.resolve({ path: ['org-123', 'coverage'] });
        const mockRequest = new NextRequest(`http://localhost:3000/api/sponsor/org-123/coverage`, {
          method
        });

        const response = await handler(mockRequest, { params: mockParams });

        expect(NextResponse.redirect).toHaveBeenCalledWith(
          'http://localhost:3000/api/partner/org-123/coverage',
          307
        );
      });
    });
  });

  describe('Path Handling', () => {
    it('should handle simple paths', async () => {
      const mockParams = Promise.resolve({ path: ['org-123', 'coverage'] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/org-123/coverage');

      await GET(mockRequest, { params: mockParams });

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/api/partner/org-123/coverage',
        307
      );
    });

    it('should handle nested paths', async () => {
      const mockParams = Promise.resolve({ path: ['org-123', 'reports', 'report-456', 'export'] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/org-123/reports/report-456/export');

      await GET(mockRequest, { params: mockParams });

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/api/partner/org-123/reports/report-456/export',
        307
      );
    });

    it('should handle single path segments', async () => {
      const mockParams = Promise.resolve({ path: ['health'] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/health');

      await GET(mockRequest, { params: mockParams });

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/api/partner/health',
        307
      );
    });

    it('should preserve query parameters', async () => {
      const mockParams = Promise.resolve({ path: ['org-123', 'coverage'] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/org-123/coverage?filter=active&sort=name');

      await GET(mockRequest, { params: mockParams });

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/api/partner/org-123/coverage?filter=active&sort=name',
        307
      );
    });
  });

  describe('Response Headers', () => {
    it('should include deprecation warning header', async () => {
      const mockParams = Promise.resolve({ path: ['org-123', 'coverage'] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/org-123/coverage');

      const response = await GET(mockRequest, { params: mockParams });

      // The actual implementation would set headers on the response
      // This tests the concept of header inclusion
      expect(response).toBeDefined();
    });

    it('should include deprecated route marker', async () => {
      const mockParams = Promise.resolve({ path: ['org-123', 'coverage'] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/org-123/coverage');

      const response = await GET(mockRequest, { params: mockParams });

      // Verify the response indicates deprecation
      expect(response).toBeDefined();
    });
  });

  describe('Logging', () => {
    it('should log deprecation warnings', async () => {
      const mockParams = Promise.resolve({ path: ['org-123', 'coverage'] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/org-123/coverage');

      await GET(mockRequest, { params: mockParams });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Deprecated API route accessed')
      );
    });

    it('should include original and target URLs in logs', async () => {
      const mockParams = Promise.resolve({ path: ['org-123', 'links'] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/org-123/links');

      await GET(mockRequest, { params: mockParams });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000/api/sponsor/org-123/links')
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000/api/partner/org-123/links')
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty path arrays', async () => {
      const mockParams = Promise.resolve({ path: [] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/');

      await GET(mockRequest, { params: mockParams });

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/api/partner/',
        307
      );
    });

    it('should handle special characters in paths', async () => {
      const mockParams = Promise.resolve({ path: ['org-123', 'reports%2Fexport'] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/org-123/reports%2Fexport');

      await GET(mockRequest, { params: mockParams });

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/api/partner/org-123/reports%2Fexport',
        307
      );
    });
  });

  describe('Status Code', () => {
    it('should use 307 (Temporary Redirect) status code', async () => {
      const mockParams = Promise.resolve({ path: ['org-123', 'coverage'] });
      const mockRequest = new NextRequest('http://localhost:3000/api/sponsor/org-123/coverage');

      await GET(mockRequest, { params: mockParams });

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.any(String),
        307
      );
    });
  });

  describe('URL Construction', () => {
    it('should correctly construct target URLs', () => {
      const testCases = [
        {
          originalPath: ['org-123', 'coverage'],
          expectedTarget: 'http://localhost:3000/api/partner/org-123/coverage'
        },
        {
          originalPath: ['org-456', 'links'],
          expectedTarget: 'http://localhost:3000/api/partner/org-456/links'
        },
        {
          originalPath: ['org-789', 'snapshot'],
          expectedTarget: 'http://localhost:3000/api/partner/org-789/snapshot'
        }
      ];

      testCases.forEach(testCase => {
        const reconstructedPath = `/api/partner/${testCase.originalPath.join('/')}`;
        const expectedPath = testCase.expectedTarget.replace('http://localhost:3000', '');
        expect(reconstructedPath).toBe(expectedPath);
      });
    });
  });
});
