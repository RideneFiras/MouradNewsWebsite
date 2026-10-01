import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { SERVICE_KEY } from './helpers';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

test.describe('security', () => {
  test('security headers on public and admin pages', async ({ request }) => {
    for (const path of ['/ar', '/ar/admin/login']) {
      const h = (await request.get(path)).headers();
      expect(h['content-security-policy'], path).toContain("object-src 'none'");
      expect(h['content-security-policy'], path).toContain("frame-ancestors 'self'");
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(h['x-frame-options']).toBe('SAMEORIGIN');
      expect(h['strict-transport-security']).toContain('max-age=');
      expect(h['x-powered-by']).toBeUndefined();
    }
  });

  test('no server secret in any browser bundle', async () => {
    const secrets = [SERVICE_KEY, process.env.REVALIDATE_SECRET, process.env.TRACKER_HMAC_SECRET].filter((s): s is string => !!s && s.length > 8);
    expect(secrets.length).toBeGreaterThan(0);
    const bundle = files('.next/static').filter((f) => /\.(js|css|json|txt)$/.test(f));
    expect(bundle.length).toBeGreaterThan(10);
    for (const f of bundle) {
      const src = readFileSync(f, 'utf8');
      for (const s of secrets) expect(src.includes(s), `${s.slice(0, 6)}… found in ${f}`).toBe(false);
      expect(/SUPABASE_SERVICE_ROLE_KEY|sb_secret_/.test(src), f).toBe(false);
    }
  });

  test('admin pages and APIs refuse anonymous visitors', async ({ request }) => {
    const r = await request.get('/ar/admin/stats', { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(r.status());
    expect(r.headers().location).toContain('/admin/login');
    const csv = await request.get('/ar/admin/stats/export?table=articles', { maxRedirects: 0 });
    expect(csv.status() === 401 || /\/admin\/login/.test(csv.headers().location ?? '')).toBe(true);
    expect((await request.post('/api/revalidate', { data: { tags: ['articles'] } })).status()).toBe(401);
  });

  test('contact form rejects bots (honeypot) and floods', async ({ request }) => {
    const base = { name: 'اختبار', email: 'reader@example.com', subject: 'general', message: 'رسالة اختبار للتحقق من الحماية.', locale: 'ar' };
    const hp = await request.post('/api/contact', { data: { ...base, website: 'http://spam.example', started_at: Date.now() - 60_000 } });
    expect([200, 204, 400, 429]).toContain(hp.status()); // 429 if earlier runs already used this IP's bucket
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await request.post('/api/contact', { data: { ...base, started_at: Date.now() - 60_000 } })).status());
    expect(statuses).toContain(429);
  });
});
