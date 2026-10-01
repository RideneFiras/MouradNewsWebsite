import { getTranslations } from 'next-intl/server';
import { getTopArticles } from '@/lib/stats/data';
import { one, statsContext, type SearchParams } from '@/lib/stats/page';
import { ArticleStatsTable, sortArticles, type ArticleSort } from '@/components/admin/stats/ArticleStatsTable';
import { Panel, StatsHeader } from '@/components/admin/stats/ui';

const SORTS: ArticleSort[] = ['views', 'visitors', 'engaged', 'read', 'published'];

export default async function StatsArticles({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale, editor, range, query, sp } = await statsContext(params, searchParams);
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const sort = (SORTS as string[]).includes(one(sp.sort) ?? '') ? (one(sp.sort) as ArticleSort) : 'views';
  const rows = sortArticles(await getTopArticles(range.from, range.to, 200), sort);
  const base = `/${locale}/admin/stats/articles${query}`;
  return (
    <div className="space-y-6">
      <StatsHeader locale={locale} tab="articles" range={range} isEditor={editor} csv={`/${locale}/admin/stats/export${query}&table=articles`} />
      <Panel>
        <ArticleStatsTable rows={rows} locale={locale} query={query} sort={sort} sortHref={(s) => `${base}&sort=${s}`} />
      </Panel>
      <p className="a-help">{t('def.authors')}</p>
    </div>
  );
}
