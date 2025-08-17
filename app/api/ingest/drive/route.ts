/**
 * Google Drive Ingestion Webhook API Endpoint
 * POST /api/ingest/drive
 * 
 * Handles Google Drive webhook notifications for file changes.
 * Processes utility documents uploaded to monitored Drive folders.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DriveWebhookSchema, processeDriveWebhook, type DriveProcessingResult } from '@/lib/ingestion/drive';
import crypto from 'crypto';

// Google Drive webhook authentication
const DRIVE_WEBHOOK_SECRET = process.env.DRIVE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify Google Drive webhook headers
    const channelId = request.headers.get('x-goog-channel-id');
    const channelToken = request.headers.get('x-goog-channel-token');
    const resourceId = request.headers.get('x-goog-resource-id');
    const resourceUri = request.headers.get('x-goog-resource-uri');
    const resourceState = request.headers.get('x-goog-resource-state');
    
    if (!channelId || !resourceId || !resourceUri || !resourceState) {
      return NextResponse.json(
        { error: 'Missing required Google Drive webhook headers' },
        { status: 400 }
      );
    }

    // Verify webhook token if configured
    if (DRIVE_WEBHOOK_SECRET && channelToken !== DRIVE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Invalid webhook token' },
        { status: 401 }
      );
    }

    // Construct webhook payload from headers
    const payload = {
      kind: 'api#channel' as const,
      id: channelId,
      resourceId,
      resourceUri,
      token: channelToken,
      type: resourceState as any, // 'sync' | 'add' | 'remove' | 'update' | etc.
      address: request.url
    };

    // Validate payload
    const validationResult = DriveWebhookSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid webhook payload',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    // Process webhook
    const result: DriveProcessingResult = await processeDriveWebhook(validationResult.data);

    // Return result
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          channelId: result.channelId,
          resourceId: result.resourceId,
          fileId: result.fileId,
          documentId: result.documentId,
          queued: result.queued,
          message: getSuccessMessage(result)
        }
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Processing failed',
          details: result.errors,
          channelId: result.channelId
        },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('Drive webhook error:', error);
    
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
 * Handle webhook verification (GET request)
 */
export async function GET(request: NextRequest) {
  // Google Drive sends GET requests to verify webhook endpoints
  const challenge = request.nextUrl.searchParams.get('hub.challenge');
  
  if (challenge) {
    // Echo back the challenge for verification
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  return NextResponse.json(
    { error: 'Webhook verification failed' },
    { status: 400 }
  );
}

/**
 * Generate success message based on processing result
 */
function getSuccessMessage(result: DriveProcessingResult): string {
  if (!result.fileId) {
    return `Webhook processed but no file ID extracted from ${result.resourceId}`;
  }
  
  if (!result.queued) {
    return `File ${result.fileId} processed but not queued for parsing (likely not a utility document)`;
  }
  
  if (result.documentId) {
    return `File ${result.fileId} processed and queued for parsing. Document created: ${result.documentId}`;
  }
  
  return `File ${result.fileId} processed successfully`;
}

// Webhook endpoints should be publicly accessible but secured by token
// Rate limiting would be applied here via middleware
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds for Drive processing
