/**
 * Authentication Cookie Security Utilities
 * Ensures secure cookie configuration and session management
 */

export interface CookieSecurityOptions {
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
  path?: string;
  maxAge?: number;
  expires?: Date;
}

/**
 * Get secure cookie configuration based on environment
 */
export function getSecureCookieConfig(
  name: string,
  overrides: Partial<CookieSecurityOptions> = {}
): CookieSecurityOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = process.env.PUBLIC_BASE_URL?.startsWith('https://') || isProduction;

  const defaultConfig: CookieSecurityOptions = {
    secure: isHttps, // Only send over HTTPS in production
    httpOnly: true,  // Prevent XSS access to cookies
    sameSite: 'lax', // CSRF protection while allowing navigation
    path: '/',
    // No domain set by default (current domain only)
  };

  // Session-specific cookies need stricter settings
  if (name.includes('session') || name.includes('auth')) {
    defaultConfig.sameSite = 'lax'; // Lax for auth to work with redirects
    defaultConfig.maxAge = 30 * 24 * 60 * 60; // 30 days default
  }

  // CSRF tokens can be more restrictive
  if (name.includes('csrf') || name.includes('token')) {
    defaultConfig.sameSite = 'strict';
    defaultConfig.maxAge = 24 * 60 * 60; // 24 hours default
  }

  return { ...defaultConfig, ...overrides };
}

/**
 * Serialize cookie with secure defaults
 */
export function serializeSecureCookie(
  name: string,
  value: string,
  options: Partial<CookieSecurityOptions> = {}
): string {
  const config = getSecureCookieConfig(name, options);
  
  let cookieString = `${name}=${encodeURIComponent(value)}`;
  
  if (config.domain) {
    cookieString += `; Domain=${config.domain}`;
  }
  
  if (config.path) {
    cookieString += `; Path=${config.path}`;
  }
  
  if (config.maxAge !== undefined) {
    cookieString += `; Max-Age=${config.maxAge}`;
  }
  
  if (config.expires) {
    cookieString += `; Expires=${config.expires.toUTCString()}`;
  }
  
  if (config.secure) {
    cookieString += '; Secure';
  }
  
  if (config.httpOnly) {
    cookieString += '; HttpOnly';
  }
  
  if (config.sameSite) {
    cookieString += `; SameSite=${config.sameSite}`;
  }
  
  return cookieString;
}

/**
 * Create a secure session cookie
 */
export function createSessionCookie(
  sessionId: string,
  options: Partial<CookieSecurityOptions> = {}
): string {
  return serializeSecureCookie('next-auth.session-token', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
    ...options
  });
}

/**
 * Create a CSRF token cookie
 */
export function createCSRFCookie(
  token: string,
  options: Partial<CookieSecurityOptions> = {}
): string {
  return serializeSecureCookie('next-auth.csrf-token', token, {
    httpOnly: false, // CSRF tokens need to be accessible to JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
    ...options
  });
}

/**
 * Clear/delete a cookie securely
 */
export function clearCookie(
  name: string,
  options: Partial<CookieSecurityOptions> = {}
): string {
  return serializeSecureCookie(name, '', {
    ...options,
    maxAge: 0,
    expires: new Date(0)
  });
}

/**
 * Parse cookies from request headers
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  });
  
  return cookies;
}

/**
 * Validate cookie security configuration
 */
