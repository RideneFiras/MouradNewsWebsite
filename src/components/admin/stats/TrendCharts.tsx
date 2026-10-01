import { getTranslations } from 'next-intl/server';
import { formatCalendarDay } from '@/lib/format/date';
import type { SeriesPoint } from '@/lib/stats/data';
import { LineChart } from './LineChart';
import { Panel } from './ui';

/** Page views and visitors per day, each with the previous period as a dashed line (two charts, one axis each). */
export async function TrendCharts({ locale, current, previous }: { locale: 'ar' | 'fr'; current: SeriesPoint[]; previous: SeriesPoint[] }) {
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const labels = current.map((p) => formatCalendarDay(p.bucket, locale, true));
  const ticks = current.map((p) => formatCalendarDay(p.bucket, locale));
  const prevLabels = current.map((_, i) => (previous[i] ? formatCalendarDay(previous[i]!.bucket, locale, true) : ''));
  const common = { labels, ticks, locale, tableLabel: t('showTable'), dateHeader: t('date') };
  const chart = (metric: 'pageviews' | 'visitors', title: string) => (
    <Panel title={title}>
      <LineChart
        {...common}
        title={title}
        series={[
          { label: t('current'), values: current.map((p) => p[metric]), tone: 'main' },
          { label: t('previous'), values: current.map((_, i) => previous[i]?.[metric] ?? 0), tone: 'comparison', pointLabels: prevLabels },
        ]}
      />
    </Panel>
  );
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {chart('pageviews', t('chartViews'))}
      {chart('visitors', t('chartVisitors'))}
    </div>
  );
}
