type Key = string;
type Bucket = { tokens: number; last: number };

const store = new Map<Key, Bucket>();

function now(): number { 
  return Date.now(); 
}

function capacity(kind: 'auth' | 'api') {
  const enabled = (process.env.RATE_LIMIT_ENABLED || 'true') === 'true';
  if (!enabled) return { enabled: false, limit: Infinity, refillMs: 60000 };
  
  if (kind === 'auth') {
    return { 
      enabled: true, 
      limit: Number(process.env.RATE_LIMIT_AUTH_PER_MINUTE || 5), 
      refillMs: 60000 
    };
  }
  
  return { 
    enabled: true, 
    limit: Number(process.env.RATE_LIMIT_API_PER_MINUTE || 30), 
    refillMs: 60000 
  };
}

export function rateKey(kind: 'auth' | 'api', id: string): string {
  return `${kind}:${id}`;
}

/**
 * Token bucket: limit N per minute, smooth refills.
 * Returns { ok: boolean, remaining: number }
 */
export function consume(kind: 'auth' | 'api', id: string): { ok: boolean; remaining: number } {
  const cfg = capacity(kind);
  if (!cfg.enabled) return { ok: true, remaining: Infinity };

  const k = rateKey(kind, id);
  const t = now();

  let b = store.get(k);
  if (!b) {
    b = { tokens: cfg.limit - 1, last: t };
    store.set(k, b);
    return { ok: true, remaining: b.tokens };
  }

  // refill tokens based on elapsed time
  const elapsed = t - b.last;
  if (elapsed > 0) {
    const refill = Math.floor((elapsed / cfg.refillMs) * cfg.limit);
    if (refill > 0) {
      b.tokens = Math.min(cfg.limit, b.tokens + refill);
      b.last = t;
    }
  }
  
  if (b.tokens <= 0) return { ok: false, remaining: 0 };
  
  b.tokens -= 1;
  return { ok: true, remaining: b.tokens };
}

/** Helper to identify requester: prefer userId; else IP. */
export function requesterId(req: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  
  // Next.js behind proxy: use x-forwarded-for first IP
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return `ip:${xff.split(',')[0].trim()}`;
  
  const rip = (req.headers.get('x-real-ip') || '').trim();
  return `ip:${rip || 'unknown'}`;
}
