// Small per-isolate token bucket. Cloudflare runs many isolates, so this is a cheap
// first line of defence, not a global guarantee (see DEPLOY.md for the optional
// Cloudflare rate-limiting rule, free for one rule).
const buckets = new Map<string, { tokens: number; at: number }>();

export function rateLimit(key: string, capacity: number, refillPerMinute: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, at: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.at) / 60000) * refillPerMinute);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now - v.at > 600000) buckets.delete(k);
  }
  return true;
}

export function clientIp(headers: Headers): string {
  return headers.get('cf-connecting-ip') ?? headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
}
