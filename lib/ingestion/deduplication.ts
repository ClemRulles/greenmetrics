/**
 * Data Ingestion Deduplication & Hashing Utilities
 * 
 * Provides SHA256-based duplicate detection for documents across all ingestion sources.
 * Hash formula: sha256(content + supplierId + invoiceNo + periodMonth)
 */

import crypto from 'crypto';

export interface DocumentIdentifier {
  content: string | Buffer;
  supplierId: string;
  invoiceNo?: string;
  periodMonth: string; // YYYY-MM format
}

export interface DeduplicationResult {
  hash: string;
  isDuplicate: boolean;
  existingDocumentId?: string;
}

/**
 * Generate SHA256 hash for document deduplication
 */
export function generateDocumentHash(identifier: DocumentIdentifier): string {
  const { content, supplierId, invoiceNo = '', periodMonth } = identifier;
  
  // Normalize content to buffer
  const contentBuffer = Buffer.isBuffer(content) 
    ? content 
    : Buffer.from(content, 'utf-8');
  
  // Create deterministic hash input
  const hashInput = Buffer.concat([
    contentBuffer,
    Buffer.from(supplierId, 'utf-8'),
    Buffer.from(invoiceNo, 'utf-8'),
    Buffer.from(periodMonth, 'utf-8')
  ]);
  
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Check if document already exists by hash
 */
export async function checkDuplicateDocument(
  hash: string
): Promise<DeduplicationResult> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Note: Document model will be available after migration
    const existingDocument = await (prisma as any).document?.findUnique({
      where: { sha256: hash },
      select: { id: true }
    });
    
    await prisma.$disconnect();
    
    return {
      hash,
      isDuplicate: !!existingDocument,
      existingDocumentId: existingDocument?.id
    };
  } catch (error) {
    console.error('Error checking document duplicate:', error);
    throw new Error('Failed to check document duplication');
  }
}

/**
 * Normalize period to YYYY-MM format
 */
export function normalizePeriodMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Extract period month from date range
 */
export function extractPeriodMonth(periodStart: Date, periodEnd: Date): string {
  // Use the start date as the primary period identifier
  return normalizePeriodMonth(periodStart);
}

/**
 * Validate document identifier for hashing
 */
export function validateDocumentIdentifier(identifier: DocumentIdentifier): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!identifier.content || identifier.content.length === 0) {
    errors.push('Content cannot be empty');
  }
  
  if (!identifier.supplierId?.trim()) {
    errors.push('Supplier ID is required');
  }
  
  if (!identifier.periodMonth?.match(/^\d{4}-\d{2}$/)) {
    errors.push('Period month must be in YYYY-MM format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create document hash with validation
 */
export async function createDocumentHash(
  identifier: DocumentIdentifier
): Promise<DeduplicationResult> {
  // Validate identifier
  const validation = validateDocumentIdentifier(identifier);
  if (!validation.isValid) {
    throw new Error(`Invalid document identifier: ${validation.errors.join(', ')}`);
  }
  
  // Generate hash
  const hash = generateDocumentHash(identifier);
  
  // Check for duplicates
  return await checkDuplicateDocument(hash);
}

/**
 * Batch check for duplicate documents
 */
export async function checkBatchDuplicates(
  identifiers: DocumentIdentifier[]
): Promise<DeduplicationResult[]> {
  const hashes = identifiers.map(generateDocumentHash);
  
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Note: Document model will be available after migration
    const existingDocuments = await (prisma as any).document?.findMany({
      where: { sha256: { in: hashes } },
      select: { id: true, sha256: true }
    }) || [];
    
    await prisma.$disconnect();
    
    const existingHashMap = new Map(
      existingDocuments.map((doc: any) => [doc.sha256, doc.id])
    );
    
    return hashes.map(hash => ({
      hash,
      isDuplicate: existingHashMap.has(hash),
      existingDocumentId: existingHashMap.get(hash) as string | undefined
    }));
  } catch (error) {
    console.error('Error checking batch duplicates:', error);
    throw new Error('Failed to check batch document duplication');
  }
}
