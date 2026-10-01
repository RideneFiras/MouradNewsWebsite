import 'server-only';
import { serverEnv } from '@/lib/env.server';

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(serverEnv.trackerSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Buffer.from(sig).toString('base64url');
}

/** Signed preview link token for a draft (valid 7 days). */
export async function previewToken(kind: 'article' | 'page', id: string, ttlSeconds = 7 * 86400): Promise<{ t: string; e: number }> {
  const e = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { t: await hmac(`preview:${kind}:${id}:${e}`), e };
}

export async function verifyPreviewToken(kind: 'article' | 'page', id: string, t: string, e: number): Promise<boolean> {
  if (!t || !Number.isFinite(e) || e < Date.now() / 1000) return false;
  const expected = await hmac(`preview:${kind}:${id}:${e}`);
  if (expected.length !== t.length) return false;
  let diff = 0;
  for (let i = 0; i < t.length; i++) diff |= t.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
