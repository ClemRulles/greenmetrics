/**
 * CSV Ingestion Module
 * 
 * Handles CSV file processing for utility reading data.
 * Schema: supplierSlug,site,year,month,meterType,unit,value,invoiceNo?
 */

import { z } from 'zod';
import { parse as parseCSV } from 'csv-parse/sync';
import { 
  generateDocumentHash, 
  checkDuplicateDocument, 
  normalizePeriodMonth,
  type DocumentIdentifier 
} from './deduplication';

// CSV row validation schema
export const CSVRowSchema = z.object({
  supplierSlug: z.string().min(1, 'Supplier slug is required'),
  site: z.string().min(1, 'Site is required'),
  year: z.string().regex(/^\d{4}$/, 'Year must be 4 digits'),
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'Month must be 1-12'),
  meterType: z.enum(['electricity', 'gas', 'fuel'], {
    errorMap: () => ({ message: 'Meter type must be electricity, gas, or fuel' })
  }),
  unit: z.string().min(1, 'Unit is required'),
  value: z.string().regex(/^\d+(\.\d+)?$/, 'Value must be a positive number'),
  invoiceNo: z.string().optional()
});

export type CSVRow = z.infer<typeof CSVRowSchema>;

export interface CSVProcessingResult {
  success: boolean;
  processedRows: number;
  duplicateRows: number;
  errors: string[];
  documentId?: string;
  readingIds: string[];
}

export interface ProcessedReading {
  siteId: string;
  month: Date;
  unit: string;
  value: number;
}

/**
 * Parse and validate CSV content
 */
export function parseCSVContent(content: string): {
  isValid: boolean;
  rows: CSVRow[];
  errors: string[];
} {
  const errors: string[] = [];
  let rows: any[] = [];

  try {
    // Parse CSV with headers
    rows = parseCSV(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (error) {
    return {
      isValid: false,
      rows: [],
      errors: [`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }

  // Validate each row
  const validatedRows: CSVRow[] = [];
  
  rows.forEach((row, index) => {
    try {
      const validated = CSVRowSchema.parse(row);
      validatedRows.push(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push(`Row ${index + 2}: ${err.path.join('.')} - ${err.message}`);
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    rows: validatedRows,
    errors
  };
}

/**
 * Convert CSV rows to Reading objects
 */
export function convertRowsToReadings(rows: CSVRow[]): ProcessedReading[] {
  return rows.map(row => {
    // Create date from year/month
    const year = parseInt(row.year);
    const month = parseInt(row.month);
    const readingDate = new Date(year, month - 1, 1); // First day of month

    return {
      siteId: row.site,
      month: readingDate,
      unit: row.unit,
      value: parseFloat(row.value)
    };
  });
}

/**
 * Process CSV file and create document/readings
 */
export async function processCSVFile(
  content: string,
  supplierId: string,
  options: {
    dryRun?: boolean;
    validateOnly?: boolean;
  } = {}
): Promise<CSVProcessingResult> {
  const { dryRun = false, validateOnly = false } = options;
  
  // Parse and validate CSV
  const parseResult = parseCSVContent(content);
  if (!parseResult.isValid) {
    return {
      success: false,
      processedRows: 0,
      duplicateRows: 0,
      errors: parseResult.errors,
      readingIds: []
    };
  }

  if (validateOnly) {
    return {
      success: true,
      processedRows: parseResult.rows.length,
      duplicateRows: 0,
      errors: [],
      readingIds: []
    };
  }

  // Group rows by invoice and period for deduplication
  const rowGroups = groupRowsForDeduplication(parseResult.rows);
  const results: CSVProcessingResult = {
    success: true,
    processedRows: 0,
    duplicateRows: 0,
    errors: [],
    readingIds: []
  };

  if (dryRun) {
    // Simulate processing without database operations
    results.processedRows = parseResult.rows.length;
    return results;
  }

  try {
    // Process each group (potential document)
    for (const group of rowGroups) {
      const groupResult = await processRowGroup(group, supplierId, content);
      
      results.processedRows += groupResult.processedRows;
      results.duplicateRows += groupResult.duplicateRows;
      results.errors.push(...groupResult.errors);
      results.readingIds.push(...groupResult.readingIds);
      
      if (groupResult.documentId && !results.documentId) {
        results.documentId = groupResult.documentId;
      }
    }
  } catch (error) {
    results.success = false;
    results.errors.push(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return results;
}

/**
 * Group CSV rows by invoice and period for document creation
 */
function groupRowsForDeduplication(rows: CSVRow[]): CSVRow[][] {
  const groups = new Map<string, CSVRow[]>();
  
  rows.forEach(row => {
    // Group by invoice number and year-month
    const groupKey = `${row.invoiceNo || 'no-invoice'}-${row.year}-${row.month}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(row);
  });
  
  return Array.from(groups.values());
}

/**
 * Process a group of rows that belong to the same document
 */
async function processRowGroup(
  rows: CSVRow[],
  supplierId: string,
  originalContent: string
): Promise<CSVProcessingResult> {
  const firstRow = rows[0];
  
  // Create document identifier for deduplication
  const periodMonth = `${firstRow.year}-${firstRow.month.padStart(2, '0')}`;
  const documentIdentifier: DocumentIdentifier = {
    content: originalContent,
    supplierId,
    invoiceNo: firstRow.invoiceNo,
    periodMonth
  };

  // Check for duplicates
  const deduplicationResult = await checkDuplicateDocument(
    generateDocumentHash(documentIdentifier)
  );

  if (deduplicationResult.isDuplicate) {
    return {
      success: true,
      processedRows: 0,
      duplicateRows: rows.length,
      errors: [],
      documentId: deduplicationResult.existingDocumentId,
      readingIds: []
    };
  }

  // Create new document and readings
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Create document
    const document = await (prisma as any).document?.create({
      data: {
        supplierId,
        source: 'CSV',
        sha256: deduplicationResult.hash,
        invoiceNo: firstRow.invoiceNo,
        periodStart: new Date(parseInt(firstRow.year), parseInt(firstRow.month) - 1, 1),
        periodEnd: new Date(parseInt(firstRow.year), parseInt(firstRow.month), 0), // Last day of month
        meterType: firstRow.meterType.toUpperCase(),
        unit: firstRow.unit,
        pages: [],
        storageKey: `csv/${deduplicationResult.hash}`,
        status: 'COMPLETED',
        parsedAt: new Date()
      }
    });

    // Create readings
    const readings = convertRowsToReadings(rows);
    const createdReadings = await Promise.all(
      readings.map(reading =>
        (prisma as any).reading?.create({
          data: {
            documentId: document.id,
            siteId: reading.siteId,
            month: reading.month,
            unit: reading.unit,
            value: reading.value
          }
        })
      )
    );

    await prisma.$disconnect();

    return {
      success: true,
      processedRows: rows.length,
      duplicateRows: 0,
      errors: [],
      documentId: document.id,
      readingIds: createdReadings.map((r: any) => r.id)
    };
  } catch (error) {
    return {
      success: false,
      processedRows: 0,
      duplicateRows: 0,
      errors: [`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      readingIds: []
    };
  }
}

/**
 * Validate CSV file size and format
 */
export function validateCSVFile(file: File): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check file type
  if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
    errors.push('File must be a CSV file');
  }
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size must be less than 10MB');
  }
  
  // Check if empty
  if (file.size === 0) {
    errors.push('File cannot be empty');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
