import { getTranslations } from 'next-intl/server';
import { formatDuration } from '@/lib/format/number';
import { getAuthors, getTopArticles } from '@/lib/stats/data';
import { statsContext, type SearchParams } from '@/lib/stats/page';
import { ArticleStatsTable } from '@/components/admin/stats/ArticleStatsTable';
import { Panel, StatsHeader, fmtInt } from '@/components/admin/stats/ui';

export default async function StatsAuthors({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale, editor, range, query } = await statsContext(params, searchParams);
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const authors = await getAuthors(range.from, range.to);
  // Top articles of each of the first authors (authors only ever see themselves).
  const tops = await Promise.all(authors.slice(0, 8).map((a) => getTopArticles(range.from, range.to, 3, { authorId: a.profile_id })));
  const name = (a: { display_name_ar: string; display_name_fr: string | null }) => (locale === 'fr' ? a.display_name_fr || a.display_name_ar : a.display_name_ar);
  return (
    <div className="space-y-6">
      <StatsHeader locale={locale} tab="authors" range={range} isEditor={editor} csv={`/${locale}/admin/stats/export${query}&table=authors`} />
      <Panel>
        {authors.length === 0 ? <p className="text-[14px] text-ink-3">{t('noData')}</p> : (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead><tr><th>{t('col.author')}</th><th>{t('col.articles')}</th><th>{t('col.views')}</th><th>{t('col.avgViews')}</th><th>{t('col.engaged')}</th></tr></thead>
              <tbody>
                {authors.map((a) => (
                  <tr key={a.profile_id}>
                    <td className="font-semibold">{name(a)}</td>
                    <td className="tabular-nums">{fmtInt(a.articles_published)}</td>
                    <td className="tabular-nums">{fmtInt(a.pageviews)}</td>
                    <td className="tabular-nums">{fmtInt(a.avg_views_per_article)}</td>
                    <td className="tabular-nums">{a.engaged_avg_seconds == null ? '—' : formatDuration(a.engaged_avg_seconds, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="a-help mt-3">{t('def.authors')}</p>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        {authors.slice(0, 8).map((a, i) => (tops[i]?.length ? (
          <Panel key={a.profile_id} title={`${t('topArticles')} — ${name(a)}`}>
            <ArticleStatsTable rows={tops[i]!} locale={locale} query={query} compact />
          </Panel>
        ) : null))}
      </div>
    </div>
  );
}
