import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSettings } from '@/lib/data/queries';
import { formatDuration } from '@/lib/format/number';
import { formatCalendarDay } from '@/lib/format/date';
import { addDays, pctChange } from '@/lib/stats/range';
import { getBreakdown, getMySummary, getOverview, getRealtime, getSocial, getTimeseries, getTopArticles, tunisToday } from '@/lib/stats/data';
import { ArticleStatsTable } from './ArticleStatsTable';
import { BarList } from './BarList';
import { Panel, Tile, fmtInt, fmtPct } from './ui';

/** Numbers on the dashboard home (docs/06 "Dashboard home"). Read-only, from the stats RPCs. */
export async function DashboardStats({ locale, scope }: { locale: 'ar' | 'fr'; scope: 'site' | 'me' }) {
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const today = await tunisToday();
  const w0 = addDays(today, -6);
  const p0 = addDays(today, -13);
  const p1 = addDays(today, -7);
  const q = '?range=7d';
  const statsBase = `/${locale}/admin/stats`;
  const rtl = locale === 'ar';
  const vs = t('vsPrevious');

  if (scope === 'me') {
    const [cur, prev, mine] = await Promise.all([getMySummary(w0, today), getMySummary(p0, p1), getTopArticles(w0, today, 5)]);
    return (
      <section className="space-y-3">
        <h2 className="a-h2">{t('dash.myTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile id="m-pv" label={t('m.pageviews')} definition={t('def.pageviews')} value={fmtInt(cur.pageviews)} change={pctChange(cur.pageviews, prev.pageviews)} changeLabel={vs} />
          <Tile id="m-eng" label={t('m.engaged')} definition={t('def.engaged')} value={cur.engaged_avg_seconds == null ? '—' : formatDuration(cur.engaged_avg_seconds, locale)} />
          <Tile id="m-read" label={t('m.readRate')} definition={t('def.readRate')} value={fmtPct(cur.read_rate)} />
          <Tile id="m-pub" label={t('m.published')} definition={t('m.published')} value={fmtInt(cur.articles_published)} />
        </div>
        <Panel title={t('dash.myArticles')} action={<Link prefetch={false} href={statsBase} className="text-[14px] underline">{t('dash.all')}</Link>}>
          <ArticleStatsTable rows={mine} locale={locale} query={q} compact />
        </Panel>
      </section>
    );
  }

  const [todayO, week, prevWeek, series, realtime, top, sources, social, settings] = await Promise.all([
    getOverview(today, today),
    getOverview(w0, today),
    getOverview(p0, p1),
    getTimeseries(p0, today),
    getRealtime(30),
    getTopArticles(w0, today, 10),
    getBreakdown(w0, today, 'source', 8),
    getSocial(10),
    getSettings(),
  ]);
  const fb = social.find((s) => s.platform === 'facebook');
  const yesterday = series.at(-2);
  const ga4 = /^G-[A-Z0-9]+$/.test(settings.ga4.measurement_id ?? '');

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile id="t-pv" label={t('dash.todayViews')} definition={t('def.pageviews')} value={fmtInt(todayO.pageviews)}
          spark={series.map((p) => p.pageviews)} rtl={rtl} foot={yesterday ? `${t('ranges.yesterday')}: ${fmtInt(yesterday.pageviews)}` : undefined} />
        <Tile id="t-vis" label={t('dash.todayVisitors')} definition={t('def.visitors')} value={fmtInt(todayO.visitors_daily_sum)}
          spark={series.map((p) => p.visitors)} rtl={rtl} foot={yesterday ? `${t('ranges.yesterday')}: ${fmtInt(yesterday.visitors)}` : undefined} />
        <Tile id="t-week" label={t('dash.weekViews')} definition={t('def.pageviews')} value={fmtInt(week.pageviews)}
          change={pctChange(week.pageviews, prevWeek.pageviews)} changeLabel={vs} spark={series.slice(-7).map((p) => p.pageviews)} rtl={rtl} />
        <Tile id="t-eng" label={t('dash.weekEngaged')} definition={t('def.engaged')} value={week.engaged_avg_seconds == null ? '—' : formatDuration(week.engaged_avg_seconds, locale)}
          change={pctChange(week.engaged_avg_seconds ?? 0, prevWeek.engaged_avg_seconds ?? 0)} changeLabel={vs} spark={series.slice(-7).map((p) => p.engaged_avg_seconds ?? 0)} rtl={rtl} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel title={t('dash.top10')} action={<Link prefetch={false} href={`${statsBase}/articles${q}`} className="text-[14px] underline">{t('dash.all')}</Link>}>
          <ArticleStatsTable rows={top} locale={locale} query={q} compact />
        </Panel>
        <div className="space-y-4">
          <Panel title={t('realtime')}>
            <p className="text-[14px]"><strong className="text-[24px] tabular-nums">{fmtInt(realtime.pageviews)}</strong> <span className="text-ink-2">{t('realtimeViews')}</span></p>
            {realtime.top.length > 0 && (
              <ol className="mt-2 divide-y divide-rule text-[14px]">
                {realtime.top.map((a) => (
                  <li key={a.article_id} className="flex justify-between gap-3 py-1.5">
                    <Link prefetch={false} href={`${statsBase}/article/${a.article_id}`} lang={a.language} dir="auto" className="min-w-0 hover:text-accent">{a.title}</Link>
                    <span className="tabular-nums text-ink-2">{fmtInt(a.pageviews)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <Panel title={t('dash.sources')}>
            <BarList locale={locale} empty={t('noData')} rows={sources.map((s) => ({ key: s.value, label: t(`source.${s.value}` as 'source.direct'), value: s.pageviews, share: s.share }))} />
          </Panel>
          <Panel title={t('dash.facebook')}>
            {fb ? (
              <>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  {[['followers', fb.followers], ['reach', fb.reach_28d], ['engagement', fb.engagement_28d]].map(([k, v]) => (
                    <div key={k as string}><dd className="text-[18px] font-semibold tabular-nums">{fmtInt(v as number | null)}</dd><dt className="text-[12px] text-ink-3">{t(`social.${k}` as 'social.reach')}</dt></div>
                  ))}
                </dl>
                <p className="mt-2 text-[12px] text-ink-3">{t('social.manual')} · {t('dash.asOf', { date: formatCalendarDay(fb.recorded_for, locale, true) })}</p>
              </>
            ) : <p className="text-[14px] text-ink-3">{t('dash.noFacebook')}</p>}
            <Link prefetch={false} href={`${statsBase}/social`} className="a-btn a-btn-sm mt-3">{t('dash.updateFacebook')}</Link>
          </Panel>
          {ga4 && <p className="text-[13px]"><a href="https://analytics.google.com/" target="_blank" rel="noopener" className="underline">{t('dash.ga4')}</a></p>}
        </div>
      </div>
    </section>
  );
}