export function validateCookieSecurity(
  cookies: Record<string, string>,
  headers: Headers
): {
  secure: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check Set-Cookie headers for security flags
  const setCookieHeaders = headers.get('set-cookie') || '';
  
  // Parse each Set-Cookie header
  setCookieHeaders.split(',').forEach(cookieHeader => {
    if (!cookieHeader.trim()) return;
    
    const cookieName = cookieHeader.split('=')[0]?.trim();
    if (!cookieName) return;
    
    // Check for security flags
    const hasSecure = cookieHeader.includes('Secure');
    const hasHttpOnly = cookieHeader.includes('HttpOnly');
    const hasSameSite = cookieHeader.includes('SameSite');
    
    // Session/auth cookies must be secure in production
    if ((cookieName.includes('session') || cookieName.includes('auth')) && isProduction) {
      if (!hasSecure) {
        issues.push(`${cookieName}: Missing Secure flag in production`);
      }
      if (!hasHttpOnly) {
        issues.push(`${cookieName}: Missing HttpOnly flag`);
      }
      if (!hasSameSite) {
        warnings.push(`${cookieName}: Missing SameSite attribute`);
      }
    }
    
    // CSRF tokens should not be HttpOnly
    if (cookieName.includes('csrf') && hasHttpOnly) {
      warnings.push(`${cookieName}: CSRF token should not be HttpOnly`);
    }
  });
  
  return {
    secure: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Session rotation utilities
 */
export const SessionRotation = {
  /**
   * Generate new session ID
   */
  generateSessionId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  },
  
  /**
   * Rotate session on privilege escalation
   */
  rotateSession(currentSessionId: string): {
    newSessionId: string;
    rotationTimestamp: number;
  } {
    return {
      newSessionId: this.generateSessionId(),
      rotationTimestamp: Date.now()
    };
  },
  
  /**
   * Check if session should be rotated
   */
  shouldRotateSession(
    lastRotation: number,
    rotationInterval = 24 * 60 * 60 * 1000 // 24 hours
  ): boolean {
    return Date.now() - lastRotation > rotationInterval;
  }
};

/**
 * Double-submit CSRF protection
 */
export const CSRFProtection = {
  /**
   * Generate CSRF token
   */
  generateToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  },
  
  /**
   * Verify CSRF token (double-submit pattern)
   */
  verifyToken(
    headerToken: string | null,
    cookieToken: string | null
  ): boolean {
    if (!headerToken || !cookieToken) return false;
    
    try {
      const crypto = require('crypto');
      return crypto.timingSafeEqual(
        Buffer.from(headerToken, 'hex'),
        Buffer.from(cookieToken, 'hex')
      );
    } catch {
      return false;
    }
  },
  
  /**
   * Middleware for CSRF protection
   */
  middleware(
    handler: (req: Request) => Promise<Response> | Response,
    options: {
      exemptMethods?: string[];
      tokenHeader?: string;
      cookieName?: string;
    } = {}
  ) {
    const {
      exemptMethods = ['GET', 'HEAD', 'OPTIONS'],
      tokenHeader = 'x-csrf-token',
      cookieName = 'next-auth.csrf-token'
    } = options;
    
    return async (req: Request) => {
      // Skip CSRF check for exempt methods
      if (exemptMethods.includes(req.method)) {
        return handler(req);
      }
      
      // Get tokens
      const headerToken = req.headers.get(tokenHeader);
      const cookies = parseCookies(req.headers.get('cookie'));
      const cookieToken = cookies[cookieName];
      
      // Verify tokens match
      if (!this.verifyToken(headerToken, cookieToken)) {
        return new Response(
          JSON.stringify({ error: 'Invalid CSRF token' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      return handler(req);
    };
  }
};

/**
 * Cookie testing utilities
 */
export const CookieTestUtils = {
  /**
   * Create test cookies with security flags
   */
  createTestCookies(): Record<string, string> {
    return {
      'test-session': serializeSecureCookie('test-session', 'test-value', {
        secure: true,
        httpOnly: true,
        sameSite: 'lax'
      }),
      'test-csrf': serializeSecureCookie('test-csrf', 'csrf-token', {
        secure: true,
        httpOnly: false,
        sameSite: 'strict'
      })
    };
  },
  
  /**
   * Parse cookie header for testing
   */
  parseCookieHeader(header: string): Record<string, any> {
    const parts = header.split(';').map(p => p.trim());
    const [nameValue] = parts;
    const [name, value] = nameValue.split('=');
    
    const attributes: Record<string, any> = { name, value };
    
    parts.slice(1).forEach(part => {
      if (part === 'Secure') attributes.secure = true;
      else if (part === 'HttpOnly') attributes.httpOnly = true;
      else if (part.startsWith('SameSite=')) attributes.sameSite = part.split('=')[1];
      else if (part.startsWith('Max-Age=')) attributes.maxAge = parseInt(part.split('=')[1]);
      else if (part.startsWith('Path=')) attributes.path = part.split('=')[1];
      else if (part.startsWith('Domain=')) attributes.domain = part.split('=')[1];
    });
    
    return attributes;
  }
};
