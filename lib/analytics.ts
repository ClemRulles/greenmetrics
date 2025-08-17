import { cookies } from 'next/headers';
import { sha256Base64 } from './hash';

type ClientLike = { 
  capture: (e: { event: string; distinctId?: string; properties?: Record<string, unknown> }) => void; 
  flush: () => Promise<void> 
};

let client: ClientLike | null = null;

function enabled() {
  return (process.env.POSTHOG_ENABLED || 'true') === 'true' && !!process.env.POSTHOG_KEY;
}

function getClient(): ClientLike | null {
  if (!enabled()) return null;
  if (client) return client;
  // Lazy require to avoid bundling in edge
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PostHog } = require('posthog-node') as { PostHog: new (key: string, opts: Record<string, unknown>) => ClientLike };
  client = new PostHog(process.env.POSTHOG_KEY!, { 
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com' 
  });
  return client;
}

export async function trackServerEvent(params: {
  req: Request;
  userId?: string | null;
  event: 'report_computed' | 'report_exported';
  properties?: Record<string, unknown>;
}) {
  // Consent gating
  const c = await cookies();
  const consent = c.get('consent')?.value;
  if (consent !== 'accepted') return;

  const cli = getClient();
  if (!cli) return;

  const distinctId = params.userId ? sha256Base64(params.userId) : undefined;
  const url = new URL(params.req.url);
  const locale = url.pathname.split('/')[1]; // /en/... or /fr/...
  const requestId = params.req.headers.get('x-request-id') || undefined;

  cli.capture({
    event: params.event,
    distinctId,
    properties: {
      ...params.properties,
      locale,
      requestId,
      // DO NOT include PII (email, names)
      $lib: 'greenmetrics-server',
      $process_uptime: process.uptime(),
    },
  });
  await cli.flush().catch(() => {});
}
