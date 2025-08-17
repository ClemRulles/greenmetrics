import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['en', 'fr'] as const;
const DEFAULT_LOCALE = 'en';

// Matches any file with an extension
const PUBLIC_FILE = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|map)$/i;

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/icon') || // /icon.png, /icon-192x192.png ...
    pathname === '/robots.txt' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/sitemap') ||
    PUBLIC_FILE.test(pathname)
  );
}

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  new RegExp(`^\/(?:${LOCALES.join('|')})$`),                    // /en, /fr  
  new RegExp(`^\/(?:${LOCALES.join('|')})\/auth(?:\/.*)?$`),     // /en/auth/*, /fr/auth/*
  /^\/api\/auth(?:\/.*)?$/,                                      // NextAuth API routes
  /^\/api\/public(?:\/.*)?$/,                                    // Public API routes
  /^\/certificate(?:\/.*)?$/,                                    // Public certificate pages
];

// Protected paths that require authentication  
const PROTECTED_PATH = new RegExp(`^\/(?:${LOCALES.join('|')})\/app(?:\/.*)?$`); // /en/app/*, /fr/app/*

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((pattern) => pattern.test(pathname));
}

function getLocale(request: NextRequest): string {
  // Check Accept-Language header for browser preference
  const acceptLang = request.headers.get('Accept-Language');
  if (acceptLang) {
    for (const locale of LOCALES) {
      if (acceptLang.includes(locale)) {
        return locale;
      }
    }
  }
  return DEFAULT_LOCALE;
}

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    
    // Early return for static assets - don't process through auth/locale logic
    if (isPublicAsset(pathname)) {
      return NextResponse.next();
    }
    
    // Skip processing for API routes and certificate pages
    if (pathname.startsWith('/api/') || 
        pathname.startsWith('/certificate/')) {
      return NextResponse.next();
    }
    
    // Handle root redirect to default locale
    if (pathname === '/') {
      const locale = getLocale(req);
      return NextResponse.redirect(new URL(`/${locale}`, req.url));
    }
    
    // Handle locale redirects for paths without locale prefix
    const hasLocale = LOCALES.some(locale => 
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );
    
    if (!hasLocale) {
      const locale = getLocale(req);
      return NextResponse.redirect(new URL(`/${locale}${pathname}`, req.url));
    }
    
    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/en/auth/signin', // Default signin page
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow public paths
        if (isPublic(pathname)) {
          return true;
        }
        
        // Require authentication for protected paths
        if (PROTECTED_PATH.test(pathname)) {
          return !!token;
        }
        
        // Allow all other paths
        return true;
      }
    }
  }
);

export const config = {
  matcher: [
    // Everything except api, _next assets, and common files
    '/((?!api|_next/static|_next/image|favicon.ico|icon.*\\.png|robots.txt|manifest\\.webmanifest|sitemap\\.xml|assets|fonts|images|.*\\..*$).*)',
  ],
};
