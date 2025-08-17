/**
 * CSV Ingestion API Endpoint
 * POST /api/ingest/csv
 * 
 * Handles CSV file uploads for utility reading data.
 * Requires EDITOR+ permissions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processCSVFile, validateCSVFile, type CSVProcessingResult } from '@/lib/ingestion/csv';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Request validation schema
const CSVIngestSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  dryRun: z.boolean().optional().default(false),
  validateOnly: z.boolean().optional().default(false)
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // TODO: Check RBAC permissions (EDITOR+)
    // This would integrate with the RBAC system from previous PRs
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const supplierId = formData.get('supplierId') as string;
    const dryRun = formData.get('dryRun') === 'true';
    const validateOnly = formData.get('validateOnly') === 'true';

    // Validate request
    const validationResult = CSVIngestSchema.safeParse({
      supplierId,
      dryRun,
      validateOnly
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileValidation = validateCSVFile(file);
    if (!fileValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Invalid file',
          details: fileValidation.errors
        },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();
    
    // Process CSV
    const result: CSVProcessingResult = await processCSVFile(
      content,
      validationResult.data.supplierId,
      {
        dryRun: validationResult.data.dryRun,
        validateOnly: validationResult.data.validateOnly
      }
    );

    // Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          processedRows: result.processedRows,
          duplicateRows: result.duplicateRows,
          documentId: result.documentId,
          readingIds: result.readingIds,
          message: getSuccessMessage(result, validationResult.data)
        }
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Processing failed',
          details: result.errors
        },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('CSV ingestion error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate success message based on processing result
 */
function getSuccessMessage(
  result: CSVProcessingResult,
  options: { dryRun: boolean; validateOnly: boolean; supplierId: string }
): string {
  if (options.validateOnly) {
    return `CSV validation successful. ${result.processedRows} rows would be processed.`;
  }
  
  if (options.dryRun) {
    return `Dry run completed. ${result.processedRows} rows would be processed, ${result.duplicateRows} duplicates detected.`;
  }
  
  if (result.duplicateRows > 0) {
    return `Processing completed. ${result.processedRows} new rows processed, ${result.duplicateRows} duplicates skipped.`;
  }
  
  return `Processing completed successfully. ${result.processedRows} rows processed.`;
}

// Rate limiting would be applied here via middleware
// Content-Type validation handled by Next.js multipart parsing
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for large CSV processing
