import { describe, it, expect } from 'vitest';
import { getRequestId, withRequestId } from '@/lib/sec/headers';
import { NextResponse } from 'next/server';

describe('security headers', () => {
  it('generates UUID when no existing request ID', () => {
    const id = getRequestId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('reuses existing request ID when provided', () => {
    const existingId = 'existing-request-id-123';
    const id = getRequestId(existingId);
    expect(id).toBe(existingId);
  });

  it('generates new ID when existing is empty', () => {
    const id = getRequestId('');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('withRequestId attaches x-request-id header', () => {
    const req = new Request('http://example.com');
    const res = NextResponse.json({ success: true });
    
    const wrapped = withRequestId(res, req);
    
    const requestId = wrapped.headers.get('x-request-id');
    expect(requestId).toBeTruthy();
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('withRequestId preserves incoming request ID', () => {
    const incomingId = 'test-request-id-456';
    const req = new Request('http://example.com', {
      headers: { 'x-request-id': incomingId }
    });
    const res = NextResponse.json({ success: true });
    
    const wrapped = withRequestId(res, req);
    
    expect(wrapped.headers.get('x-request-id')).toBe(incomingId);
  });

  it('withRequestId works with different response types', () => {
    const req = new Request('http://example.com');
    
    // Test with JSON response
    const jsonRes = NextResponse.json({ data: 'test' });
    const wrappedJson = withRequestId(jsonRes, req);
    expect(wrappedJson.headers.get('x-request-id')).toBeTruthy();
    
    // Test with redirect response  
    const redirectRes = NextResponse.redirect('http://example.com/redirect');
    const wrappedRedirect = withRequestId(redirectRes, req);
    expect(wrappedRedirect.headers.get('x-request-id')).toBeTruthy();
  });
});
