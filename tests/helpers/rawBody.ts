export function makeRequestWithRawBody(body: object | string, headers: Record<string, string> = {}) {
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  // Next.js route expects Request with .text() available
  return new Request('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: json,
  });
}

// Helper to create a mock NextRequest-like object for testing
export function createMockNextRequest(body: object | string, headers: Record<string, string> = {}) {
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  
  // Mock NextRequest with necessary methods
  return {
    method: 'POST',
    url: 'http://localhost/api/billing/webhook',
    headers: new Map(Object.entries({ 'content-type': 'application/json', ...headers })),
    text: async () => json,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  } as any; // Type assertion for testing purposes
}
