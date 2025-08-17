import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

export function getRequestId(existing?: string | null): string {
  return existing && existing.length > 0 ? existing : randomUUID();
}

export function withRequestId<T extends NextResponse>(res: T, req: Request): T {
  const incoming = (req.headers.get('x-request-id') || '').trim();
  const id = getRequestId(incoming);
  res.headers.set('x-request-id', id);
  return res;
}
