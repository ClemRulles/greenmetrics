/**
 * Replay Attack Protection Utilities
 * Provides nonce-based replay protection for webhooks and sensitive endpoints
 */

interface ReplayProtectionOptions {
  ttlSeconds?: number;
  keyPrefix?: string;
  redis?: any; // Redis client instance
}

interface ReplayCheckResult {
  allowed: boolean;
  error?: string;
  isReplay?: boolean;
}

/**
 * In-memory replay protection (for development/testing)
 * In production, use Redis-based implementation
 */
class InMemoryReplayProtection {
  private store = new Map<string, number>();
  private ttlSeconds: number;
  private keyPrefix: string;

  constructor(options: ReplayProtectionOptions = {}) {
    this.ttlSeconds = options.ttlSeconds || 300; // 5 minutes default
    this.keyPrefix = options.keyPrefix || 'replay:';
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async checkAndStore(nonce: string): Promise<ReplayCheckResult> {
    const key = `${this.keyPrefix}${nonce}`;
    const now = Math.floor(Date.now() / 1000);
    
    // Check if nonce exists and is still valid
    const existing = this.store.get(key);
    if (existing && existing > now) {
      return { 
        allowed: false, 
        isReplay: true, 
        error: 'Request nonce already used (replay attack detected)' 
      };
    }
    
    // Store nonce with expiration
    this.store.set(key, now + this.ttlSeconds);
    
    return { allowed: true };
  }

  private cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [key, expiry] of this.store.entries()) {
      if (expiry <= now) {
        this.store.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * Redis-based replay protection (for production)
 */
class RedisReplayProtection {
  private redis: any;
  private ttlSeconds: number;
  private keyPrefix: string;

  constructor(options: ReplayProtectionOptions) {
    if (!options.redis) {
      throw new Error('Redis client required for RedisReplayProtection');
    }
    this.redis = options.redis;
    this.ttlSeconds = options.ttlSeconds || 300;
    this.keyPrefix = options.keyPrefix || 'replay:';
  }

  async checkAndStore(nonce: string): Promise<ReplayCheckResult> {
    const key = `${this.keyPrefix}${nonce}`;
    
    try {
      // Use Redis SET with NX (only if not exists) and EX (expiration)
      const result = await this.redis.set(key, Date.now(), 'NX', 'EX', this.ttlSeconds);
      
      if (result !== 'OK') {
        return { 
          allowed: false, 
          isReplay: true, 
          error: 'Request nonce already used (replay attack detected)' 
        };
      }
      
      return { allowed: true };
    } catch (error) {
      return { 
        allowed: false, 
        error: `Replay protection check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async clear(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

/**
 * Factory function to create appropriate replay protection instance
 */
export function createReplayProtection(options: ReplayProtectionOptions = {}) {
  if (options.redis) {
    return new RedisReplayProtection(options);
  } else {
    console.warn('Using in-memory replay protection. Use Redis for production.');
    return new InMemoryReplayProtection(options);
  }
}

/**
 * Generate cryptographically secure nonce
 */
export function generateNonce(length = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Extract nonce from webhook headers or body
 */
export function extractNonceFromRequest(
  req: Request, 
  body?: any,
  nonceHeader = 'x-nonce'
): string | null {
  // Try header first
  const headerNonce = req.headers.get(nonceHeader);
  if (headerNonce) return headerNonce;
  
  // Try body (for JSON webhooks)
  if (body && typeof body === 'object') {
    return body.nonce || body.idempotency_key || null;
  }
  
  return null;
}

/**
 * Extract nonce from headers and body (legacy function)
 */
export function extractNonce(
  headers: Headers, 
  body?: any,
  nonceHeader = 'x-nonce'
): string | null {
  // Try header first
  const headerNonce = headers.get(nonceHeader);
  if (headerNonce) return headerNonce;
  
  // Try body (for JSON webhooks)
  if (body && typeof body === 'object') {
    return body.nonce || body.idempotency_key || null;
  }
  
  return null;
}

/**
 * Generate nonce from request signature and timestamp (deterministic)
 */
export function generateDeterministicNonce(
  signature: string, 
  timestamp: number | string,
  salt?: string
): string {
  const crypto = require('crypto');
  const input = `${signature}:${timestamp}${salt ? `:${salt}` : ''}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Middleware for replay protection
 */
export function withReplayProtection(
  replayProtection: InMemoryReplayProtection | RedisReplayProtection,
  nonceExtractor: (req: Request, body?: any) => string | null = extractNonceFromRequest
) {
  return function replayProtectionMiddleware(
    handler: (req: Request, context: any) => Promise<Response> | Response
  ) {
    return async (req: Request, context: any = {}) => {
      try {
        // Extract nonce from request
        const nonce = nonceExtractor(req, context.body);
        
        if (!nonce) {
          return new Response(
            JSON.stringify({ error: 'Missing nonce for replay protection' }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Check replay protection
        const replayCheck = await replayProtection.checkAndStore(nonce);
        
        if (!replayCheck.allowed) {
          const status = replayCheck.isReplay ? 409 : 500; // 409 Conflict for replay
          return new Response(
            JSON.stringify({ 
              error: replayCheck.error || 'Replay protection check failed',
              replay: replayCheck.isReplay 
            }),
            { 
              status, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Add nonce to context for handler
        context.nonce = nonce;
        
        return handler(req, context);
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Replay protection middleware failed' }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    };
  };
}

/**
 * Stripe webhook replay protection (uses signature + timestamp as nonce)
 */
export function withStripeReplayProtection(
  replayProtection: InMemoryReplayProtection | RedisReplayProtection
) {
  return withReplayProtection(replayProtection, (req) => {
    const signature = req.headers.get('stripe-signature');
    if (!signature) return null;
    
    // Extract timestamp from Stripe signature
    const timestampMatch = signature.match(/t=(\d+)/);
    if (!timestampMatch) return null;
    
    const timestamp = timestampMatch[1];
    
    // Generate deterministic nonce from signature + timestamp
    return generateDeterministicNonce(signature, timestamp, 'stripe');
  });
}

/**
 * GitHub webhook replay protection (uses delivery ID)
 */
export function withGitHubReplayProtection(
  replayProtection: InMemoryReplayProtection | RedisReplayProtection
) {
  return withReplayProtection(replayProtection, (req) => {
    // GitHub provides a unique delivery ID
    return req.headers.get('x-github-delivery');
  });
}

/**
 * Custom webhook replay protection with configurable nonce extraction
 */
export function withCustomReplayProtection(
  replayProtection: InMemoryReplayProtection | RedisReplayProtection,
  options: {
    nonceHeader?: string;
    nonceBodyField?: string;
    generateFromSignature?: boolean;
    signatureHeader?: string;
    timestampHeader?: string;
  } = {}
) {
  const {
    nonceHeader = 'x-nonce',
    nonceBodyField = 'nonce',
    generateFromSignature = false,
    signatureHeader = 'x-signature',
    timestampHeader = 'x-timestamp'
  } = options;

  return withReplayProtection(replayProtection, (req, body) => {
    // Try explicit nonce first
    let nonce = req.headers.get(nonceHeader);
    if (nonce) return nonce;
    
    if (body && body[nonceBodyField]) {
      return body[nonceBodyField];
    }
    
    // Generate from signature + timestamp if requested
    if (generateFromSignature) {
      const signature = req.headers.get(signatureHeader);
      const timestamp = req.headers.get(timestampHeader);
      
      if (signature && timestamp) {
        return generateDeterministicNonce(signature, timestamp, 'custom');
      }
    }
    
    return null;
  });
}

/**
 * Testing utilities for replay protection
 */
export const ReplayTestUtils = {
  /**
   * Create test replay protection instance
   */
  createTestInstance(ttlSeconds = 60): InMemoryReplayProtection {
    return new InMemoryReplayProtection({ ttlSeconds, keyPrefix: 'test:' });
  },
  
  /**
   * Generate test nonce
   */
  generateTestNonce(): string {
    return generateNonce(16);
  },
  
  /**
   * Create test request with nonce
   */
  createRequestWithNonce(nonce: string, headers: Record<string, string> = {}): Request {
    return new Request('http://test.com/webhook', {
      method: 'POST',
      headers: {
        'x-nonce': nonce,
        'content-type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ test: true })
    });
  }
};
