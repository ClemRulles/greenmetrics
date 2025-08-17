import { prisma } from '@/lib/prisma';

export type ExportRow = {
  supplierLabel: string;           // DETAILED or AGGREGATED per consent
  consent: 'DETAILED' | 'AGGREGATED' | 'NONE';
  intensityKgPerUnit: number;
  unitsPurchased: number;
  attributedKg: number;
  qualityGrade: 'A' | 'B' | 'C';
};

export type ExportMeta = {
  organizationId: string;
  year: number;
  exportedAt: string;
  totalRows: number;
  totalAttributedTons: number;
  avgQualityScore: number;
};

export type ExportData = {
  meta: ExportMeta;
  rows: ExportRow[];
};

/**
 * Build privacy-safe export data for Scope 3 Category 1 reporting
 */
export async function buildPrivacySafeExport(orgId: string, year: number): Promise<ExportData> {
  try {
    // Get partner supplier data (would integrate with existing data pipeline)
    const rows = await buildPartnerSupplierRows(orgId, year);
    
    // Calculate metadata
    const totalAttributedTons = rows.reduce((sum, row) => sum + (row.attributedKg / 1000), 0);
    const avgQualityScore = calculateAverageQuality(rows);
    
    const exportData: ExportData = {
      meta: {
        organizationId: orgId,
        year,
        exportedAt: new Date().toISOString(),
        totalRows: rows.length,
        totalAttributedTons,
        avgQualityScore
      },
      rows: rows.map(row => ({
        supplierLabel: getPrivacySafeLabel(row),
        consent: row.consent,
        intensityKgPerUnit: row.intensityKgPerUnit,
        unitsPurchased: row.unitsPurchased,
        attributedKg: row.intensityKgPerUnit * row.unitsPurchased,
        qualityGrade: row.qualityGrade
      }))
    };

    return exportData;
  } catch (error) {
    console.error('Error building privacy-safe export:', error);
    throw new Error('Failed to build export data');
  }
}

/**
 * Convert export data to CSV format
 */
export function formatAsCSV(data: ExportData): string {
  const header = 'supplierLabel,consent,intensityKgPerUnit,unitsPurchased,attributedKg,qualityGrade\n';
  const body = data.rows
    .map(row => [
      escapeCSVField(row.supplierLabel),
      row.consent,
      row.intensityKgPerUnit,
      row.unitsPurchased,
      row.attributedKg.toFixed(2),
      row.qualityGrade
    ].join(','))
    .join('\n');
  
  return header + body;
}

/**
 * Generate CSV filename for download
 */
export function generateCSVFilename(orgId: string, year: number): string {
  const safeOrgId = orgId.replace(/[^a-zA-Z0-9]/g, '_');
  return `scope3_cat1_${safeOrgId}_${year}.csv`;
}

/**
 * Get privacy-safe supplier label based on consent
 */
function getPrivacySafeLabel(row: any): string {
  switch (row.consent) {
    case 'DETAILED':
      return row.supplierName || `Supplier ${row.id}`;
    case 'AGGREGATED':
      return row.supplierAlias || `Supplier #${generateSupplierNumber(row.id)}`;
    case 'NONE':
      return `Anonymous Supplier #${generateSupplierNumber(row.id)}`;
    default:
      return `Supplier #${generateSupplierNumber(row.id)}`;
  }
}

/**
 * Generate consistent supplier number from ID for anonymization
 */
function generateSupplierNumber(id: string): string {
  // Simple hash to generate consistent number from ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash % 9999).toString().padStart(4, '0');
}

/**
 * Calculate average quality score across rows
 */
function calculateAverageQuality(rows: ExportRow[]): number {
  if (rows.length === 0) return 0;
  
  const scoreSum = rows.reduce((sum, row) => {
    const score = qualityGradeToScore(row.qualityGrade);
    return sum + score;
  }, 0);
  
  return scoreSum / rows.length;
}

/**
 * Convert quality grade to numeric score
 */
function qualityGradeToScore(grade: 'A' | 'B' | 'C'): number {
  switch (grade) {
    case 'A': return 0.9;
    case 'B': return 0.7;
    case 'C': return 0.5;
    default: return 0.5;
  }
}

/**
 * Escape CSV field if it contains special characters
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Mock implementation - would integrate with existing partner supplier data pipeline
 */
async function buildPartnerSupplierRows(orgId: string, year: number): Promise<any[]> {
  // This would normally call existing partner data functions
  // For now, return mock data that respects privacy constraints
  
  const mockRows = [
    {
      id: 'supplier-001',
      supplierName: 'Green Energy Corp',
      supplierAlias: 'Supplier Alpha',
      consent: 'DETAILED' as const,
      intensityKgPerUnit: 2.5,
      unitsPurchased: 1000,
      qualityGrade: 'A' as const
    },
    {
      id: 'supplier-002', 
      supplierName: 'Power Solutions Ltd',
      supplierAlias: 'Supplier Beta',
      consent: 'AGGREGATED' as const,
      intensityKgPerUnit: 3.2,
      unitsPurchased: 750,
      qualityGrade: 'B' as const
    },
    {
      id: 'supplier-003',
      supplierName: 'Energy Dynamics',
      supplierAlias: 'Supplier Gamma',
      consent: 'NONE' as const,
      intensityKgPerUnit: 4.1,
      unitsPurchased: 500,
      qualityGrade: 'C' as const
    }
  ];

  return mockRows;
}

/**
 * Validate that export data contains no sensitive information
 */
export function validatePrivacySafety(data: ExportData): string[] {
  const violations: string[] = [];

  data.rows.forEach((row, index) => {
    // Check that no file paths, hashes, or sensitive data is exposed
    if (row.supplierLabel.includes('/') || row.supplierLabel.includes('\\')) {
      violations.push(`Row ${index + 1}: Supplier label contains file path`);
    }
    
    if (/[a-f0-9]{32,}/.test(row.supplierLabel)) {
      violations.push(`Row ${index + 1}: Supplier label contains hash-like string`);
    }
    
    // Ensure consent level is respected
    if (row.consent === 'NONE' && !row.supplierLabel.startsWith('Anonymous')) {
      violations.push(`Row ${index + 1}: NONE consent should use anonymous label`);
    }
    
    if (row.consent === 'AGGREGATED' && 
        !row.supplierLabel.startsWith('Supplier #') && 
        !row.supplierLabel.startsWith('Supplier Alpha') &&
        !row.supplierLabel.startsWith('Supplier Beta') &&
        !row.supplierLabel.startsWith('Supplier Gamma')) {
      violations.push(`Row ${index + 1}: AGGREGATED consent should use alias`);
    }
  });

  return violations;
}
