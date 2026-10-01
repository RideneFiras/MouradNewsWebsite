import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import { formatCalendarDay, formatDate } from '@/lib/format/date';
import { formatInt } from '@/lib/format/number';
import { LineChart } from '@/components/admin/stats/LineChart';
import { PrintButton } from '@/components/public/PrintButton';

/** Sponsor report: impressions, clicks, CTR by day (read-only, printable, CSV). */
export default async function CampaignReport({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: l, id } = await params;
  const locale = l === 'fr' ? 'fr' : 'ar';
  await requireStaff(locale, ['admin']);
  const t = await getTranslations({ locale, namespace: 'admin.ads' });
  const db = await sessionClient();
  const [{ data: c }, { data: rows }, settings] = await Promise.all([
    db.from('ad_campaigns').select('id, sponsor_name, slot_key, starts_at, ends_at').eq('id', id).maybeSingle(),
    db.rpc('ad_campaign_report', { p_campaign_id: id }),
    getSettings(),
  ]);
  if (!c) notFound();
  const days = ((rows ?? []) as { date: string; impressions: number; clicks: number }[]).map((r) => ({ ...r, date: String(r.date).slice(0, 10) }));
  const tot = days.reduce((s, r) => ({ i: s.i + r.impressions, c: s.c + r.clicks }), { i: 0, c: 0 });
  const ctr = (i: number, k: number) => (i ? `${((k / i) * 100).toFixed(2)}%` : '—');
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap gap-2">
        <PrintButton label={t('r.print')} />
        <a className="a-btn" href={`/${locale}/admin/ads/campaigns/${id}/report/csv`} download>{t('r.csv')}</a>
      </div>
      <article className="mx-auto max-w-[210mm] border border-rule bg-white px-6 py-8 sm:px-10 print:border-0 print:p-0">
        <header className="text-center">
          <p className="font-nameplate text-[36px] leading-[1.5]">{pick(settings.site_name, locale)}</p>
          <div className="mt-1 border-t-[3px] border-double border-ink" />
          <h1 className="mt-3 font-headline text-[26px] font-semibold">{t('r.title')} — <bdi>{c.sponsor_name}</bdi></h1>
          <p className="mt-1 text-[13px] text-ink-3">{formatDate(c.starts_at, locale, 'short')} — {c.ends_at ? formatDate(c.ends_at, locale, 'short') : '…'} · <bdi dir="ltr">{c.slot_key}</bdi></p>
        </header>
        <dl className="mt-6 grid grid-cols-3 border-y border-ink text-center">
          {[[t('impressions'), formatInt(tot.i)], [t('clicks'), formatInt(tot.c)], [t('ctr'), ctr(tot.i, tot.c)]].map(([k, v], i) => (
            <div key={k} className={`px-3 py-4 ${i ? 'border-s border-rule' : ''}`}>
              <dd className="font-headline text-[30px] font-semibold tabular-nums">{v}</dd><dt className="text-[13px] text-ink-2">{k}</dt>
            </div>
          ))}
        </dl>
        {days.length === 0 ? <p className="mt-6 text-center text-ink-3">{t('r.noData')}</p> : (
          <>
            {days.length > 1 && (
              <div className="mt-6">
                <LineChart locale={locale} title={t('impressions')} labels={days.map((d) => formatCalendarDay(d.date, locale, true))} ticks={days.map((d) => formatCalendarDay(d.date, locale))}
                  tableLabel={t('r.daily')} dateHeader={t('r.date')} height={180} series={[{ label: t('impressions'), values: days.map((d) => d.impressions), tone: 'main' }]} />
              </div>
            )}
            <h2 className="mt-6 border-b border-ink pb-1 font-headline text-[19px] font-semibold">{t('r.daily')}</h2>
            <table className="mt-2 w-full text-[14px]">
              <thead><tr className="border-b border-rule text-ink-2"><th className="py-1 text-start font-semibold">{t('r.date')}</th><th className="text-start font-semibold">{t('impressions')}</th><th className="text-start font-semibold">{t('clicks')}</th><th className="text-start font-semibold">{t('ctr')}</th></tr></thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date} className="border-b border-rule">
                    <td className="py-1">{formatCalendarDay(d.date, locale, true)}</td>
                    <td className="tabular-nums">{formatInt(d.impressions)}</td>
                    <td className="tabular-nums">{formatInt(d.clicks)}</td>
                    <td className="tabular-nums">{ctr(d.impressions, d.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <footer className="mt-6 border-t border-ink pt-2 text-[12px] text-ink-2">{t('r.note')}</footer>
      </article>
    </div>
  );
}
