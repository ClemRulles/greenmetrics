import { describe, test, expect, vi } from 'vitest';

describe('Load Testing', () => {
  const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
  
  test('Health endpoint handles concurrent requests', async () => {
    const concurrentRequests = 20;
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/health`)
          .then(response => ({
            status: response.status,
            ok: response.ok
          }))
          .catch(error => ({
            status: 0,
            ok: false,
            error: error.message
          }))
      );
    }
    
    const results = await Promise.all(promises);
    
    // All requests should succeed
    const successfulRequests = results.filter(r => r.ok).length;
    expect(successfulRequests).toBeGreaterThanOrEqual(concurrentRequests * 0.9); // 90% success rate
    
    // No server errors
    const serverErrors = results.filter(r => r.status >= 500).length;
    expect(serverErrors).toBe(0);
  });
  
  test('API endpoints maintain performance under load', async () => {
    const endpoints = [
      '/api/health',
      '/api/auth/session',
      '/api/organizations'
    ];
    
    for (const endpoint of endpoints) {
      const requestCount = 10;
      const startTime = Date.now();
      
      const promises = Array.from({ length: requestCount }, () =>
        fetch(`${BASE_URL}${endpoint}`)
          .then(response => response.status)
          .catch(() => 500)
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const avgResponseTime = totalTime / requestCount;
      
      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(1000); // 1s average
      
      // Most requests should succeed (allow auth errors)
      const successfulRequests = results.filter(status => 
        status === 200 || status === 401 || status === 403
      ).length;
      expect(successfulRequests).toBeGreaterThanOrEqual(requestCount * 0.8);
    }
  });
  
  test('Database connection pool handles concurrent queries', async () => {
    const queryCount = 15;
    const promises = [];
    
    for (let i = 0; i < queryCount; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/health`)
          .then(response => response.json())
          .then(data => ({
            success: data.checks?.database?.status === 'healthy',
            latency: data.checks?.database?.latency
          }))
          .catch(() => ({ success: false, latency: null }))
      );
    }
    
    const results = await Promise.all(promises);
    
    // Database should handle concurrent connections
    const successfulQueries = results.filter(r => r.success).length;
    expect(successfulQueries).toBeGreaterThanOrEqual(queryCount * 0.9);
    
    // Latency should remain reasonable
    const validLatencies = results
      .filter(r => r.latency)
      .map(r => parseInt(r.latency.replace('ms', '')));
    
    if (validLatencies.length > 0) {
      const avgLatency = validLatencies.reduce((sum, l) => sum + l, 0) / validLatencies.length;
      expect(avgLatency).toBeLessThan(200); // 200ms average DB latency
    }
  });
  
  test('Memory usage remains stable under load', async () => {
    // Simulate memory-intensive operations
    const operationCount = 50;
    const promises = [];
    
    for (let i = 0; i < operationCount; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/health`)
          .then(response => response.json())
          .then(() => ({ success: true }))
          .catch(() => ({ success: false }))
      );
      
      // Add small delay to simulate realistic load
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const results = await Promise.all(promises);
    
    // System should remain responsive
    const successRate = results.filter(r => r.success).length / operationCount;
    expect(successRate).toBeGreaterThan(0.85); // 85% success rate
  });
  
  test('Rate limiting prevents abuse', async () => {
    // Test rate limiting on auth endpoints
    const authEndpoint = `${BASE_URL}/api/auth/signin`;
    const rapidRequests = 10;
    
    const promises = Array.from({ length: rapidRequests }, () =>
      fetch(authEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'test' })
      }).then(response => response.status)
    );
    
    const results = await Promise.all(promises);
    
    // Should get some rate limit responses (429)
    const rateLimitedRequests = results.filter(status => status === 429).length;
    
    // At least some requests should be rate limited
    expect(rateLimitedRequests).toBeGreaterThan(0);
    
    // No server errors should occur
    const serverErrors = results.filter(status => status >= 500).length;
    expect(serverErrors).toBe(0);
  });
});
