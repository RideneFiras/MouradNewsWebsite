import { adminClient } from '@/lib/supabase/admin';
import { hasStaffSession, isBotRequest } from '@/lib/analytics/request';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function go(url: string | null, fallback: string) {
  const target = url && /^https:\/\/[^\s]+$/.test(url) ? url : fallback;
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}

/** Sponsor click: counts (unless bot/staff/flood) then redirects to the campaign's https link. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const home = new URL('/', request.url).toString();
  if (!UUID.test(id)) return go(null, home);
  const db = adminClient();
  const ip = clientIp(request.headers);
  const count = !isBotRequest(request.headers.get('user-agent'))
    && !hasStaffSession(request.headers.get('cookie'))
    && rateLimit(`adc:${ip}:${id}`, 5, 5);
  if (count) {
    const { data } = await db.rpc('record_ad_click', { p_campaign_id: id });
    return go((data as string | null) ?? null, home);
  }
  const { data } = await db.from('ad_campaigns').select('click_url').eq('id', id).maybeSingle();
  return go(data?.click_url ?? null, home);
}
