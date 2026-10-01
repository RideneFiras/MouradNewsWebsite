import { getTranslations } from 'next-intl/server';
import { getBreakdown } from '@/lib/stats/data';
import { statsContext, type SearchParams } from '@/lib/stats/page';
import { BarList } from '@/components/admin/stats/BarList';
import { Defined, Panel, StatsHeader } from '@/components/admin/stats/ui';

export default async function StatsSources({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale, editor, range, query } = await statsContext(params, searchParams, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const [sources, hosts, campaigns] = await Promise.all([
    getBreakdown(range.from, range.to, 'source', 20),
    getBreakdown(range.from, range.to, 'referrer_host', 20),
    getBreakdown(range.from, range.to, 'utm_campaign', 20),
  ]);
  return (
    <div className="space-y-6">
      <StatsHeader locale={locale} tab="sources" range={range} isEditor={editor} csv={`/${locale}/admin/stats/export${query}&table=sources`} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={<Defined id="s-def" label={t('m.sources')} definition={t('def.sources')} />}>
          <BarList locale={locale} empty={t('noData')} rows={sources.map((s) => ({ key: s.value, label: t(`source.${s.value}` as 'source.direct'), value: s.pageviews, share: s.share }))} />
        </Panel>
        <div className="space-y-4">
          <Panel title={t('topReferrers')} action={<a className="text-[14px] underline" href={`/${locale}/admin/stats/export${query}&table=referrers`} download>{t('exportCsv')}</a>}>
            <BarList locale={locale} empty={t('noData')} rows={hosts.map((s) => ({ key: s.value, label: <bdi dir="ltr">{s.value}</bdi>, value: s.pageviews, share: s.share }))} />
          </Panel>
          <Panel title={t('campaigns')} action={<a className="text-[14px] underline" href={`/${locale}/admin/stats/export${query}&table=campaigns`} download>{t('exportCsv')}</a>}>
            <p className="a-help mb-3">{t('campaignsHelp')}</p>
            <BarList locale={locale} empty={t('noData')} rows={campaigns.map((s) => ({ key: s.value, label: <bdi dir="ltr">{s.value}</bdi>, value: s.pageviews, share: s.share }))} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
