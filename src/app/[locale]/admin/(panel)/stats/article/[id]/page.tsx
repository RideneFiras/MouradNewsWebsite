import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { sessionClient } from '@/lib/supabase/server';
import { formatDuration } from '@/lib/format/number';
import { formatCalendarDay, formatDate, tunisDayKey } from '@/lib/format/date';
import { resolveRange } from '@/lib/stats/range';
import { countryName, getArticleDetail } from '@/lib/stats/data';
import { one, statsContext, type SearchParams } from '@/lib/stats/page';
import { articleHref } from '@/lib/public/links';
import { BarList } from '@/components/admin/stats/BarList';
import { LineChart } from '@/components/admin/stats/LineChart';
import { Panel, RangePicker, Tile, fmtInt, fmtPct } from '@/components/admin/stats/ui';

const entries = (o: Record<string, number> | null) => Object.entries(o ?? {}).map(([k, v]) => [k, Number(v)] as const).sort((a, b) => b[1] - a[1]);

export default async function ArticleStats({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: SearchParams }) {
  const { id } = await params;
  const { locale, sp, today } = await statsContext(params, searchParams);
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const db = await sessionClient();
  const { data: a } = await db.from('articles').select('id, public_id, slug, title, language, status, first_published_at').eq('id', id).maybeSingle();
  if (!a) notFound();

  // Default range: since publication (at most 400 days), otherwise the range picked.
  const since = a.first_published_at ? tunisDayKey(a.first_published_at) : today;
  const range = one(sp.range) ? resolveRange({ range: one(sp.range), from: one(sp.from), to: one(sp.to) }, today) : resolveRange({ range: 'custom', from: since, to: today }, today);
  let d;
  try {
    d = await getArticleDetail(id, range.from, range.to);
  } catch {
    notFound();
  }
  const total = d.pageviews || 1;
  const share = (rows: (readonly [string, number])[]) => rows.map(([k, v]) => ({ k, v, share: v / total }));
  const sources = share(entries(d.sources));
  const shared = sources.filter((s) => ['facebook', 'whatsapp', 'google', 'other_search'].includes(s.k));
  const labels = d.daily.map((p) => formatCalendarDay(p.date, locale, true));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[14px]"><Link prefetch={false} href={`/${locale}/admin/stats/articles`} className="underline">{t('tabs.articles')}</Link></p>
        <h1 className="a-h1" lang={a.language} dir="auto">{a.title}</h1>
        <p className="flex flex-wrap gap-x-4 text-[14px] text-ink-3">
          {a.first_published_at && <span>{formatDate(a.first_published_at, locale, 'short')}</span>}
          {a.status === 'published' && <a href={articleHref({ public_id: a.public_id, slug: a.slug, language: a.language })} target="_blank" rel="noopener" className="underline">{t('onSite')}</a>}
          <Link prefetch={false} href={`/${locale}/admin/articles/${a.id}`} className="underline">{t('detail.openEditor')}</Link>
        </p>
      </header>
      <RangePicker locale={locale} range={range} path={`/${locale}/admin/stats/article/${id}`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile id="a-pv" label={t('m.pageviews')} definition={t('def.pageviews')} value={fmtInt(d.pageviews)} />
        <Tile id="a-vis" label={t(range.days === 1 ? 'm.visitors' : 'm.visitorsDailySum')} definition={t(range.days === 1 ? 'def.visitors' : 'def.visitorsDailySum')} value={fmtInt(d.visitors_daily_sum)} />
        <Tile id="a-eng" label={t('m.engaged')} definition={t('def.engaged')} value={d.engaged_avg_seconds == null ? '—' : formatDuration(d.engaged_avg_seconds, locale)} />
        <Tile id="a-read" label={t('m.readRate')} definition={t('def.readRate')} value={fmtPct(d.read_rate)} />
      </div>
      {d.daily.length > 1 && (
        <Panel title={t('detail.daily')}>
          <LineChart locale={locale} title={t('detail.daily')} labels={labels} ticks={d.daily.map((p) => formatCalendarDay(p.date, locale))}
            tableLabel={t('showTable')} dateHeader={t('date')} series={[{ label: t('m.pageviews'), values: d.daily.map((p) => p.pageviews), tone: 'main' }]} />
        </Panel>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t('detail.shared')}>
          <BarList locale={locale} empty={t('noData')} rows={shared.map((s) => ({ key: s.k, label: t(`source.${s.k}` as 'source.direct'), value: s.v, share: s.share }))} />
        </Panel>
        <Panel title={t('detail.sources')}>
          <BarList locale={locale} empty={t('noData')} rows={sources.map((s) => ({ key: s.k, label: t(`source.${s.k}` as 'source.direct'), value: s.v, share: s.share }))} />
        </Panel>
        <Panel title={t('detail.countries')}>
          <BarList locale={locale} empty={t('noData')} rows={share(entries(d.countries)).map((s) => ({ key: s.k, label: countryName(s.k, locale, t('unknownCountry')), value: s.v, share: s.share }))} />
        </Panel>
        <Panel title={t('detail.devices')}>
          <BarList locale={locale} empty={t('noData')} rows={share(entries(d.devices)).map((s) => ({ key: s.k, label: t(`device.${s.k}` as 'device.mobile'), value: s.v, share: s.share }))} />
        </Panel>
        <Panel title={t('detail.referrers')}>
          <BarList locale={locale} empty={t('noData')} rows={share(entries(d.referrers)).map((s) => ({ key: s.k, label: <bdi dir="ltr">{s.k}</bdi>, value: s.v, share: s.share }))} />
        </Panel>
      </div>
      <p className="a-help">{t('noEdit')} {range.from === since ? `(${t('detail.sinceLabel')})` : ''}</p>
    </div>
  );
}
