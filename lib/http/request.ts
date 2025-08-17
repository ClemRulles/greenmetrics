import { NextRequest } from 'next/server';

/**
 * Extract client IP address from Next.js request
 * @param req - Next.js request object
 * @returns Client IP address or 'unknown' if not available
 */
export function getClientIP(req: NextRequest): string {
  // Check forwarded headers first (for reverse proxies)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  // Check other common headers
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Check Cloudflare header
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  // Check standard remote address header
  const remoteAddr = req.headers.get('remote-addr');
  if (remoteAddr) {
    return remoteAddr.trim();
  }

  // Fallback for local development
  return 'unknown';
}

/**
 * Extract user agent from request
 * @param req - Next.js request object
 * @returns User agent string or 'unknown'
 */
export function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown';
}

/**
 * Get request correlation ID for tracing
 * @param req - Next.js request object
 * @returns Request ID if available
 */
export function getRequestId(req: NextRequest): string | null {
  return req.headers.get('x-request-id') || null;
}
