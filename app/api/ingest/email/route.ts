/**
 * Email Ingestion Webhook API Endpoint
 * POST /api/ingest/email
 * 
 * Handles inbound email webhooks from email processing services.
 * Processes utility bills and invoices sent via email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmailWebhookSchema, processEmailWebhook, type EmailProcessingResult } from '@/lib/ingestion/email';
import crypto from 'crypto';

// Webhook authentication header
const WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (if configured)
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-webhook-signature');
      if (!signature) {
        return NextResponse.json(
          { error: 'Missing webhook signature' },
          { status: 401 }
        );
      }

      const body = await request.text();
      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== `sha256=${expectedSignature}`) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }

      // Re-parse the body as JSON since we consumed it for signature verification
      const payload = JSON.parse(body);
      return await processEmailPayload(payload);
    } else {
      // No signature verification in development
      const payload = await request.json();
      return await processEmailPayload(payload);
    }

  } catch (error) {
    console.error('Email webhook error:', error);
    
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
 * Process the email webhook payload
 */
async function processEmailPayload(payload: any): Promise<NextResponse> {
  // Validate payload
  const validationResult = EmailWebhookSchema.safeParse(payload);
  if (!validationResult.success) {
    return NextResponse.json(
      { 
        error: 'Invalid payload',
        details: validationResult.error.errors
      },
      { status: 400 }
    );
  }

  // Process email
  const result: EmailProcessingResult = await processEmailWebhook(validationResult.data);

  // Return result
  if (result.success) {
    return NextResponse.json({
      success: true,
      data: {
        messageId: result.messageId,
        documentId: result.documentId,
        matched: result.matched,
        templateUsed: result.templateUsed,
        attachmentsProcessed: result.attachmentsProcessed,
        message: getSuccessMessage(result)
      }
    });
  } else {
    return NextResponse.json(
      { 
        error: 'Processing failed',
        details: result.errors,
        messageId: result.messageId
      },
      { status: 422 }
    );
  }
}

/**
 * Generate success message based on processing result
 */
function getSuccessMessage(result: EmailProcessingResult): string {
  if (!result.matched) {
    return 'Email received but no template matched. Stored for manual review.';
  }
  
  if (result.documentId) {
    return `Email processed successfully using template '${result.templateUsed}'. Document created: ${result.documentId}`;
  }
  
  return 'Email processed successfully (duplicate detected).';
}

// Webhook endpoints should be publicly accessible but secured by signature
// Rate limiting would be applied here via middleware
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds for email processing
