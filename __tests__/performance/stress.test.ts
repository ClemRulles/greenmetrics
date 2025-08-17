import { describe, test, expect } from 'vitest';

describe('Stress Testing', () => {
  const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
  
  test('System handles sustained high load', async () => {
    const duration = 30000; // 30 seconds
    const requestsPerSecond = 5;
    const interval = 1000 / requestsPerSecond;
    
    const results: Array<{ success: boolean; responseTime: number }> = [];
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      const requestStart = Date.now();
      
      try {
        const response = await fetch(`${BASE_URL}/api/health`);
        const responseTime = Date.now() - requestStart;
        
        results.push({
          success: response.ok,
          responseTime
        });
      } catch (error) {
        results.push({
          success: false,
          responseTime: Date.now() - requestStart
        });
      }
      
      // Wait for next interval
      const elapsed = Date.now() - requestStart;
      if (elapsed < interval) {
        await new Promise(resolve => setTimeout(resolve, interval - elapsed));
      }
    }
    
    // Analyze results
    const successRate = results.filter(r => r.success).length / results.length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const maxResponseTime = Math.max(...results.map(r => r.responseTime));
    
    console.log(`Stress test results:
      - Requests: ${results.length}
      - Success rate: ${(successRate * 100).toFixed(1)}%
      - Average response time: ${avgResponseTime.toFixed(0)}ms
      - Max response time: ${maxResponseTime}ms`);
    
    // Assertions
    expect(successRate).toBeGreaterThan(0.95); // 95% success rate under stress
    expect(avgResponseTime).toBeLessThan(2000); // Average under 2s
    expect(maxResponseTime).toBeLessThan(10000); // No request over 10s
  });
  
  test('Database connection pool under stress', async () => {
    const concurrentConnections = 25;
    const operationsPerConnection = 5;
    
    const promises = Array.from({ length: concurrentConnections }, async () => {
      const connectionResults = [];
      
      for (let i = 0; i < operationsPerConnection; i++) {
        const startTime = Date.now();
        
        try {
          const response = await fetch(`${BASE_URL}/api/health`);
          const data = await response.json();
          const responseTime = Date.now() - startTime;
          
          connectionResults.push({
            success: data.checks?.database?.status === 'healthy',
            responseTime,
            dbLatency: data.checks?.database?.latency ? 
              parseInt(data.checks.database.latency.replace('ms', '')) : null
          });
        } catch (error) {
          connectionResults.push({
            success: false,
            responseTime: Date.now() - startTime,
            dbLatency: null
          });
        }
        
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return connectionResults;
    });
    
    const allResults = (await Promise.all(promises)).flat();
    
    // Analyze database performance under stress
    const dbSuccessRate = allResults.filter(r => r.success).length / allResults.length;
    const validLatencies = allResults
      .filter(r => r.dbLatency !== null && r.dbLatency !== undefined)
      .map(r => r.dbLatency!) // Non-null assertion after filter
      .filter(l => typeof l === 'number');
    const avgDbLatency = validLatencies.length > 0 ? 
      validLatencies.reduce((sum, l) => sum + l, 0) / validLatencies.length : 0;
    
    console.log(`Database stress test:
      - Total operations: ${allResults.length}
      - Success rate: ${(dbSuccessRate * 100).toFixed(1)}%
      - Average DB latency: ${avgDbLatency.toFixed(0)}ms`);
    
    expect(dbSuccessRate).toBeGreaterThan(0.90); // 90% DB success under stress
    expect(avgDbLatency).toBeLessThan(500); // Average DB latency under 500ms
  });
  
  test('Memory and resource cleanup under stress', async () => {
    // Create stress with varying request sizes
    const iterations = 20;
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const batchSize = Math.floor(Math.random() * 10) + 5; // 5-15 concurrent requests
      const batchPromises = [];
      
      for (let j = 0; j < batchSize; j++) {
        batchPromises.push(
          fetch(`${BASE_URL}/api/health`)
            .then(response => response.json())
            .then(() => ({ success: true }))
            .catch(() => ({ success: false }))
        );
      }
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Check if system is still responsive
      const healthCheck = await fetch(`${BASE_URL}/api/health`);
      expect(healthCheck.ok).toBe(true);
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const overallSuccessRate = results.filter(r => r.success).length / results.length;
    expect(overallSuccessRate).toBeGreaterThan(0.85); // 85% success under variable load
  });
  
  test('Error handling under extreme load', async () => {
    // Generate extreme load to test error handling
    const extremeLoad = 50;
    const rapidFire = Array.from({ length: extremeLoad }, () =>
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
    
    const results = await Promise.all(rapidFire);
    
    // System should handle extreme load gracefully
    const successfulRequests = results.filter(r => r.ok).length;
    const rateLimitedRequests = results.filter(r => r.status === 429).length;
    const serverErrors = results.filter(r => r.status >= 500).length;
    
    console.log(`Extreme load test:
      - Total requests: ${results.length}
      - Successful: ${successfulRequests}
      - Rate limited: ${rateLimitedRequests}
      - Server errors: ${serverErrors}`);
    
    // Should either succeed or be rate limited (not crash)
    expect(serverErrors).toBeLessThan(results.length * 0.1); // Less than 10% server errors
    expect(successfulRequests + rateLimitedRequests).toBeGreaterThan(results.length * 0.8);
  });
  
  test('Recovery after stress period', async () => {
    // Apply stress
    const stressRequests = 30;
    const stressPromises = Array.from({ length: stressRequests }, () =>
      fetch(`${BASE_URL}/api/health`).catch(() => null)
    );
    
    await Promise.all(stressPromises);
    
    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test normal operation recovery
    const recoveryTests = 5;
    const recoveryResults = [];
    
    for (let i = 0; i < recoveryTests; i++) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${BASE_URL}/api/health`);
        const responseTime = Date.now() - startTime;
        
        recoveryResults.push({
          success: response.ok,
          responseTime
        });
      } catch (error) {
        recoveryResults.push({
          success: false,
          responseTime: Date.now() - startTime
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // System should have recovered
    const recoverySuccessRate = recoveryResults.filter(r => r.success).length / recoveryResults.length;
    const avgRecoveryTime = recoveryResults.reduce((sum, r) => sum + r.responseTime, 0) / recoveryResults.length;
    
    expect(recoverySuccessRate).toBe(1); // 100% success after recovery
    expect(avgRecoveryTime).toBeLessThan(1000); // Back to normal response times
  });
});
