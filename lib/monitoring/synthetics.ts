export interface SyntheticTestConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  interval: number; // seconds
  timeout: number; // milliseconds
  regions: string[];
  assertions: SyntheticAssertion[];
}

export interface SyntheticAssertion {
  type: 'status' | 'response_time' | 'body_contains' | 'header_present' | 'json_path';
  target: string | number;
  operator: 'equals' | 'less_than' | 'greater_than' | 'contains' | 'not_contains';
  value?: any;
}

export interface SyntheticResult {
  testId: string;
  region: string;
  timestamp: Date;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  assertions: { [key: string]: boolean };
}

export class SyntheticTestRunner {
  private tests: Map<string, SyntheticTestConfig> = new Map();
  private results: SyntheticResult[] = [];
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  addTest(config: SyntheticTestConfig): void {
    this.tests.set(config.id, config);
  }

  removeTest(testId: string): void {
    this.stopTest(testId);
    this.tests.delete(testId);
  }

  startTest(testId: string): void {
    const config = this.tests.get(testId);
    if (!config) throw new Error(`Test ${testId} not found`);

    const interval = setInterval(async () => {
      for (const region of config.regions) {
        await this.runTest(config, region);
      }
    }, config.interval * 1000);

    this.intervals.set(testId, interval);
  }

  stopTest(testId: string): void {
    const interval = this.intervals.get(testId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(testId);
    }
  }

  private async runTest(config: SyntheticTestConfig, region: string): Promise<SyntheticResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const responseText = await response.text();

      // Run assertions
      const assertionResults: { [key: string]: boolean } = {};
      let allAssertionsPassed = true;

      for (const assertion of config.assertions) {
        const result = this.evaluateAssertion(assertion, {
          statusCode: response.status,
          responseTime,
          body: responseText,
          headers: response.headers
        });
        
        assertionResults[`${assertion.type}_${assertion.operator}_${assertion.target}`] = result;
        if (!result) allAssertionsPassed = false;
      }

      const result: SyntheticResult = {
        testId: config.id,
        region,
        timestamp: new Date(),
        success: allAssertionsPassed,
        responseTime,
        statusCode: response.status,
        assertions: assertionResults
      };

      this.results.push(result);
      this.pruneResults();

      return result;
    } catch (error) {
      const result: SyntheticResult = {
        testId: config.id,
        region,
        timestamp: new Date(),
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        assertions: {}
      };

      this.results.push(result);
      this.pruneResults();

      return result;
    }
  }

  private evaluateAssertion(assertion: SyntheticAssertion, response: {
    statusCode: number;
    responseTime: number;
    body: string;
    headers: Headers;
  }): boolean {
    let actualValue: any;

    switch (assertion.type) {
      case 'status':
        actualValue = response.statusCode;
        break;
      case 'response_time':
        actualValue = response.responseTime;
        break;
      case 'body_contains':
        return assertion.operator === 'contains' 
          ? response.body.includes(assertion.target as string)
          : !response.body.includes(assertion.target as string);
      case 'header_present':
        return response.headers.has(assertion.target as string);
      case 'json_path':
        try {
          const json = JSON.parse(response.body);
          actualValue = this.getJsonPath(json, assertion.target as string);
        } catch {
          return false;
        }
        break;
      default:
        return false;
    }

    switch (assertion.operator) {
      case 'equals':
        return actualValue === assertion.value;
      case 'less_than':
        return actualValue < assertion.value;
      case 'greater_than':
        return actualValue > assertion.value;
      case 'contains':
        return String(actualValue).includes(String(assertion.value));
      case 'not_contains':
        return !String(actualValue).includes(String(assertion.value));
      default:
        return false;
    }
  }

  private getJsonPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private pruneResults(): void {
    // Keep only last 1000 results
    if (this.results.length > 1000) {
      this.results = this.results.slice(-1000);
    }
  }

  getResults(testId?: string, region?: string, since?: Date): SyntheticResult[] {
    let filtered = this.results;

    if (testId) {
      filtered = filtered.filter(r => r.testId === testId);
    }

    if (region) {
      filtered = filtered.filter(r => r.region === region);
    }

    if (since) {
      filtered = filtered.filter(r => r.timestamp >= since);
    }

    return filtered;
  }

  getAvailability(testId: string, region?: string, since?: Date): number {
    const results = this.getResults(testId, region, since);
    if (results.length === 0) return 1;

    const successCount = results.filter(r => r.success).length;
    return successCount / results.length;
  }

  getAverageResponseTime(testId: string, region?: string, since?: Date): number {
    const results = this.getResults(testId, region, since);
    if (results.length === 0) return 0;

    const totalTime = results.reduce((sum, r) => sum + r.responseTime, 0);
    return totalTime / results.length;
  }
}

// Pre-configured synthetic tests
export const SYNTHETIC_TESTS: SyntheticTestConfig[] = [
  {
    id: 'homepage',
    name: 'Homepage Availability',
    url: '/en',
    method: 'GET',
    interval: 60, // 1 minute
    timeout: 10000, // 10 seconds
    regions: ['us-east', 'eu-west', 'asia-pacific'],
    assertions: [
      { type: 'status', operator: 'equals', target: 200, value: 200 },
      { type: 'response_time', operator: 'less_than', target: 2000, value: 2000 },
      { type: 'body_contains', operator: 'contains', target: 'GreenMetrics' }
    ]
  },
  {
    id: 'health-check',
    name: 'Health Check Endpoint',
    url: '/api/health',
    method: 'GET',
    interval: 30, // 30 seconds
    timeout: 5000, // 5 seconds
    regions: ['us-east', 'eu-west', 'asia-pacific'],
    assertions: [
      { type: 'status', operator: 'equals', target: 200, value: 200 },
      { type: 'response_time', operator: 'less_than', target: 1000, value: 1000 },
      { type: 'json_path', operator: 'equals', target: 'status', value: 'healthy' },
      { type: 'header_present', operator: 'equals', target: 'content-type' }
    ]
  },
  {
    id: 'api-auth',
    name: 'Authentication API',
    url: '/api/auth/session',
    method: 'GET',
    interval: 300, // 5 minutes
    timeout: 5000,
    regions: ['us-east', 'eu-west'],
    assertions: [
      { type: 'status', operator: 'less_than', target: 500, value: 500 }, // Allow 4xx but not 5xx
      { type: 'response_time', operator: 'less_than', target: 1000, value: 1000 }
    ]
  },
  {
    id: 'database-health',
    name: 'Database Connectivity',
    url: '/api/health',
    method: 'GET',
    interval: 120, // 2 minutes
    timeout: 3000,
    regions: ['us-east'],
    assertions: [
      { type: 'status', operator: 'equals', target: 200, value: 200 },
      { type: 'json_path', operator: 'equals', target: 'checks.database.status', value: 'healthy' }
    ]
  }
];

export const syntheticRunner = new SyntheticTestRunner();
