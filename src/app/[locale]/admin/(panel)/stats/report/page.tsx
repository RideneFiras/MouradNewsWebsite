import { getTranslations } from 'next-intl/server';
import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import { formatDuration } from '@/lib/format/number';
import { formatCalendarDay, formatMonth } from '@/lib/format/date';
import { addDays, monthEnd, monthStart } from '@/lib/stats/range';
import { countryName, getBreakdown, getOverview, getSocial, getTimeseries, getTopArticles } from '@/lib/stats/data';
import { one, statsContext, type SearchParams } from '@/lib/stats/page';
import { BarList } from '@/components/admin/stats/BarList';
import { LineChart } from '@/components/admin/stats/LineChart';
import { PrintButton } from '@/components/public/PrintButton';
import { StatsHeader, fmtInt, fmtPct } from '@/components/admin/stats/ui';

/** One-page monthly audience report for sponsors, set like a newspaper page; print → PDF. */
export default async function MonthlyReport({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale, editor, range, sp, today } = await statsContext(params, searchParams, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const lastComplete = monthStart(addDays(monthStart(today), -1));
  const requested = one(sp.month);
  const from = requested && /^\d{4}-\d{2}$/.test(requested) ? `${requested}-01` : lastComplete;
  const to = monthEnd(from) > today ? today : monthEnd(from);
  const months = Array.from({ length: 12 }, (_, i) => {
    let m = monthStart(today);
    for (let k = 0; k < i; k++) m = monthStart(addDays(m, -1));
    return m;
  });

  const [settings, o, series, top, sources, countries, devices, social] = await Promise.all([
    getSettings(),
    getOverview(from, monthEnd(from)),
    getTimeseries(from, to),
    getTopArticles(from, to, 10),
    getBreakdown(from, to, 'source', 6),
    getBreakdown(from, to, 'country', 5),
    getBreakdown(from, to, 'device', 4),
    getSocial(20),
  ]);
  const fb = social.find((s) => s.platform === 'facebook' && s.recorded_for <= monthEnd(from));
  const mobile = devices.find((d) => d.value === 'mobile')?.share ?? null;
  const name = pick(settings.site_name, locale);
  const figures = [
    { label: t('m.visitorsMonthly'), value: fmtInt(o.visitors_monthly ?? o.visitors_daily_sum) },
    { label: t('m.pageviews'), value: fmtInt(o.pageviews) },
    { label: t('m.engaged'), value: o.engaged_avg_seconds == null ? '—' : formatDuration(o.engaged_avg_seconds, locale) },
    { label: t('m.readRate'), value: fmtPct(o.read_rate) },
    { label: t('m.published'), value: fmtInt(o.articles_published) },
  ];

  return (
    <div className="space-y-6">
      <div className="no-print space-y-4">
        <StatsHeader locale={locale} tab="report" range={range} isEditor={editor} showRange={false} />
        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="text-[14px]">
            <span className="a-label">{t('report.month')}</span>
            <select name="month" defaultValue={from.slice(0, 7)} className="a-select min-w-48">
              {months.map((m) => <option key={m} value={m.slice(0, 7)}>{formatMonth(m, locale)}</option>)}
            </select>
          </label>
          <button className="a-btn">{t('report.show')}</button>
          <PrintButton label={t('report.print')} />
        </form>
      </div>

      <article className="report mx-auto max-w-[210mm] border border-rule bg-white px-6 py-8 sm:px-10 print:max-w-none print:border-0 print:p-0">
        <header className="text-center">
          <p className="font-nameplate text-[44px] leading-[1.5]">{name}</p>
          <div className="mt-2 border-t-[3px] border-double border-ink pt-1" />
          <h1 className="mt-3 font-headline text-[28px] leading-tight font-semibold">{t('report.heading')} — {formatMonth(from, locale)}</h1>
          <p className="mt-1 text-[13px] text-ink-3">{t('period', { from: formatCalendarDay(from, locale, true), to: formatCalendarDay(to, locale, true) })} · {t('report.generated', { date: formatCalendarDay(today, locale, true) })}</p>
        </header>

        <dl className="mt-6 grid grid-cols-2 border-y border-ink sm:grid-cols-5">
          {figures.map((f, i) => (
            <div key={f.label} className={`px-3 py-4 text-center ${i ? 'sm:border-s sm:border-rule' : ''}`}>
              <dd className="font-headline text-[30px] leading-tight font-semibold tabular-nums">{f.value}</dd>
              <dt className="mt-1 text-[13px] text-ink-2">{f.label}</dt>
            </div>
          ))}
        </dl>
        {mobile != null && <p className="mt-2 text-center text-[13px] text-ink-2">{fmtPct(mobile)} {t('report.mobile')}</p>}

        <section className="mt-6 break-inside-avoid">
          <h2 className="border-b border-ink pb-1 font-headline text-[19px] font-semibold">{t('report.daily')}</h2>
          <div className="mt-3">
            <LineChart locale={locale} title={t('report.daily')} labels={series.map((p) => formatCalendarDay(p.bucket, locale, true))} ticks={series.map((p) => formatCalendarDay(p.bucket, locale))}
              tableLabel={t('showTable')} dateHeader={t('date')} height={180} series={[{ label: t('m.pageviews'), values: series.map((p) => p.pageviews), tone: 'main' }]} />
          </div>
        </section>

        <div className="mt-6 grid gap-8 sm:grid-cols-[1.4fr_1fr]">
          <section className="break-inside-avoid">
            <h2 className="border-b border-ink pb-1 font-headline text-[19px] font-semibold">{t('topArticles')}</h2>
            <ol className="mt-2 divide-y divide-rule">
              {top.map((a, i) => (
                <li key={a.article_id} className="flex gap-3 py-2">
                  <span className="font-headline text-[20px] leading-none text-accent tabular-nums">{i + 1}</span>
                  <span className="flex-1 font-headline text-[16px] leading-snug" lang={a.language} dir="auto">{a.title}</span>
                  <span className="text-[13px] text-ink-2 tabular-nums">{fmtInt(a.pageviews)}</span>
                </li>
              ))}
            </ol>
          </section>
          <div className="space-y-6">
            <section className="break-inside-avoid">
              <h2 className="mb-3 border-b border-ink pb-1 font-headline text-[19px] font-semibold">{t('m.sources')}</h2>
              <BarList locale={locale} empty={t('noData')} rows={sources.map((s) => ({ key: s.value, label: t(`source.${s.value}` as 'source.direct'), value: s.pageviews, share: s.share }))} />
            </section>
            <section className="break-inside-avoid">
              <h2 className="mb-3 border-b border-ink pb-1 font-headline text-[19px] font-semibold">{t('report.countries')}</h2>
              <BarList locale={locale} empty={t('noData')} rows={countries.map((c) => ({ key: c.value, label: countryName(c.value, locale, t('unknownCountry')), value: c.pageviews, share: c.share }))} />
            </section>
          </div>
        </div>

        {fb && (
          <section className="mt-6 break-inside-avoid border-t border-rule pt-3">
            <h2 className="font-headline text-[17px] font-semibold">{t('social.platforms.facebook')}</h2>
            <p className="mt-1 flex flex-wrap gap-x-6 text-[14px]">
              {fb.followers != null && <span>{t('social.followers')}: <strong className="tabular-nums">{fmtInt(fb.followers)}</strong></span>}
              {fb.reach_28d != null && <span>{t('social.reach')}: <strong className="tabular-nums">{fmtInt(fb.reach_28d)}</strong></span>}
              {fb.engagement_28d != null && <span>{t('social.engagement')}: <strong className="tabular-nums">{fmtInt(fb.engagement_28d)}</strong></span>}
            </p>
            <p className="mt-1 text-[12px] text-ink-3">{t('report.socialNote', { date: formatCalendarDay(fb.recorded_for, locale, true) })}</p>
          </section>
        )}

        <footer className="mt-6 border-t border-ink pt-2 text-[12px] leading-relaxed text-ink-2">{t('report.method')}</footer>
      </article>
    </div>
  );
}
