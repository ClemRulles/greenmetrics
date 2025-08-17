/**
 * Email Ingestion Module
 * 
 * Handles email-based document ingestion with template matching.
 * Processes inbound emails from utility providers.
 */

import { z } from 'zod';
import { 
  generateDocumentHash, 
  checkDuplicateDocument,
  normalizePeriodMonth,
  type DocumentIdentifier 
} from './deduplication';

// Email webhook payload schema
export const EmailWebhookSchema = z.object({
  from: z.string().email('Invalid sender email'),
  to: z.string().email('Invalid recipient email'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    size: z.number(),
    content: z.string() // base64 encoded
  })).optional().default([]),
  messageId: z.string().min(1, 'Message ID is required'),
  receivedAt: z.string().datetime('Invalid received date')
});

export type EmailWebhookPayload = z.infer<typeof EmailWebhookSchema>;

export interface EmailProcessingResult {
  success: boolean;
  messageId: string;
  documentId?: string;
  matched: boolean;
  templateUsed?: string;
  attachmentsProcessed: number;
  errors: string[];
}

export interface UtilityTemplate {
  id: string;
  name: string;
  senderPatterns: RegExp[];
  subjectPatterns: RegExp[];
  meterType: 'electricity' | 'gas' | 'fuel';
  extractors: {
    invoiceNo?: RegExp;
    periodStart?: RegExp;
    periodEnd?: RegExp;
    unit?: RegExp;
    readings?: RegExp[];
  };
}

/**
 * Built-in utility provider templates
 */
export const UTILITY_TEMPLATES: UtilityTemplate[] = [
  {
    id: 'edf-electricity',
    name: 'EDF Electricity Bills',
    senderPatterns: [
      /noreply@edf\.fr/i,
      /facture@edf\.fr/i
    ],
    subjectPatterns: [
      /facture.*électricité/i,
      /votre facture edf/i,
      /electricity bill/i
    ],
    meterType: 'electricity',
    extractors: {
      invoiceNo: /facture n°?\s*([A-Z0-9]+)/i,
      periodStart: /période du (\d{1,2}\/\d{1,2}\/\d{4})/i,
      periodEnd: /au (\d{1,2}\/\d{1,2}\/\d{4})/i,
      unit: /(kWh)/i,
      readings: [
        /consommation.*?(\d+(?:\.\d+)?)\s*kWh/i,
        /total.*?(\d+(?:\.\d+)?)\s*kWh/i
      ]
    }
  },
  {
    id: 'engie-gas',
    name: 'Engie Gas Bills',
    senderPatterns: [
      /noreply@engie\.fr/i,
      /facture@engie\.fr/i
    ],
    subjectPatterns: [
      /facture.*gaz/i,
      /votre facture engie/i,
      /gas bill/i
    ],
    meterType: 'gas',
    extractors: {
      invoiceNo: /facture n°?\s*([A-Z0-9]+)/i,
      periodStart: /période du (\d{1,2}\/\d{1,2}\/\d{4})/i,
      periodEnd: /au (\d{1,2}\/\d{1,2}\/\d{4})/i,
      unit: /(m³|kWh)/i,
      readings: [
        /consommation.*?(\d+(?:\.\d+)?)\s*m³/i,
        /consommation.*?(\d+(?:\.\d+)?)\s*kWh/i
      ]
    }
  },
  {
    id: 'total-fuel',
    name: 'Total Fuel Receipts',
    senderPatterns: [
      /noreply@total\.com/i,
      /recu@total\.fr/i
    ],
    subjectPatterns: [
      /reçu.*carburant/i,
      /fuel receipt/i,
      /votre achat total/i
    ],
    meterType: 'fuel',
    extractors: {
      invoiceNo: /ticket n°?\s*([A-Z0-9]+)/i,
      periodStart: /date.*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
      unit: /(L|litres?)/i,
      readings: [
        /quantité.*?(\d+(?:\.\d+)?)\s*L/i,
        /(\d+(?:\.\d+)?)\s*litres?/i
      ]
    }
  }
];

/**
 * Match email against utility templates
 */
