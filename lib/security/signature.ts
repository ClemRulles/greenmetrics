/**
 * Webhook Signature Verification Utilities
 * Provides HMAC signature verification and replay protection for webhooks
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface SignatureVerificationOptions {
  secret: string;
  algorithm?: string;
  timestampHeader?: string;
  signatureHeader?: string;
  tolerance?: number; // Clock skew tolerance in seconds
  bodyEncoding?: BufferEncoding;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  timestamp?: number;
}

/**
 * Verify webhook signature using HMAC
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  options: SignatureVerificationOptions
): WebhookVerificationResult {
  const {
    secret,
    algorithm = 'sha256',
    tolerance = 300, // 5 minutes default
    bodyEncoding = 'utf8'
  } = options;

  try {
    // Parse signature (format: "sha256=<hash>" or just "<hash>")
    const sigParts = signature.split('=');
    const receivedHash = sigParts.length === 2 ? sigParts[1] : signature;
    const sigAlgorithm = sigParts.length === 2 ? sigParts[0] : algorithm;

    // Generate expected signature
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString(bodyEncoding);
    const expectedHash = createHmac(sigAlgorithm, secret)
      .update(body, bodyEncoding)
      .digest('hex');

    // Timing-safe comparison
    if (!timingSafeEqual(
      Buffer.from(receivedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    )) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Signature verification failed' 
    };
  }
}

/**
 * Verify Stripe webhook signature (includes timestamp verification)
 */
export function verifyStripeSignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string,
  tolerance = 300
): WebhookVerificationResult {
  try {
    // Parse Stripe signature header: "t=<timestamp>,v1=<signature>,v1=<signature>"
    const elements = signature.split(',');
    const timestampElement = elements.find(el => el.startsWith('t='));
    const signatureElements = elements.filter(el => el.startsWith('v1='));

    if (!timestampElement || signatureElements.length === 0) {
      return { valid: false, error: 'Invalid signature format' };
    }

    const timestamp = parseInt(timestampElement.split('=')[1]);
    const now = Math.floor(Date.now() / 1000);

    // Check timestamp tolerance
    if (Math.abs(now - timestamp) > tolerance) {
      return { 
        valid: false, 
        error: `Timestamp outside tolerance window: ${Math.abs(now - timestamp)}s > ${tolerance}s`,
        timestamp 
      };
    }

    // Verify signatures
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const payload = `${timestamp}.${body}`;
    const expectedHash = createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Check if any signature matches
    const validSignature = signatureElements.some(element => {
      const signature = element.split('=')[1];
      try {
        return timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedHash, 'hex')
        );
      } catch {
        return false;
      }
    });

    if (!validSignature) {
      return { valid: false, error: 'Invalid signature', timestamp };
    }

    return { valid: true, timestamp };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Stripe signature verification failed' 
    };
  }
}

/**
 * Verify GitHub webhook signature
 */
export function verifyGitHubSignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string
): WebhookVerificationResult {
  if (!signature.startsWith('sha256=')) {
    return { valid: false, error: 'Invalid GitHub signature format' };
  }

  return verifyWebhookSignature(rawBody, signature, {
    secret,
    algorithm: 'sha256'
  });
}

/**
 * Verify generic HMAC signature with timestamp
 */
export function verifyTimestampedSignature(
  rawBody: string | Buffer,
  signature: string,
  timestamp: string | number,
  secret: string,
  tolerance = 300
): WebhookVerificationResult {
  try {
    const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
    const now = Math.floor(Date.now() / 1000);

    // Check timestamp tolerance
    if (Math.abs(now - ts) > tolerance) {
      return { 
        valid: false, 
        error: `Timestamp outside tolerance: ${Math.abs(now - ts)}s > ${tolerance}s`,
        timestamp: ts 
      };
    }

    // Create payload with timestamp
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const payload = `${ts}.${body}`;
    
    return verifyWebhookSignature(payload, signature, {
      secret,
      algorithm: 'sha256'
    });
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Timestamped signature verification failed' 
    };
  }
}

/**
 * Extract raw body from Next.js request
 */
export async function getRawBody(req: Request): Promise<Buffer> {
  const body = await req.arrayBuffer();
  return Buffer.from(body);
}

/**
 * Middleware for webhook signature verification
 */
export function withSignatureVerification(
  handler: (req: Request, context: { rawBody: Buffer }) => Promise<Response> | Response,
  verifySignature: (rawBody: Buffer, headers: Headers) => WebhookVerificationResult
) {
  return async (req: Request) => {
    try {
      // Get raw body
      const rawBody = await getRawBody(req);
      
      // Verify signature
      const verification = verifySignature(rawBody, req.headers);
      
      if (!verification.valid) {
        return new Response(
          JSON.stringify({ error: verification.error || 'Invalid signature' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Call handler with verified body
      return handler(req, { rawBody });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Webhook processing failed' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}

/**
 * Stripe webhook verification middleware
 */
export function withStripeSignature(secret: string, tolerance = 300) {
  return (handler: (req: Request, context: { rawBody: Buffer }) => Promise<Response> | Response) => {
    return withSignatureVerification(handler, (rawBody, headers) => {
      const signature = headers.get('stripe-signature');
      if (!signature) {
        return { valid: false, error: 'Missing Stripe signature' };
      }
      return verifyStripeSignature(rawBody, signature, secret, tolerance);
    });
  };
}

/**
 * GitHub webhook verification middleware
 */
export function withGitHubSignature(secret: string) {
  return (handler: (req: Request, context: { rawBody: Buffer }) => Promise<Response> | Response) => {
    return withSignatureVerification(handler, (rawBody, headers) => {
      const signature = headers.get('x-hub-signature-256');
      if (!signature) {
        return { valid: false, error: 'Missing GitHub signature' };
      }
      return verifyGitHubSignature(rawBody, signature, secret);
    });
  };
}

/**
 * Custom webhook verification middleware
 */
export function withCustomSignature(
  secret: string,
  options: Partial<SignatureVerificationOptions> = {}
) {
  return (handler: (req: Request, context: { rawBody: Buffer }) => Promise<Response> | Response) => {
    return withSignatureVerification(handler, (rawBody, headers) => {
      const signatureHeader = options.signatureHeader || 'x-signature';
      const timestampHeader = options.timestampHeader || 'x-timestamp';
      
      const signature = headers.get(signatureHeader);
      const timestamp = headers.get(timestampHeader);
      
      if (!signature) {
        return { valid: false, error: `Missing ${signatureHeader} header` };
      }
      
      if (timestamp) {
        return verifyTimestampedSignature(rawBody, signature, timestamp, secret, options.tolerance);
      } else {
        return verifyWebhookSignature(rawBody, signature, { secret, ...options });
      }
    });
  };
}

/**
 * Webhook signature verification utilities for testing
 */
export const WebhookTestUtils = {
  /**
   * Generate Stripe signature for testing
   */
  generateStripeSignature(body: string, secret: string, timestamp?: number): string {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const payload = `${ts}.${body}`;
    const signature = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
    return `t=${ts},v1=${signature}`;
  },
  
  /**
   * Generate GitHub signature for testing
   */
  generateGitHubSignature(body: string, secret: string): string {
    const signature = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    return `sha256=${signature}`;
  },
  
  /**
   * Generate custom signature for testing
   */
  generateSignature(body: string, secret: string, algorithm = 'sha256'): string {
    return createHmac(algorithm, secret).update(body, 'utf8').digest('hex');
  }
};
