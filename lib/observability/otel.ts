// OpenTelemetry placeholder for Next.js
// Simplified version to avoid webpack issues in Next.js 15

export async function registerOtel(): Promise<void> {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    return;
  }

  const isEnabled = process.env.OTEL_ENABLED === 'true';
  
  if (!isEnabled) {
    console.log('OpenTelemetry disabled');
    return;
  }

  try {
    // For now, just log that we would initialize OpenTelemetry
    // This avoids the Node.js module resolution issues in Next.js webpack
    console.log('OpenTelemetry placeholder initialized (production would have full OTEL)');
    
    // In a real implementation, you would:
    // 1. Import OpenTelemetry SDK
    // 2. Configure resource attributes
    // 3. Set up trace exporters
    // 4. Configure sampling
    // 5. Enable auto-instrumentations
    
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error);
    // Don't throw - continue execution without tracing
  }
}
