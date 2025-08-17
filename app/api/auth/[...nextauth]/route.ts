import NextAuth from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { requesterId, consume } from '@/lib/sec/rate-limit';
import { withRequestId } from '@/lib/sec/headers';

// Ensure NEXTAUTH_URL is set for dev if missing
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'http://localhost:3001';
}

// Initialize NextAuth and extract handlers
const nextAuth = NextAuth(authOptions) as any;
const { handlers } = nextAuth || {};

// Helper to wrap a handler with rate limiting and request-id header
function wrapWithRateLimit(fn: (req: NextRequest) => Promise<NextResponse> | Promise<Response>) {
  return async (req: NextRequest) => {
    const rid = requesterId(req, null);
    const token = consume('auth', rid);
    if (!token.ok) {
      return withRequestId(
        NextResponse.json({ error: 'RATE_LIMITED', detail: 'Too many authentication requests' }, { status: 429 }),
        req
      );
    }

    const res = await fn(req as any);
    return withRequestId(res as NextResponse, req);
  };
}

// Export GET/POST from NextAuth but wrapped
export const GET = handlers?.GET ? wrapWithRateLimit(handlers.GET) : undefined;
export const POST = handlers?.POST ? wrapWithRateLimit(handlers.POST) : undefined;

export default nextAuth;
