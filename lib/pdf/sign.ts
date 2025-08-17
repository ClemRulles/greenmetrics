import crypto from 'crypto';

const secret = () => (process.env.SIGNED_URL_SECRET || 'dev-secret');

export function makeSignedUrlParams(assetId: string, ttlSeconds = Number(process.env.SIGNED_URL_TTL_SECONDS || 86400)) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const base = `${assetId}|${exp}`;
  const sig = crypto.createHmac('sha256', secret()).update(base).digest('base64url');
  return { exp, sig };
}

export function verifySignature(assetId: string, exp: number, sig: string) {
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  const base = `${assetId}|${exp}`;
  const expected = crypto.createHmac('sha256', secret()).update(base).digest('base64url');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
