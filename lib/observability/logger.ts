/**
 * Structured Logger for GreenMetrics
 * 
 * Provides JSON structured logging with:
 * - Request correlation via request ID
 * - PII redaction for privacy compliance
 * - Configurable log levels
 * - Pretty printing for development
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  reqId?: string;
  orgId?: string;
  route?: string;
  region?: string;
  duration?: number;
  status?: number;
  [key: string]: any;
}

class Logger {
  private logLevel: LogLevel;
  private prettyPrint: boolean;
  private redactKeys: string[];

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.prettyPrint = process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV === 'development';
    
    // Parse redaction keys from environment
    try {
      const redactKeysEnv = process.env.LOG_REDACT_KEYS;
      this.redactKeys = redactKeysEnv ? JSON.parse(redactKeysEnv) : [
        'req.headers.cookie',
        'authorization',
        'email',
        'password',
        'token',
        'secret',
        'key'
      ];
    } catch (error) {
      this.redactKeys = ['authorization', 'email', 'password', 'token', 'secret', 'key'];
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  private redactValue(value: any): any {
    if (typeof value === 'string') {
      // Redact common patterns
      return value
        .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[REDACTED_EMAIL]')
        .replace(/(Bearer\s+[a-zA-Z0-9._-]+)/gi, 'Bearer [REDACTED_TOKEN]')
        .replace(/(sk_[a-zA-Z0-9_]+)/g, '[REDACTED_SECRET_KEY]')
        .replace(/(pk_[a-zA-Z0-9_]+)/g, '[REDACTED_PUBLIC_KEY]');
    }

    if (typeof value === 'object' && value !== null) {
      const redacted = Array.isArray(value) ? [...value] : { ...value };
      
      for (const [key, val] of Object.entries(redacted)) {
        const keyLower = key.toLowerCase();
        
        // Check if key should be redacted
        const shouldRedact = this.redactKeys.some(redactKey => 
          keyLower.includes(redactKey.toLowerCase()) || 
          redactKey.toLowerCase().includes(keyLower)
        );

        if (shouldRedact) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redactValue(val);
        }
      }
      
      return redacted;
    }

    return value;
  }

  private formatEntry(entry: LogEntry): LogEntry {
    const redacted = this.redactValue(entry);
    
    // Ensure timestamp is ISO string
    if (!redacted.ts) {
      redacted.ts = new Date().toISOString();
    }

    // Add region if available
    if (!redacted.region && process.env.REGION) {
      redacted.region = process.env.REGION;
    }

    return redacted;
  }

  private output(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);

    if (this.prettyPrint) {
      // Pretty print for development
      const { ts, level, msg, ...meta } = formatted;
      const timestamp = new Date(ts).toLocaleTimeString();
      const levelUpper = level.toUpperCase().padEnd(5);
      
      let output = `${timestamp} ${levelUpper} ${msg}`;
      
      if (Object.keys(meta).length > 0) {
        output += '\n' + JSON.stringify(meta, null, 2);
      }
      
      console.log(output);
    } else {
      // JSON output for production
      console.log(JSON.stringify(formatted));
    }
  }

  debug(msg: string, meta: Record<string, any> = {}): void {
    if (!this.shouldLog('debug')) return;
    
    this.output({
      ts: new Date().toISOString(),
      level: 'debug',
      msg,
      ...meta
    });
  }

  info(msg: string, meta: Record<string, any> = {}): void {
    if (!this.shouldLog('info')) return;
    
    this.output({
      ts: new Date().toISOString(),
      level: 'info',
      msg,
      ...meta
    });
  }

  warn(msg: string, meta: Record<string, any> = {}): void {
    if (!this.shouldLog('warn')) return;
    
    this.output({
      ts: new Date().toISOString(),
      level: 'warn',
      msg,
      ...meta
    });
  }

  error(msg: string, meta: Record<string, any> = {}): void {
    if (!this.shouldLog('error')) return;

    // Enhanced error logging
    const errorMeta = { ...meta };
    
    // Extract error details if error object is provided
    if (meta.error && meta.error instanceof Error) {
      errorMeta.err = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack
      };
      delete errorMeta.error; // Remove original error object
    }
    
    this.output({
      ts: new Date().toISOString(),
      level: 'error',
      msg,
      ...errorMeta
    });
  }

  // Request-scoped logger
  withRequest(reqId: string, route?: string, orgId?: string): RequestLogger {
    return new RequestLogger(this, reqId, route, orgId);
  }

  // Timer helper
  time(label: string): Timer {
    return new Timer(this, label);
  }
}

class RequestLogger {
  constructor(
    private logger: Logger,
    private reqId: string,
    private route?: string,
    private orgId?: string
  ) {}

  private getBaseMeta(): Record<string, any> {
    const meta: Record<string, any> = { reqId: this.reqId };
    
    if (this.route) meta.route = this.route;
    if (this.orgId) meta.orgId = this.orgId;
    
    return meta;
  }

  debug(msg: string, meta: Record<string, any> = {}): void {
    this.logger.debug(msg, { ...this.getBaseMeta(), ...meta });
  }

  info(msg: string, meta: Record<string, any> = {}): void {
    this.logger.info(msg, { ...this.getBaseMeta(), ...meta });
  }

  warn(msg: string, meta: Record<string, any> = {}): void {
    this.logger.warn(msg, { ...this.getBaseMeta(), ...meta });
  }

  error(msg: string, meta: Record<string, any> = {}): void {
    this.logger.error(msg, { ...this.getBaseMeta(), ...meta });
  }

  time(label: string): Timer {
    return new Timer(this.logger, label, this.getBaseMeta());
  }
}

class Timer {
  private startTime: number;

  constructor(
    private logger: Logger,
    private label: string,
    private baseMeta: Record<string, any> = {}
  ) {
    this.startTime = Date.now();
  }

  end(msg?: string, meta: Record<string, any> = {}): number {
    const duration = Date.now() - this.startTime;
    const message = msg || `${this.label} completed`;
    
    this.logger.info(message, {
      ...this.baseMeta,
      ...meta,
      duration,
      label: this.label
    });
    
    return duration;
  }
}

// Default logger instance
export const logger = new Logger();

// Export types and classes for advanced usage
export type { LogLevel, LogEntry };
export { Logger, RequestLogger, Timer };

// Helper to create request-scoped logger from Next.js request
export function createRequestLogger(req: any): RequestLogger {
  const reqId = req.headers?.['x-request-id'] || 'unknown';
  const route = req.url || req.route?.path || 'unknown';
  const orgId = req.user?.orgId || req.headers?.['x-org-id'];
  
  return logger.withRequest(reqId, route, orgId);
}

// Structured error logging helper
export function logError(error: Error, context: Record<string, any> = {}): void {
  logger.error('Unhandled error occurred', {
    error,
    context,
    stack: error.stack
  });
}

// Performance logging helper
export function logPerformance(
  operation: string, 
  duration: number, 
  meta: Record<string, any> = {}
): void {
  logger.info(`Performance: ${operation}`, {
    operation,
    duration,
    ...meta
  });
}
