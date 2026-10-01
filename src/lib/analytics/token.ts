// Page token: an HMAC (TRACKER_HMAC_SECRET) of a 10-minute time bucket, rendered into
// every public page. /api/t and /api/ads/i refuse beacons without a recent valid token,
// which stops naive scripted inflation (posting to the endpoint without loading pages).
// See DECISIONS.md for the accepted age (pages are statically cached).

export const BUCKET_SECONDS = 600;
export const MAX_AGE_BUCKETS = 144; // 24 h: cached pages can be served a while after rendering

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) => {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data))).slice(0, 22);
}

export const currentBucket = (nowMs = Date.now()) => Math.floor(nowMs / 1000 / BUCKET_SECONDS);

export async function makeToken(secret: string, nowMs = Date.now()): Promise<string> {
  const b = currentBucket(nowMs);
  return `${b}.${await sign(secret, `t:${b}`)}`;
}

export async function verifyToken(secret: string, token: string | undefined | null, nowMs = Date.now()): Promise<boolean> {
  if (!token || token.length > 64) return false;
  const [bStr, sig] = token.split('.');
  const b = Number(bStr);
  const cur = currentBucket(nowMs);
  if (!Number.isInteger(b) || !sig || b > cur + 1 || b < cur - MAX_AGE_BUCKETS) return false;
  const expected = await sign(secret, `t:${b}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
