/**
 * Google Drive Ingestion Module
 * 
 * Handles Google Drive webhook notifications for utility document uploads.
 * Processes file change events and queues parsing jobs.
 */

import { z } from 'zod';
import { 
  generateDocumentHash, 
  checkDuplicateDocument,
  normalizePeriodMonth,
  type DocumentIdentifier 
} from './deduplication';

// Google Drive webhook notification schema
export const DriveWebhookSchema = z.object({
  kind: z.literal('api#channel'),
  id: z.string().min(1, 'Channel ID is required'),
  resourceId: z.string().min(1, 'Resource ID is required'),
  resourceUri: z.string().url('Invalid resource URI'),
  token: z.string().optional(),
  expiration: z.string().optional(),
  type: z.enum(['sync', 'add', 'remove', 'update', 'move', 'trash', 'untrash']),
  address: z.string().url('Invalid callback address')
});

export type DriveWebhookPayload = z.infer<typeof DriveWebhookSchema>;

// Drive file metadata schema
export const DriveFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.string().optional(),
  createdTime: z.string().datetime(),
  modifiedTime: z.string().datetime(),
  parents: z.array(z.string()).optional(),
  webViewLink: z.string().url().optional(),
  downloadUrl: z.string().url().optional()
});

export type DriveFileMetadata = z.infer<typeof DriveFileSchema>;

export interface DriveProcessingResult {
  success: boolean;
  channelId: string;
  resourceId: string;
  fileId?: string;
  documentId?: string;
  queued: boolean;
  errors: string[];
}

/**
 * Supported file types for utility documents
 */
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

/**
 * File patterns for utility document detection
 */
export const UTILITY_FILE_PATTERNS = [
  // French utility patterns
  /facture.*edf/i,
  /facture.*engie/i,
  /facture.*électricité/i,
  /facture.*gaz/i,
  /bill.*electricity/i,
  /bill.*gas/i,
  /invoice.*utility/i,
  /reçu.*carburant/i,
  /fuel.*receipt/i,
  // Generic patterns
  /utility/i,
  /energie/i,
  /consumption/i,
  /consommation/i
];

/**
 * Process Google Drive webhook notification
 */
