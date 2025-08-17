/**
 * Security Headers Utilities
 * Provides hardened security headers for production deployment
 */

export interface SecurityHeadersOptions {
  nonce?: string;
  allowFraming?: boolean;
  allowUnsafeEval?: boolean;
  additionalConnectSrc?: string[];
  additionalImgSrc?: string[];
  additionalScriptSrc?: string[];
}

/**
 * Generate Content Security Policy with nonce support
 */
export function generateCSP(options: SecurityHeadersOptions = {}): string {
  const {
    nonce,
    allowFraming = false,
    allowUnsafeEval = false,
    additionalConnectSrc = [],
    additionalImgSrc = [],
    additionalScriptSrc = []
  } = options;

  const cdnHost = process.env.CDN_HOST || 'app.example.com';
  
  // Base script sources
  const scriptSrc = [
    "'self'",
    ...(nonce ? [`'nonce-${nonce}'`] : []),
    "'strict-dynamic'", // Allows scripts loaded by nonce to load other scripts
    ...additionalScriptSrc
  ];

  // Add unsafe-eval only if explicitly allowed (avoid in production)
  if (allowUnsafeEval) {
    scriptSrc.push("'unsafe-eval'");
  }

  // Connect sources for API calls and monitoring
  const connectSrc = [
    "'self'",
    "https://o*.ingest.sentry.io", // Sentry error reporting
    "https://app.posthog.com",     // PostHog analytics
    "https://*.posthog.com",       // PostHog CDN
    `https://${cdnHost}`,          // CDN host
    ...additionalConnectSrc
  ];

  // Image sources
  const imgSrc = [
    "'self'",
    "data:",
    "https:",
    `https://${cdnHost}`,
    ...additionalImgSrc
  ];

  // Frame ancestors
  const frameAncestors = allowFraming ? ["'self'", "https:"] : ["'none'"];

  const cspDirectives = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `script-src ${scriptSrc.join(' ')}`,
    `object-src 'none'`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind requires unsafe-inline
    `img-src ${imgSrc.join(' ')}`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc.join(' ')}`,
    `media-src 'self' data:`,
    `form-action 'self'`,
    `frame-ancestors ${frameAncestors.join(' ')}`,
    `frame-src 'self'`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `upgrade-insecure-requests`
  ];

  return cspDirectives.join('; ');
}

/**
 * Generate Permissions Policy header
 */
export function generatePermissionsPolicy(): string {
  const policies = [
    'camera=()',           // Block camera access
    'microphone=()',       // Block microphone access  
    'geolocation=()',      // Block location access
    'payment=()',          // Block payment API
    'usb=()',             // Block USB access
    'magnetometer=()',     // Block magnetometer
    'gyroscope=()',       // Block gyroscope
    'accelerometer=()',    // Block accelerometer
    'ambient-light-sensor=()', // Block ambient light
    'autoplay=()',        // Block autoplay
    'encrypted-media=()', // Block DRM
    'fullscreen=(self)',  // Allow fullscreen on same origin
    'picture-in-picture=()', // Block PiP
    'screen-wake-lock=()', // Block wake lock
    'display-capture=()', // Block screen capture
  ];

  return policies.join(', ');
}

/**
 * Get hardened security headers
 */
export function getSecurityHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
  const { allowFraming = false } = options;

  return {
    // Content Security Policy
    'Content-Security-Policy': generateCSP(options),
    
    // Cross-Origin Policies
    'Cross-Origin-Opener-Policy': allowFraming ? 'unsafe-none' : 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Cross-Origin-Embedder-Policy': 'unsafe-none', // Required for some features
    
    // Content Protection
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': allowFraming ? 'SAMEORIGIN' : 'DENY',
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy
    'Permissions-Policy': generatePermissionsPolicy(),
    
    // HSTS (if HTTPS)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // Cache and debugging
    'X-Security-Headers': 'enabled',
  };
}

/**
 * Route-specific security header configurations
 */
export const ROUTE_SECURITY_CONFIGS = {
  // Auth pages - strictest security
  auth: {
    allowFraming: false,
    allowUnsafeEval: false,
  },
  
  // API endpoints - no framing, strict CSP
  api: {
    allowFraming: false,
    allowUnsafeEval: false,
  },
  
  // Public pages - standard security
  public: {
    allowFraming: false,
    allowUnsafeEval: false,
  },
  
  // Certificate pages (might be embedded) - allow framing
  certificate: {
    allowFraming: true,
    allowUnsafeEval: false,
  },
  
  // Admin pages - strictest security
  admin: {
    allowFraming: false,
    allowUnsafeEval: false,
    additionalConnectSrc: [] as string[], // No additional sources
  },
} as const;

/**
 * Generate nonce for CSP
 */
export function generateNonce(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Get security headers for specific route type
 */
export function getRouteSecurityHeaders(
  routeType: keyof typeof ROUTE_SECURITY_CONFIGS,
  nonce?: string
): Record<string, string> {
  const config = ROUTE_SECURITY_CONFIGS[routeType];
  return getSecurityHeaders({ ...config, nonce } as SecurityHeadersOptions);
}

/**
 * Validate security headers are present
 */
export function validateSecurityHeaders(headers: Record<string, string>): {
  valid: boolean;
  missing: string[];
  issues: string[];
} {
  const requiredHeaders = [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy'
  ];

  const missing = requiredHeaders.filter(header => !headers[header]);
  const issues: string[] = [];

  // Check CSP has basic directives
  const csp = headers['Content-Security-Policy'];
  if (csp) {
    const requiredDirectives = ['default-src', 'script-src', 'object-src'];
    const missingDirectives = requiredDirectives.filter(
      directive => !csp.includes(directive)
    );
    if (missingDirectives.length > 0) {
      issues.push(`CSP missing directives: ${missingDirectives.join(', ')}`);
    }
    
    // Check for unsafe directives
    if (csp.includes("'unsafe-inline'") && csp.includes('script-src')) {
      issues.push('CSP allows unsafe-inline scripts');
    }
    if (csp.includes("'unsafe-eval'")) {
      issues.push('CSP allows unsafe-eval');
    }
  }

  // Check X-Frame-Options
  const xfo = headers['X-Frame-Options'];
  if (xfo && !['DENY', 'SAMEORIGIN'].includes(xfo)) {
    issues.push(`X-Frame-Options has weak value: ${xfo}`);
  }

  return {
    valid: missing.length === 0 && issues.length === 0,
    missing,
    issues
  };
}

/**
 * Security headers middleware helper
 */
export function withSecurityHeaders<T extends Record<string, any>>(
  handler: (req: any, res: any) => Promise<T> | T,
  routeType: keyof typeof ROUTE_SECURITY_CONFIGS = 'public'
) {
  return async (req: any, res: any) => {
    // Generate nonce for this request
    const nonce = generateNonce();
    
    // Add nonce to request for use in components
    req.nonce = nonce;
    
    // Get security headers for route type
    const securityHeaders = getRouteSecurityHeaders(routeType, nonce);
    
    // Set headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Call original handler
    return handler(req, res);
  };
}

/**
 * Next.js App Router security headers helper
 */
export function setSecurityHeaders(
  routeType: keyof typeof ROUTE_SECURITY_CONFIGS = 'public',
  nonce?: string
) {
  const headers = getRouteSecurityHeaders(routeType, nonce);
  
  // In App Router, we need to return headers for the headers() function
  return headers;
}

/**
 * CSP nonce injection for React components
 */
export function useCSPNonce(): string {
  // In server components, get from request
  // In client components, get from meta tag or window
  if (typeof window !== 'undefined') {
    const meta = document.querySelector('meta[name="csp-nonce"]');
    return meta?.getAttribute('content') || '';
  }
  
  // Server-side: get from request context
  return ''; // Will be replaced by middleware
}
