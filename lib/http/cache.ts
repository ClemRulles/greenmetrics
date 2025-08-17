/**
 * HTTP Cache Utilities
 * Provides consistent cache headers and cache-related utilities for the application
 */

export type CacheStrategy = 
  | 'no-cache'          // No caching, always revalidate
  | 'no-store'          // Never cache, never store
  | 'static'            // Long-term immutable cache  
  | 'public-short'      // Public cache with short TTL
  | 'public-long'       // Public cache with long TTL
  | 'private'           // Private cache only
  | 'stale-while-revalidate'; // SWR pattern

export interface CacheOptions {
  maxAge?: number;
  staleWhileRevalidate?: number;
  mustRevalidate?: boolean;
  immutable?: boolean;
  private?: boolean;
}

/**
 * Generate Cache-Control header value based on strategy
 */
export function getCacheControlHeader(
  strategy: CacheStrategy, 
  options: CacheOptions = {}
): string {
  const { maxAge, staleWhileRevalidate, mustRevalidate, immutable, private: isPrivate } = options;

  switch (strategy) {
    case 'no-cache':
      return 'no-cache, must-revalidate';
    
    case 'no-store':
      return 'no-store, no-cache, must-revalidate';
    
    case 'static':
      return `public, max-age=${maxAge || 31536000}${immutable ? ', immutable' : ''}`;
    
    case 'public-short':
      const shortAge = maxAge || 3600; // 1 hour default
      const shortSwr = staleWhileRevalidate || Math.floor(shortAge / 2);
      return `public, max-age=${shortAge}, stale-while-revalidate=${shortSwr}`;
    
    case 'public-long':
      const longAge = maxAge || 86400; // 1 day default  
      const longSwr = staleWhileRevalidate || Math.floor(longAge / 4);
      return `public, max-age=${longAge}, stale-while-revalidate=${longSwr}`;
    
    case 'private':
      return `private, max-age=${maxAge || 0}${mustRevalidate ? ', must-revalidate' : ''}`;
    
    case 'stale-while-revalidate':
      const swriteAge = maxAge || 1800; // 30 minutes default
      const swriteSwr = staleWhileRevalidate || Math.floor(swriteAge / 2);
      return `${isPrivate ? 'private' : 'public'}, max-age=${swriteAge}, stale-while-revalidate=${swriteSwr}`;
    
    default:
      return 'no-cache, must-revalidate';
  }
}

/**
 * Common cache headers for different content types
 */
export const CACHE_HEADERS = {
  // Static assets (JS, CSS, images with hashes)
  STATIC_IMMUTABLE: getCacheControlHeader('static', { maxAge: 31536000, immutable: true }),
  
  // Images and media files
  IMAGES: getCacheControlHeader('public-long', { maxAge: 2592000, staleWhileRevalidate: 86400 }), // 30 days + 1 day SWR
  
  // Certificate pages (public but can change)
  CERTIFICATES: getCacheControlHeader('public-short', { maxAge: 3600, staleWhileRevalidate: 1800 }), // 1 hour + 30min SWR
  
  // Public HTML pages
  HTML_PUBLIC: getCacheControlHeader('stale-while-revalidate', { maxAge: 1800, staleWhileRevalidate: 900 }), // 30min + 15min SWR
  
  // Auth pages and user-specific content
  NO_CACHE_AUTH: getCacheControlHeader('no-store'),
  
  // API responses (default)
  API_PRIVATE: getCacheControlHeader('private', { maxAge: 0, mustRevalidate: true }),
  
  // Fonts and metadata
  META: getCacheControlHeader('public-long', { maxAge: 86400, staleWhileRevalidate: 3600 }), // 1 day + 1 hour SWR
} as const;

/**
 * Set cache headers on a Response object
 */
export function setCacheHeaders(
  response: Response, 
  strategy: CacheStrategy, 
  options?: CacheOptions
): Response {
  const cacheControl = getCacheControlHeader(strategy, options);
  response.headers.set('Cache-Control', cacheControl);
  response.headers.set('X-Cache-Status', 'ORIGIN');
  return response;
}

/**
 * Set cache headers on Next.js Response using headers()
 */
export function setCacheHeadersNext(
  strategy: CacheStrategy, 
  options?: CacheOptions
): Record<string, string> {
  const cacheControl = getCacheControlHeader(strategy, options);
  return {
    'Cache-Control': cacheControl,
    'X-Cache-Status': 'ORIGIN',
  };
}

/**
 * Check if a request should bypass cache based on cookies/headers
 */
export function shouldBypassCache(request: Request): boolean {
  const url = new URL(request.url);
  
  // Bypass cache for authenticated requests
  const authCookie = request.headers.get('cookie')?.includes('next-auth.session-token');
  if (authCookie) return true;
  
  // Bypass cache for cache-busting query params
  if (url.searchParams.has('nocache') || url.searchParams.has('bust')) {
    return true;
  }
  
  // Bypass cache for preview mode
  if (url.searchParams.has('preview')) {
    return true;
  }
  
  return false;
}

/**
 * Generate ETag for content
 */
export function generateETag(content: string | Buffer): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return `"${hash}"`;
}

/**
 * Check if request has matching ETag (for 304 responses)
 */
export function checkETag(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('if-none-match');
  return ifNoneMatch === etag;
}

/**
 * Set ETag header on response
 */
export function setETag(response: Response, content: string | Buffer): Response {
  const etag = generateETag(content);
  response.headers.set('ETag', etag);
  return response;
}

/**
 * Create a 304 Not Modified response
 */
export function createNotModifiedResponse(etag: string): Response {
  return new Response(null, {
    status: 304,
    headers: {
      'ETag': etag,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}

/**
 * Cache debugging utilities
 */
export const CacheDebug = {
  /**
   * Add debug headers to response
   */
  addDebugHeaders(response: Response, info: Record<string, string>): Response {
    Object.entries(info).forEach(([key, value]) => {
      response.headers.set(`X-Cache-Debug-${key}`, value);
    });
    return response;
  },
  
  /**
   * Log cache miss/hit for debugging
   */
  logCacheEvent(type: 'hit' | 'miss' | 'stale', url: string, details?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache ${type.toUpperCase()}]`, url, details || '');
    }
  }
};

/**
 * Signed URL cache utilities
 */
export const SignedUrlCache = {
  /**
   * Check if signed URL should be cached by CDN
   */
  shouldCacheSignedUrl(url: URL): boolean {
    // Only cache if it's a public document (no user-specific data)
    const isPublicDoc = url.pathname.includes('/public/') || 
                       url.pathname.includes('/certificate/');
    
    // Check if it has a content hash (making it cacheable)
    const hasContentHash = url.searchParams.has('hash') || 
                          url.searchParams.has('v');
    
    return isPublicDoc && hasContentHash;
  },
  
  /**
   * Get cache key for signed URL (ignoring auth params)
   */
  getCacheKey(url: URL): string {
    const cleanUrl = new URL(url);
    // Remove auth-specific params but keep content params
    cleanUrl.searchParams.delete('sig');
    cleanUrl.searchParams.delete('exp');
    cleanUrl.searchParams.delete('uid');
    return cleanUrl.toString();
  }
};
