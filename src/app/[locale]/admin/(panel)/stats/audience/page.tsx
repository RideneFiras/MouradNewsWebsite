import { getTranslations } from 'next-intl/server';
import { countryName, getBreakdown } from '@/lib/stats/data';
import { statsContext, type SearchParams } from '@/lib/stats/page';
import { BarList } from '@/components/admin/stats/BarList';
import { Panel, StatsHeader, Tile, fmtInt, fmtPct } from '@/components/admin/stats/ui';

export default async function StatsAudience({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale, editor, range, query } = await statsContext(params, searchParams, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const [countries, locales, devices] = await Promise.all([
    getBreakdown(range.from, range.to, 'country', 30),
    getBreakdown(range.from, range.to, 'locale', 5),
    getBreakdown(range.from, range.to, 'device', 5),
  ]);
  const total = countries.reduce((s, c) => s + c.pageviews, 0);
  const tn = countries.find((c) => c.value === 'TN')?.pageviews ?? 0;
  return (
    <div className="space-y-6">
      <StatsHeader locale={locale} tab="audience" range={range} isEditor={editor} csv={`/${locale}/admin/stats/export${query}&table=countries`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile id="au-tn" label={t('tunisia')} definition={t('def.pageviews')} value={fmtPct(total ? tn / total : null)} foot={`${fmtInt(tn)} ${t('m.pageviews')}`} />
        <Tile id="au-ab" label={t('abroad')} definition={t('def.pageviews')} value={fmtPct(total ? (total - tn) / total : null)} foot={`${fmtInt(total - tn)} ${t('m.pageviews')}`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={t('topCountries')}>
          <BarList locale={locale} empty={t('noData')} rows={countries.slice(0, 15).map((c) => ({ key: c.value, label: countryName(c.value, locale, t('unknownCountry')), value: c.pageviews, share: c.share }))} />
        </Panel>
        <div className="space-y-4">
          <Panel title={t('devices')}>
            <BarList locale={locale} empty={t('noData')} rows={devices.map((d) => ({ key: d.value, label: t(`device.${d.value}` as 'device.mobile'), value: d.pageviews, share: d.share }))} />
          </Panel>
          <Panel title={t('interface')}>
            <BarList locale={locale} empty={t('noData')} rows={locales.map((d) => ({ key: d.value, label: t(`locale.${d.value}` as 'locale.ar'), value: d.pageviews, share: d.share }))} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
