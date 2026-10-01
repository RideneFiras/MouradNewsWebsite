import Link from 'next/link';
import { connection } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { currentTimeMs, formatDate } from '@/lib/format/date';
import { formatInt } from '@/lib/format/number';
import { campaignStatus } from '@/lib/ads/status';
import { AdsenseForm } from '@/components/admin/ads/AdsenseForm';
import { SlotsManager, type SlotRow } from '@/components/admin/ads/SlotsManager';

export default async function AdsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: l } = await params;
  const locale = l === 'fr' ? 'fr' : 'ar';
  await requireStaff(locale, ['admin']);
  await connection();
  const t = await getTranslations({ locale, namespace: 'admin.ads' });
  const db = await sessionClient();
  const [slots, campaigns, stats, settings, sample] = await Promise.all([
    db.from('ad_slots').select('*').order('created_at'),
    db.from('ad_campaigns').select('id, sponsor_name, slot_key, starts_at, ends_at, is_active, locale').order('starts_at', { ascending: false }),
    db.from('ad_daily_stats').select('campaign_id, impressions, clicks'),
    db.from('site_settings').select('key, value').in('key', ['adsense', 'ads_txt']),
    db.from('articles').select('public_id, slug, language').eq('status', 'published').order('published_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const totals = new Map<string, { i: number; c: number }>();
  for (const s of stats.data ?? []) {
    const x = totals.get(s.campaign_id) ?? { i: 0, c: 0 };
    x.i += s.impressions;
    x.c += s.clicks;
    totals.set(s.campaign_id, x);
  }
  const sv = Object.fromEntries((settings.data ?? []).map((r) => [r.key, r.value as Record<string, unknown>]));
  const slotLabel = new Map((slots.data ?? []).map((s) => [s.key, locale === 'fr' ? s.label_fr || s.label_ar : s.label_ar]));
  const now = currentTimeMs();
  const art = sample.data ? `/${sample.data.language}/article/${sample.data.public_id}/${encodeURIComponent(sample.data.slug)}?show_slots=1` : null;

  return (
    <div className="space-y-6">
      <h1 className="a-h1">{t('title')}</h1>

      <section className="a-panel p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="a-h2">{t('campaigns')}</h2>
          <Link prefetch={false} href={`/${locale}/admin/ads/campaigns/new`} className="a-btn a-btn-primary">{t('newCampaign')}</Link>
        </div>
        {(campaigns.data ?? []).length === 0 ? <p className="mt-3 text-[14px] text-ink-3">{t('noCampaigns')}</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="a-table">
              <thead><tr><th>{t('sponsor')}</th><th>{t('slot')}</th><th>{t('period')}</th><th>{t('status')}</th><th>{t('impressions')}</th><th>{t('clicks')}</th><th>{t('ctr')}</th><th /></tr></thead>
              <tbody>
                {(campaigns.data ?? []).map((c) => {
                  const st = campaignStatus(c, now);
                  const x = totals.get(c.id) ?? { i: 0, c: 0 };
                  return (
                    <tr key={c.id}>
                      <td><Link prefetch={false} href={`/${locale}/admin/ads/campaigns/${c.id}`} className="font-semibold hover:text-accent" dir="auto">{c.sponsor_name}</Link></td>
                      <td>{slotLabel.get(c.slot_key)}</td>
                      <td className="whitespace-nowrap text-[13px]">{formatDate(c.starts_at, locale, 'short')} — {c.ends_at ? formatDate(c.ends_at, locale, 'short') : '…'}</td>
                      <td><span className="a-chip" data-status={st === 'running' ? 'published' : st === 'upcoming' ? 'scheduled' : st === 'paused' ? 'in_review' : 'archived'}>{t(`statuses.${st}`)}</span></td>
                      <td className="tabular-nums">{formatInt(x.i)}</td>
                      <td className="tabular-nums">{formatInt(x.c)}</td>
                      <td className="tabular-nums">{x.i ? `${((x.c / x.i) * 100).toFixed(2)}%` : '—'}</td>
                      <td><Link prefetch={false} href={`/${locale}/admin/ads/campaigns/${c.id}/report`} className="underline text-[14px]">{t('report')}</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="a-panel p-4">
        <h2 className="a-h2">{t('slots')}</h2>
        <p className="a-help">{t('slotsHelp')}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 text-[14px]">
          <a href={`/${locale}?show_slots=1`} target="_blank" rel="noopener" className="underline">{t('showSlots')}</a>
          {art && <a href={art} target="_blank" rel="noopener" className="underline">{t('showSlots')} — {t('showSlotsArticle')}</a>}
        </p>
        <SlotsManager slots={(slots.data ?? []) as SlotRow[]} />
      </section>

      <AdsenseForm initial={{ client_id: String(sv.adsense?.client_id ?? ''), enabled: Boolean(sv.adsense?.enabled), ads_txt: String(sv.ads_txt?.content ?? '') }} />
    </div>
  );
}
