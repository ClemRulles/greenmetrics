import { NextResponse } from 'next/server';

export function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleDeprecatedRoute(req, params);
}

export function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleDeprecatedRoute(req, params);
}

export function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleDeprecatedRoute(req, params);
}

export function PATCH(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleDeprecatedRoute(req, params);
}

export function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handleDeprecatedRoute(req, params);
}

async function handleDeprecatedRoute(req: Request, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const url = new URL(req.url);
  
  // Redirect from /api/sponsor/* to /api/partner/*
  url.pathname = `/api/partner/${path.join('/')}`;
  
  console.warn(`Deprecated API route accessed: ${req.url} -> ${url.toString()}`);
  
  const res = NextResponse.redirect(url.toString(), 307);
  res.headers.set('Warning', '299 - sponsor routes deprecated; use /api/partner/*');
  res.headers.set('X-Deprecated-Route', 'true');
  
  return res;
}
