import { getTranslations } from 'next-intl/server';
import { getCategories } from '@/lib/stats/data';
import { statsContext, type SearchParams } from '@/lib/stats/page';
import { BarList } from '@/components/admin/stats/BarList';
import { Panel, StatsHeader, fmtInt } from '@/components/admin/stats/ui';

export default async function StatsSections({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale, editor, range, query } = await statsContext(params, searchParams, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const rows = await getCategories(range.from, range.to);
  const name = (c: { name_ar: string; name_fr: string | null }) => (locale === 'fr' ? c.name_fr || c.name_ar : c.name_ar);
  const parents = rows.filter((c) => !c.parent_id);
  const total = rows.reduce((s, c) => s + c.pageviews, 0) || 1;
  return (
    <div className="space-y-6">
      <StatsHeader locale={locale} tab="sections" range={range} isEditor={editor} csv={`/${locale}/admin/stats/export${query}&table=sections`} />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Panel title={t('m.pageviews')}>
          <BarList locale={locale} empty={t('noData')} rows={rows.filter((c) => c.pageviews > 0).map((c) => ({ key: c.category_id, label: c.parent_id ? <span className="text-ink-2">— {name(c)}</span> : name(c), value: c.pageviews, share: c.pageviews / total }))} />
        </Panel>
        <Panel>
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead><tr><th>{t('col.section')}</th><th>{t('col.views')}</th><th>{t('col.articles')}</th><th>{t('col.avgViews')}</th></tr></thead>
              <tbody>
                {parents.flatMap((p) => [p, ...rows.filter((c) => c.parent_id === p.category_id)]).map((c) => (
                  <tr key={c.category_id}>
                    <td className={c.parent_id ? 'ps-6 text-ink-2' : 'font-semibold'}>{name(c)}</td>
                    <td className="tabular-nums">{fmtInt(c.pageviews)}</td>
                    <td className="tabular-nums">{fmtInt(c.articles_published)}</td>
                    <td className="tabular-nums">{fmtInt(c.avg_views_per_article)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
