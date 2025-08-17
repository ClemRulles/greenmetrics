/**
 * Next.js Instrumentation Hook
 * 
 * This file is automatically loaded by Next.js when the application starts.
 * It's used to initialize OpenTelemetry tracing before any other code runs.
 */

// Temporarily disabled to avoid webpack bundle issues
// import { registerOtel } from '@/lib/observability/otel';

export async function register() {
  // Initialize OpenTelemetry if enabled
  // This is a safe no-op if OTEL_ENABLED !== 'true'
  // Temporarily disabled to avoid Node.js module resolution issues in Next.js
  console.log('Instrumentation hook called (OpenTelemetry temporarily disabled)');
  
  // In production, you would:
  // await registerOtel();
}
