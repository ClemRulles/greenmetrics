import crypto from 'crypto';

/**
 * Generate a weak ETag for HTTP caching
 * Useful for API routes that return dynamic content that changes infrequently
 */
export function generateWeakETag(content: string | object): string {
  const data = typeof content === 'string' ? content : JSON.stringify(content);
  const hash = crypto.createHash('md5').update(data).digest('hex');
  return `W/"${hash}"`;
}

/**
 * Check if the request has a matching ETag (If-None-Match header)
 */
export function hasMatchingETag(ifNoneMatch: string | null, currentETag: string): boolean {
  if (!ifNoneMatch) return false;
  
  // Handle both strong and weak ETags
  const requestETags = ifNoneMatch.split(',').map(tag => tag.trim());
  return requestETags.includes(currentETag) || requestETags.includes('*');
}

/**
 * Create cache headers with ETag support
 */
export function createCacheHeaders(content: string | object, maxAge = 3600) {
  const etag = generateWeakETag(content);
  
  return {
    'ETag': etag,
    'Cache-Control': `public, max-age=${maxAge}, must-revalidate`,
    'Vary': 'Accept-Encoding'
  };
}