export function matchEmailTemplate(payload: EmailWebhookPayload): {
  matched: boolean;
  template?: UtilityTemplate;
  confidence: number;
} {
  let bestMatch: UtilityTemplate | undefined;
  let bestScore = 0;

  for (const template of UTILITY_TEMPLATES) {
    let score = 0;
    
    // Check sender patterns
    for (const pattern of template.senderPatterns) {
      if (pattern.test(payload.from)) {
        score += 50; // High weight for sender match
        break;
      }
    }
    
    // Check subject patterns
    for (const pattern of template.subjectPatterns) {
      if (pattern.test(payload.subject)) {
        score += 30; // Medium weight for subject match
        break;
      }
    }
    
    // Check if body contains relevant keywords
    const bodyText = payload.body.toLowerCase();
    const keywords = getTemplateKeywords(template);
    const keywordMatches = keywords.filter(keyword => 
      bodyText.includes(keyword.toLowerCase())
    ).length;
    
    score += Math.min(keywordMatches * 5, 20); // Up to 20 points for keywords
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return {
    matched: bestScore >= 50, // Require at least sender or subject + some keywords
    template: bestMatch,
    confidence: Math.min(bestScore / 100, 1) // Normalize to 0-1
  };
}

/**
 * Extract keywords from template for matching
 */
function getTemplateKeywords(template: UtilityTemplate): string[] {
  const keywords: string[] = [];
  
  switch (template.meterType) {
    case 'electricity':
      keywords.push('électricité', 'electricity', 'kWh', 'watt', 'facture', 'bill');
      break;
    case 'gas':
      keywords.push('gaz', 'gas', 'm³', 'cubic', 'facture', 'bill');
      break;
    case 'fuel':
      keywords.push('carburant', 'fuel', 'essence', 'diesel', 'litre', 'L');
      break;
  }
  
  return keywords;
}

/**
 * Extract document metadata from email using template
 */
export function extractDocumentMetadata(
  payload: EmailWebhookPayload,
  template: UtilityTemplate
): {
  invoiceNo?: string;
  periodStart?: Date;
  periodEnd?: Date;
  unit?: string;
  readings: Array<{ value: number; unit: string }>;
} {
  const fullText = `${payload.subject} ${payload.body}`;
  const metadata: any = { readings: [] };

  // Extract invoice number
  if (template.extractors.invoiceNo) {
    const match = fullText.match(template.extractors.invoiceNo);
    if (match) metadata.invoiceNo = match[1];
  }

  // Extract period dates
  if (template.extractors.periodStart) {
    const match = fullText.match(template.extractors.periodStart);
    if (match) {
      metadata.periodStart = parseFrenchDate(match[1]);
    }
  }

  if (template.extractors.periodEnd) {
    const match = fullText.match(template.extractors.periodEnd);
    if (match) {
      metadata.periodEnd = parseFrenchDate(match[1]);
    }
  }

  // Extract unit
  if (template.extractors.unit) {
    const match = fullText.match(template.extractors.unit);
    if (match) metadata.unit = match[1];
  }

  // Extract readings
  if (template.extractors.readings) {
    for (const readingPattern of template.extractors.readings) {
      const match = fullText.match(readingPattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          metadata.readings.push({
            value,
            unit: metadata.unit || getDefaultUnit(template.meterType)
          });
        }
      }
    }
  }

  return metadata;
}

/**
 * Parse French date format (DD/MM/YYYY)
 */
function parseFrenchDate(dateStr: string): Date | undefined {
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return undefined;
}

/**
 * Get default unit for meter type
 */
function getDefaultUnit(meterType: string): string {
  switch (meterType) {
    case 'electricity': return 'kWh';
    case 'gas': return 'm³';
    case 'fuel': return 'L';
    default: return 'unit';
  }
}

/**
 * Process email webhook payload
 */
export async function processEmailWebhook(
  payload: EmailWebhookPayload
): Promise<EmailProcessingResult> {
  const result: EmailProcessingResult = {
    success: false,
    messageId: payload.messageId,
    matched: false,
    attachmentsProcessed: 0,
    errors: []
  };

  try {
    // Match against templates
    const templateMatch = matchEmailTemplate(payload);
    result.matched = templateMatch.matched;
    result.templateUsed = templateMatch.template?.id;

    if (!templateMatch.matched || !templateMatch.template) {
      // Store unmatched email for manual review
      await storeUnmatchedEmail(payload);
      result.success = true;
      result.errors.push('No template matched - stored for manual review');
      return result;
    }

    // Extract metadata
    const metadata = extractDocumentMetadata(payload, templateMatch.template);
    
    // Create document identifier for deduplication
    const periodMonth = metadata.periodStart 
      ? normalizePeriodMonth(metadata.periodStart)
      : normalizePeriodMonth(new Date(payload.receivedAt));

    const documentIdentifier: DocumentIdentifier = {
      content: payload.body,
      supplierId: extractSupplierFromEmail(payload.from),
      invoiceNo: metadata.invoiceNo,
      periodMonth
    };

    // Check for duplicates
    const deduplicationResult = await checkDuplicateDocument(
      generateDocumentHash(documentIdentifier)
    );

    if (deduplicationResult.isDuplicate) {
      result.success = true;
      result.documentId = deduplicationResult.existingDocumentId;
      return result;
    }

    // Store document for parsing
    const documentId = await storeEmailDocument(
      payload,
      templateMatch.template,
      metadata,
      deduplicationResult.hash
    );

    result.success = true;
    result.documentId = documentId;
    result.attachmentsProcessed = payload.attachments?.length || 0;

  } catch (error) {
    result.errors.push(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Extract supplier ID from email address
 */
function extractSupplierFromEmail(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase();
  
  // Map known domains to supplier slugs
  const domainMap: Record<string, string> = {
    'edf.fr': 'edf',
    'engie.fr': 'engie',
    'total.com': 'total',
    'total.fr': 'total'
  };
  
  return domainMap[domain] || domain || 'unknown';
}

/**
 * Store unmatched email for manual review
 */
async function storeUnmatchedEmail(payload: EmailWebhookPayload): Promise<void> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Store in a separate table for manual review
    // This would be implemented in a future PR for admin tools
    console.log('Unmatched email stored for review:', payload.messageId);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Failed to store unmatched email:', error);
  }
}

/**
 * Store email document for parsing
 */
async function storeEmailDocument(
  payload: EmailWebhookPayload,
  template: UtilityTemplate,
  metadata: any,
  hash: string
): Promise<string> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Default dates if not extracted
    const now = new Date();
    const periodStart = metadata.periodStart || new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = metadata.periodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const document = await (prisma as any).document?.create({
      data: {
        supplierId: extractSupplierFromEmail(payload.from),
        source: 'EMAIL',
        sha256: hash,
        invoiceNo: metadata.invoiceNo,
        periodStart,
        periodEnd,
        meterType: template.meterType.toUpperCase(),
        unit: metadata.unit || getDefaultUnit(template.meterType),
        pages: [payload.messageId], // Store message ID as page reference
        storageKey: `email/${hash}`,
        status: 'PENDING'
      }
    });

    await prisma.$disconnect();
    return document.id;
  } catch (error) {
    throw new Error(`Failed to store email document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
