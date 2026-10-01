import { getStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { toCsv } from '@/lib/stats/csv';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff || staff.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { id } = await params;
  const db = await sessionClient();
  const [{ data: c }, { data: rows, error }] = await Promise.all([
    db.from('ad_campaigns').select('sponsor_name').eq('id', id).maybeSingle(),
    db.rpc('ad_campaign_report', { p_campaign_id: id }),
  ]);
  if (!c || error) return new Response('Not found', { status: 404 });
  const r = (rows ?? []) as { date: string; impressions: number; clicks: number }[];
  const csv = toCsv(['date', 'impressions', 'clicks', 'ctr'], r.map((x) => [String(x.date).slice(0, 10), x.impressions, x.clicks, x.impressions ? (x.clicks / x.impressions).toFixed(4) : '']));
  const slug = c.sponsor_name.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'campaign';
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`sponsor-${slug}.csv`)}`, 'Cache-Control': 'private, no-store' },
  });
}
