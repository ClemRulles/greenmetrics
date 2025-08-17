export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  timestamp: Date;
}

export interface MonitoringMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  availability: number;
}

export class HealthMonitor {
  private static instance: HealthMonitor;
  private metrics: Map<string, MonitoringMetrics> = new Map();
  private checkHistory: Map<string, HealthCheckResult[]> = new Map();

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  async performHealthCheck(service: string, checkFn: () => Promise<HealthCheckResult>): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await checkFn();
      const latency = Date.now() - startTime;
      
      const enhancedResult = {
        ...result,
        latency: latency,
        timestamp: new Date()
      };

      this.recordCheck(service, enhancedResult);
      return enhancedResult;
    } catch (error) {
      const failedResult: HealthCheckResult = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
        timestamp: new Date()
      };

      this.recordCheck(service, failedResult);
      return failedResult;
    }
  }

  private recordCheck(service: string, result: HealthCheckResult): void {
    if (!this.checkHistory.has(service)) {
      this.checkHistory.set(service, []);
    }

    const history = this.checkHistory.get(service)!;
    history.push(result);

    // Keep only last 100 checks
    if (history.length > 100) {
      history.shift();
    }

    // Update metrics
    this.updateMetrics(service, history);
  }

  private updateMetrics(service: string, history: HealthCheckResult[]): void {
    const recent = history.slice(-20); // Last 20 checks
    
    const responseTime = recent.reduce((sum, check) => sum + (check.latency || 0), 0) / recent.length;
    const errorRate = recent.filter(check => check.status === 'unhealthy').length / recent.length;
    const availability = recent.filter(check => check.status === 'healthy').length / recent.length;
    
    this.metrics.set(service, {
      responseTime,
      errorRate,
      throughput: recent.length, // Simplified throughput metric
      availability
    });
  }

  getMetrics(service: string): MonitoringMetrics | undefined {
    return this.metrics.get(service);
  }

  getOverallHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; score: number } {
    const allMetrics = Array.from(this.metrics.values());
    
    if (allMetrics.length === 0) {
      return { status: 'healthy', score: 1.0 };
    }

    const avgAvailability = allMetrics.reduce((sum, metric) => sum + metric.availability, 0) / allMetrics.length;
    const avgErrorRate = allMetrics.reduce((sum, metric) => sum + metric.errorRate, 0) / allMetrics.length;

    const healthScore = avgAvailability * (1 - avgErrorRate);

    if (healthScore >= 0.99) return { status: 'healthy', score: healthScore };
    if (healthScore >= 0.95) return { status: 'degraded', score: healthScore };
    return { status: 'unhealthy', score: healthScore };
  }
}

export class SyntheticMonitor {
  private healthMonitor: HealthMonitor;

  constructor() {
    this.healthMonitor = HealthMonitor.getInstance();
  }

  async checkEndpoint(url: string, options: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
    expectedStatus?: number;
  } = {}): Promise<HealthCheckResult> {
    return this.healthMonitor.performHealthCheck(`endpoint:${url}`, async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 5000);

      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: options.headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const expectedStatus = options.expectedStatus || 200;
        if (response.status === expectedStatus) {
          return { status: 'healthy', timestamp: new Date() };
        } else {
          return {
            status: 'unhealthy',
            error: `Expected status ${expectedStatus}, got ${response.status}`,
            timestamp: new Date()
          };
        }
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });
  }

  async checkDatabase(): Promise<HealthCheckResult> {
    return this.healthMonitor.performHealthCheck('database', async () => {
      const { prisma } = await import('@/lib/prisma');
      
      await prisma.$queryRaw`SELECT 1`;
      
      return { status: 'healthy', timestamp: new Date() };
    });
  }

  async checkRedis(): Promise<HealthCheckResult> {
    return this.healthMonitor.performHealthCheck('redis', async () => {
      if (process.env.UPSTASH_REDIS_REST_URL) {
        const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          return { status: 'healthy', timestamp: new Date() };
        } else {
          throw new Error(`Redis ping failed: ${response.status}`);
        }
      }

      return { status: 'healthy', timestamp: new Date() };
    });
  }

  getServiceMetrics(service: string): MonitoringMetrics | undefined {
    return this.healthMonitor.getMetrics(service);
  }

  getOverallHealth() {
    return this.healthMonitor.getOverallHealth();
  }
}

export const syntheticMonitor = new SyntheticMonitor();
