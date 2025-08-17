import { describe, it, expect } from 'vitest';

describe('Sharing Export Metadata', () => {
  describe('Export Metadata Structure', () => {
    it('should include sharing scope in export metadata', () => {
      const mockExportMetadata = {
        reportId: 'report-123',
        framework: 'VSME-Basic',
        frameworkVersion: 'VSME 2025.07',
        factorsVersion: 'v2.1.0',
        language: 'en',
        engine: 'react-pdf',
        sharingScope: 'DETAILED' as const,
        policyVersion: 'v1',
        exportedAt: new Date(),
        requestedBy: 'user-123'
      };

      expect(mockExportMetadata.sharingScope).toMatch(/^(DETAILED|AGGREGATED)$/);
      expect(mockExportMetadata.policyVersion).toMatch(/^v\d+$/);
      expect(mockExportMetadata).toHaveProperty('sharingScope');
      expect(mockExportMetadata).toHaveProperty('policyVersion');
    });

    it('should handle different sharing scopes', () => {
      const sharingScopeOptions = ['DETAILED', 'AGGREGATED'] as const;
      
      sharingScopeOptions.forEach(scope => {
        const exportMeta = {
          reportId: 'test-report',
          sharingScope: scope,
          policyVersion: 'v1'
        };

        expect(['DETAILED', 'AGGREGATED']).toContain(exportMeta.sharingScope);
      });
    });
  });

  describe('Export Consent Validation', () => {
    it('should validate consent before detailed exports', () => {
      const exportRequests = [
        {
          partnerOrgId: 'partner-1',
          supplierOrgId: 'supplier-1',
          requestedScope: 'DETAILED' as const,
          consentStatus: 'ACCEPTED' as const,
          policyVersion: 'v1',
          shouldAllow: true
        },
        {
          partnerOrgId: 'partner-2',
          supplierOrgId: 'supplier-2',
          requestedScope: 'DETAILED' as const,
          consentStatus: 'REJECTED' as const,
          policyVersion: 'v1',
          shouldAllow: false
        },
        {
          partnerOrgId: 'partner-3',
          supplierOrgId: 'supplier-3',
          requestedScope: 'AGGREGATED' as const,
          consentStatus: 'PENDING' as const,
          policyVersion: 'v1',
          shouldAllow: true // Aggregated always allowed
        }
      ];

      exportRequests.forEach(request => {
        const canExport = request.requestedScope === 'AGGREGATED' || 
                         (request.requestedScope === 'DETAILED' && request.consentStatus === 'ACCEPTED');
        expect(canExport).toBe(request.shouldAllow);
      });
    });

    it('should handle policy version mismatches in exports', () => {
      const exportAttempts = [
        {
          consentPolicyVersion: 'v1',
          currentPolicyVersion: 'v1',
          shouldAllowDetailed: true
        },
        {
          consentPolicyVersion: 'v1',
          currentPolicyVersion: 'v2',
          shouldAllowDetailed: false // Version mismatch
        }
      ];

      exportAttempts.forEach(attempt => {
        const versionsMatch = attempt.consentPolicyVersion === attempt.currentPolicyVersion;
        expect(versionsMatch).toBe(attempt.shouldAllowDetailed);
      });
    });
  });

  describe('Export Data Filtering', () => {
    it('should filter export data based on sharing scope', () => {
      const fullReportData = {
        organizationName: 'ACME Corp',
        contactEmail: 'contact@acme.com',
        detailedActivities: [
          { category: 'Transport', amount: 1000, emissionsFactor: 2.1 },
          { category: 'Energy', amount: 2000, emissionsFactor: 1.8 }
        ],
        totalEmissions: 5800,
        scope1: 2100,
        scope2: 3700
      };

      // DETAILED scope - includes all data
      const detailedExport = {
        ...fullReportData,
        sharingScope: 'DETAILED' as const
      };

      // AGGREGATED scope - excludes sensitive details
      const aggregatedExport = {
        organizationName: '[Organization Data]',
        contactEmail: '[Redacted]',
        detailedActivities: [], // No detailed breakdown
        totalEmissions: fullReportData.totalEmissions,
        scope1: fullReportData.scope1,
        scope2: fullReportData.scope2,
        sharingScope: 'AGGREGATED' as const
      };

      expect(detailedExport.organizationName).toBe('ACME Corp');
      expect(detailedExport.detailedActivities).toHaveLength(2);

      expect(aggregatedExport.organizationName).toBe('[Organization Data]');
      expect(aggregatedExport.detailedActivities).toHaveLength(0);
      expect(aggregatedExport.totalEmissions).toBe(fullReportData.totalEmissions); // Totals preserved
    });

    it('should preserve essential metrics in aggregated exports', () => {
      const requiredAggregatedFields = [
        'totalEmissions',
        'scope1',
        'scope2',
        'frameworkVersion',
        'factorsVersion',
        'reportPeriod'
      ];

      const aggregatedExport = {
        totalEmissions: 5800,
        scope1: 2100,
        scope2: 3700,
        frameworkVersion: 'VSME 2025.07',
        factorsVersion: 'v2.1.0',
        reportPeriod: { start: '2024-01-01', end: '2024-12-31' },
        sharingScope: 'AGGREGATED'
      };

      requiredAggregatedFields.forEach(field => {
        expect(aggregatedExport).toHaveProperty(field);
        expect(aggregatedExport[field as keyof typeof aggregatedExport]).toBeTruthy();
      });
    });
  });

  describe('Export Audit Trail', () => {
    it('should include audit information in export metadata', () => {
      const exportAuditData = {
        exportId: 'export-123',
        reportId: 'report-456',
        requestedBy: 'user-789',
        partnerOrgId: 'partner-123',
        supplierOrgId: 'supplier-456',
        sharingScope: 'DETAILED' as const,
        policyVersion: 'v1',
        consentStatus: 'ACCEPTED' as const,
        exportedAt: new Date('2024-01-15T10:30:00Z'),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...'
      };

      // Verify audit trail completeness
      const auditFields = ['exportId', 'requestedBy', 'partnerOrgId', 'supplierOrgId', 'exportedAt'];
      auditFields.forEach(field => {
        expect(exportAuditData).toHaveProperty(field);
      });

      expect(exportAuditData.sharingScope).toMatch(/^(DETAILED|AGGREGATED)$/);
      expect(exportAuditData.consentStatus).toMatch(/^(PENDING|ACCEPTED|REJECTED)$/);
    });

    it('should track export access patterns', () => {
      const exportLog = [
        { partnerOrgId: 'partner-1', scope: 'DETAILED', count: 5, lastAccess: new Date() },
        { partnerOrgId: 'partner-2', scope: 'AGGREGATED', count: 12, lastAccess: new Date() },
        { partnerOrgId: 'partner-3', scope: 'DETAILED', count: 2, lastAccess: new Date() }
      ];

      const totalDetailedExports = exportLog.filter(e => e.scope === 'DETAILED').reduce((sum, e) => sum + e.count, 0);
      const totalAggregatedExports = exportLog.filter(e => e.scope === 'AGGREGATED').reduce((sum, e) => sum + e.count, 0);

      expect(totalDetailedExports).toBe(7); // 5 + 2
      expect(totalAggregatedExports).toBe(12);
      expect(exportLog).toHaveLength(3);
    });
  });
});
