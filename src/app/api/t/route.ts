import { after } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { serverEnv } from '@/lib/env.server';
import { classifySource, referrerHost } from '@/lib/analytics/classify';
import { deviceFromUA } from '@/lib/analytics/device';
import { verifyToken } from '@/lib/analytics/token';
import { countryOf, hasStaffSession, isBotRequest } from '@/lib/analytics/request';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

const s = (max: number) => z.string().max(max).nullish();
const Pageview = z.object({
  type: z.literal('pv'),
  pv_id: z.string().uuid(),
  path: z.string().min(1).max(1200).regex(/^\/(ar|fr)(\/|$)/),
  article_public_id: z.number().int().positive().nullish(),
  category_slug: z.string().regex(/^[a-z0-9-]{1,80}$/).nullish(),
  locale: z.enum(['ar', 'fr']),
  referrer: s(1000),
  utm_source: s(80), utm_medium: s(80), utm_campaign: s(120),
  screen_w: z.number().int().min(0).max(10000).nullish(),
  ts_token: z.string().max(64),
});
const Engagement = z.object({
  type: z.literal('eng'),
  pv_id: z.string().uuid(),
  engaged_seconds: z.number().int().min(0).max(100000),
  max_scroll_pct: z.number().int().min(0).max(100),
});
const Body = z.discriminatedUnion('type', [Pageview, Engagement]);

const noContent = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

/** First-party analytics beacon (docs/07). Always answers 204; invalid hits are dropped silently. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 2048) return new Response(null, { status: 413 });
  const ua = request.headers.get('user-agent');
  if (isBotRequest(ua) || hasStaffSession(request.headers.get('cookie'))) return noContent();
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(JSON.parse(raw));
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.warn('beacon rejected', e instanceof z.ZodError ? e.issues.map((i) => i.path.join('.')) : 'json');
    return new Response(null, { status: 400 });
  }
  const ip = clientIp(request.headers);
  const db = adminClient();

  if (body.type === 'eng') {
    if (!rateLimit(`eng:${ip}`, 240, 240)) return noContent();
    const b = body;
    after(async () => {
      await db.rpc('track_engagement', { p_pv_id: b.pv_id, p_engaged_seconds: Math.min(1800, b.engaged_seconds), p_max_scroll_pct: b.max_scroll_pct });
    });
    return noContent();
  }

  if (!rateLimit(`pv:${ip}`, 60, 60)) return noContent();
  if (!(await verifyToken(serverEnv.trackerSecret(), body.ts_token))) return noContent();
  const ownHost = new URL(request.url).host;
  const source = classifySource({ referrer: body.referrer, utmSource: body.utm_source, utmMedium: body.utm_medium, ownHost });
  const pv = body;
  after(async () => {
    const { error } = await db.rpc('track_pageview', {
      p_pv_id: pv.pv_id, p_path: pv.path, p_article_public_id: pv.article_public_id ?? null, p_category_slug: pv.category_slug ?? null,
      p_locale: pv.locale, p_source: source, p_referrer_host: source === 'internal' ? null : referrerHost(pv.referrer),
      p_utm_source: pv.utm_source ?? null, p_utm_medium: pv.utm_medium ?? null, p_utm_campaign: pv.utm_campaign ?? null,
      p_country: countryOf(request.headers), p_device: deviceFromUA(ua), p_ip: ip, p_ua: ua ?? '',
    });
    if (error) console.error('track_pageview failed', { code: error.code });
  });
  return noContent();
}
