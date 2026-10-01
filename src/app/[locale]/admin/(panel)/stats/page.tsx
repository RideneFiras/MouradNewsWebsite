import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { formatDuration } from '@/lib/format/number';
import { pctChange } from '@/lib/stats/range';
import { getBreakdown, getMySummary, getOverview, getTimeseries, getTopArticles, type Overview } from '@/lib/stats/data';
import { statsContext, type SearchParams } from '@/lib/stats/page';
import { ArticleStatsTable } from '@/components/admin/stats/ArticleStatsTable';
import { BarList } from '@/components/admin/stats/BarList';
import { TrendCharts } from '@/components/admin/stats/TrendCharts';
import { Panel, StatsHeader, Tile, fmtInt, fmtPct } from '@/components/admin/stats/ui';

export default async function StatsOverview({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale, editor, range, query } = await statsContext(params, searchParams);
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const rtl = locale === 'ar';

  const summary = editor ? getOverview : getMySummary;
  const [cur, prev, series, prevSeries, top, sources] = await Promise.all([
    summary(range.from, range.to),
    summary(range.prevFrom, range.prevTo),
    editor ? getTimeseries(range.from, range.to) : Promise.resolve([]),
    editor ? getTimeseries(range.prevFrom, range.prevTo) : Promise.resolve([]),
    getTopArticles(range.from, range.to, 10),
    editor ? getBreakdown(range.from, range.to, 'source', 12) : Promise.resolve([]),
  ]);

  const visitors = (o: Overview) => (range.isMonth && o.visitors_monthly != null ? o.visitors_monthly : o.visitors_daily_sum);
  const visitorsKey = range.days === 1 ? 'visitors' : range.isMonth && cur.visitors_monthly != null ? 'visitorsMonthly' : 'visitorsDailySum';
  const vs = t('vsPrevious');

  return (
    <div className="space-y-6">
      <StatsHeader locale={locale} tab="overview" range={range} isEditor={editor} csv={editor ? `/${locale}/admin/stats/export${query}&table=daily` : undefined} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile id="d-pv" label={t('m.pageviews')} definition={t('def.pageviews')} value={fmtInt(cur.pageviews)} change={pctChange(cur.pageviews, prev.pageviews)} changeLabel={vs}
          spark={series.map((p) => p.pageviews)} rtl={rtl} />
        <Tile id="d-vis" label={t(`m.${visitorsKey}`)} definition={t(`def.${visitorsKey}`)} value={fmtInt(visitors(cur))} change={pctChange(visitors(cur), visitors(prev))} changeLabel={vs}
          spark={series.map((p) => p.visitors)} rtl={rtl} />
        <Tile id="d-eng" label={t('m.engaged')} definition={t('def.engaged')} value={cur.engaged_avg_seconds == null ? '—' : formatDuration(cur.engaged_avg_seconds, locale)}
          change={pctChange(cur.engaged_avg_seconds ?? 0, prev.engaged_avg_seconds ?? 0)} changeLabel={vs} />
        <Tile id="d-read" label={t('m.readRate')} definition={t('def.readRate')} value={fmtPct(cur.read_rate)}
          change={pctChange(cur.read_rate ?? 0, prev.read_rate ?? 0)} changeLabel={vs} />
        <Tile id="d-pub" label={t('m.published')} definition={t('m.published')} value={fmtInt(cur.articles_published)}
          change={pctChange(cur.articles_published, prev.articles_published)} changeLabel={vs} />
      </div>
      <p className="a-help">{t('noEdit')}</p>

      {editor && range.days > 1 && <TrendCharts locale={locale} current={series} previous={prevSeries} />}

      <div className={editor ? 'grid gap-4 xl:grid-cols-[2fr_1fr]' : ''}>
        <Panel title={t('topArticles')} action={<Link prefetch={false} href={`/${locale}/admin/stats/articles${query}`} className="text-[14px] underline">{t('tabs.articles')}</Link>}>
          <ArticleStatsTable rows={top} locale={locale} query={query} compact />
        </Panel>
        {editor && (
          <Panel title={t('m.sources')} action={<Link prefetch={false} href={`/${locale}/admin/stats/sources${query}`} className="text-[14px] underline">{t('tabs.sources')}</Link>}>
            <BarList locale={locale} empty={t('noData')} rows={sources.map((s) => ({ key: s.value, label: t(`source.${s.value}` as 'source.direct'), value: s.pageviews, share: s.share }))} />
          </Panel>
        )}
      </div>
    </div>
  );
}
