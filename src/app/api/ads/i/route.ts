import { after } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { serverEnv } from '@/lib/env.server';
import { verifyToken } from '@/lib/analytics/token';
import { hasStaffSession, isBotRequest } from '@/lib/analytics/request';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

const Body = z.object({
  campaign_id: z.string().uuid(),
  slot: z.string().regex(/^[a-z0-9_]{1,40}$/),
  ts_token: z.string().max(64),
});
const noContent = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

/** Sponsor ad impression beacon. Same anti-abuse rules as /api/t (docs/07). */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 512) return new Response(null, { status: 413 });
  if (isBotRequest(request.headers.get('user-agent')) || hasStaffSession(request.headers.get('cookie'))) return noContent();
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(JSON.parse(raw));
  } catch {
    return new Response(null, { status: 400 });
  }
  const ip = clientIp(request.headers);
  // A page view shows a campaign at most a few times; reloading in a loop isn't a reader.
  if (!rateLimit(`adi:${ip}`, 120, 120) || !rateLimit(`adi:${ip}:${body.campaign_id}`, 10, 10)) return noContent();
  if (!(await verifyToken(serverEnv.trackerSecret(), body.ts_token))) return noContent();
  const id = body.campaign_id;
  after(async () => {
    const { error } = await adminClient().rpc('record_ad_impression', { p_campaign_id: id });
    if (error) console.error('record_ad_impression failed', { code: error.code });
  });
  return noContent();
}