export async function processeDriveWebhook(
  payload: DriveWebhookPayload
): Promise<DriveProcessingResult> {
  const result: DriveProcessingResult = {
    success: false,
    channelId: payload.id,
    resourceId: payload.resourceId,
    queued: false,
    errors: []
  };

  try {
    // Only process file additions and updates
    if (!['add', 'update'].includes(payload.type)) {
      result.success = true;
      result.errors.push(`Ignoring event type: ${payload.type}`);
      return result;
    }

    // Extract file ID from resource URI
    const fileId = extractFileIdFromUri(payload.resourceUri);
    if (!fileId) {
      result.errors.push('Could not extract file ID from resource URI');
      return result;
    }

    result.fileId = fileId;

    // Get file metadata from Google Drive API
    const fileMetadata = await getFileMetadata(fileId);
    if (!fileMetadata) {
      result.errors.push('Could not retrieve file metadata');
      return result;
    }

    // Check if file is a utility document
    if (!isUtilityDocument(fileMetadata)) {
      result.success = true;
      result.errors.push('File does not appear to be a utility document');
      return result;
    }

    // Check file type support
    if (!SUPPORTED_MIME_TYPES.includes(fileMetadata.mimeType)) {
      result.errors.push(`Unsupported file type: ${fileMetadata.mimeType}`);
      return result;
    }

    // Create document record and queue parsing job
    const documentId = await createDriveDocument(fileMetadata);
    result.documentId = documentId;
    result.queued = true;
    result.success = true;

  } catch (error) {
    result.errors.push(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Extract file ID from Google Drive resource URI
 */
function extractFileIdFromUri(resourceUri: string): string | null {
  // URI format: https://www.googleapis.com/drive/v3/files/FILE_ID?alt=json
  const match = resourceUri.match(/\/files\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Check if file appears to be a utility document
 */
function isUtilityDocument(metadata: DriveFileMetadata): boolean {
  const filename = metadata.name.toLowerCase();
  
  return UTILITY_FILE_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Get file metadata from Google Drive API
 */
async function getFileMetadata(fileId: string): Promise<DriveFileMetadata | null> {
  try {
    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      throw new Error('Could not obtain Google access token');
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();
    return DriveFileSchema.parse(data);
  } catch (error) {
    console.error('Failed to get file metadata:', error);
    return null;
  }
}

/**
 * Get Google access token for API calls
 */
async function getGoogleAccessToken(): Promise<string | null> {
  try {
    // In production, this would use OAuth2 or service account credentials
    // For now, return a placeholder
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    
    if (!clientEmail || !privateKey) {
      console.warn('Google service account credentials not configured');
      return null;
    }

    // Implement JWT-based service account authentication
    // This is a simplified version - production would use google-auth-library
    return process.env.GOOGLE_ACCESS_TOKEN || null;
  } catch (error) {
    console.error('Failed to get Google access token:', error);
    return null;
  }
}

/**
 * Create document record for Drive file
 */
async function createDriveDocument(
  metadata: DriveFileMetadata
): Promise<string> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Generate hash for deduplication (using file ID + size + modified time)
    const content = `${metadata.id}_${metadata.size}_${metadata.modifiedTime}`;
    const supplierId = extractSupplierFromFilename(metadata.name);
    const periodMonth = extractPeriodFromFilename(metadata.name);

    const documentIdentifier: DocumentIdentifier = {
      content,
      supplierId,
      periodMonth
    };

    const hash = generateDocumentHash(documentIdentifier);

    // Check for duplicates
    const existingDoc = await checkDuplicateDocument(hash);
    if (existingDoc.isDuplicate && existingDoc.existingDocumentId) {
      return existingDoc.existingDocumentId;
    }

    // Determine meter type and unit from filename
    const { meterType, unit } = inferMeterTypeFromFilename(metadata.name);

    // Create document record
    const document = await (prisma as any).document?.create({
      data: {
        supplierId,
        source: 'DRIVE',
        sha256: hash,
        periodStart: new Date(), // Will be updated during parsing
        periodEnd: new Date(),   // Will be updated during parsing
        meterType: meterType.toUpperCase(),
        unit,
        pages: [metadata.id], // Store Drive file ID as page reference
        storageKey: `drive/${metadata.id}`,
        status: 'PENDING'
      }
    });

    await prisma.$disconnect();
    return document.id;
  } catch (error) {
    throw new Error(`Failed to create Drive document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract supplier from filename
 */
function extractSupplierFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  
  if (lower.includes('edf')) return 'edf';
  if (lower.includes('engie')) return 'engie';
  if (lower.includes('total')) return 'total';
  if (lower.includes('shell')) return 'shell';
  if (lower.includes('bp')) return 'bp';
  
  return 'unknown';
}

/**
 * Extract period from filename
 */
function extractPeriodFromFilename(filename: string): string {
  // Look for date patterns in filename
  const datePatterns = [
    /(\d{4})-(\d{1,2})/,  // YYYY-MM
    /(\d{1,2})-(\d{4})/,  // MM-YYYY
    /(\d{4})(\d{2})/,     // YYYYMM
    /(\d{2})(\d{4})/      // MMYYYY
  ];

  for (const pattern of datePatterns) {
    const match = filename.match(pattern);
    if (match) {
      const [, part1, part2] = match;
      // Determine which part is year vs month
      const year = part1.length === 4 ? part1 : part2;
      const month = part1.length === 2 ? part1 : part2;
      return `${year}-${month.padStart(2, '0')}`;
    }
  }

  // Default to current month
  return normalizePeriodMonth(new Date());
}

/**
 * Infer meter type and unit from filename
 */
function inferMeterTypeFromFilename(filename: string): {
  meterType: 'electricity' | 'gas' | 'fuel';
  unit: string;
} {
  const lower = filename.toLowerCase();
  
  if (lower.includes('electricité') || lower.includes('electricity') || lower.includes('kwh')) {
    return { meterType: 'electricity', unit: 'kWh' };
  }
  
  if (lower.includes('gaz') || lower.includes('gas') || lower.includes('m³')) {
    return { meterType: 'gas', unit: 'm³' };
  }
  
  if (lower.includes('carburant') || lower.includes('fuel') || lower.includes('litre')) {
    return { meterType: 'fuel', unit: 'L' };
  }
  
  // Default to electricity
  return { meterType: 'electricity', unit: 'kWh' };
}

/**
 * Queue parsing job for document
 */
export async function queueParsingJob(
  documentId: string,
  fileId: string,
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<void> {
  try {
    // In production, this would integrate with a job queue like Bull/BullMQ
    // For now, log the job request
    console.log(`Queuing parsing job for document ${documentId}, file ${fileId}, priority: ${priority}`);
    
    // TODO: Implement actual job queue integration
    // await jobQueue.add('parse-document', {
    //   documentId,
    //   fileId,
    //   priority
    // });
  } catch (error) {
    console.error('Failed to queue parsing job:', error);
    throw error;
  }
}
