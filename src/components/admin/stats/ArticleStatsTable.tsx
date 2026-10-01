import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { formatDuration } from '@/lib/format/number';
import { formatDate } from '@/lib/format/date';
import type { ArticleRow } from '@/lib/stats/data';
import { fmtInt, fmtPct } from './ui';

export type ArticleSort = 'views' | 'visitors' | 'engaged' | 'read' | 'published';

export const sortArticles = (rows: ArticleRow[], sort: ArticleSort) => {
  const key: Record<ArticleSort, (r: ArticleRow) => number> = {
    views: (r) => r.pageviews,
    visitors: (r) => r.visitors,
    engaged: (r) => r.engaged_avg_seconds ?? -1,
    read: (r) => r.read_rate ?? -1,
    published: (r) => (r.published_at ? Date.parse(r.published_at) : 0),
  };
  return [...rows].sort((a, b) => key[sort](b) - key[sort](a));
};

/** Per-article numbers. With sortHref, column headers become sort links (server-side sort). */
export async function ArticleStatsTable({ rows, locale, query, sort, sortHref, compact = false }: {
  rows: ArticleRow[]; locale: 'ar' | 'fr'; query: string; sort?: ArticleSort; sortHref?: (s: ArticleSort) => string; compact?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  if (!rows.length) return <p className="text-[14px] text-ink-3">{t('noData')}</p>;
  const th = (label: string, s?: ArticleSort) => (
    <th scope="col" aria-sort={s && sort === s ? 'descending' : undefined}>
      {s && sortHref ? (
        <Link prefetch={false} href={sortHref(s)} className={sort === s ? 'text-accent' : 'underline decoration-dotted underline-offset-4'} title={t('sortBy', { col: label })}>
          {label}{sort === s ? ' ↓' : ''}
        </Link>
      ) : label}
    </th>
  );
  return (
    <div className="overflow-x-auto">
      <table className="a-table">
        <thead>
          <tr>
            <th scope="col" className="w-8">#</th>
            {th(t('col.title'))}
            {th(t('col.views'), 'views')}
            {!compact && th(t('col.visitors'), 'visitors')}
            {th(t('col.engaged'), 'engaged')}
            {!compact && th(t('col.readRate'), 'read')}
            {!compact && th(t('col.mainSource'))}
            {!compact && th(t('col.publishedAt'), 'published')}
            {!compact && th(t('col.author'))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.article_id}>
              <td className="tabular-nums text-ink-3">{i + 1}</td>
              <td className="min-w-56">
                <Link prefetch={false} href={`/${locale}/admin/stats/article/${r.article_id}${query}`} lang={r.language} dir="auto" className="font-semibold hover:text-accent">
                  {r.title}
                </Link>
              </td>
              <td className="tabular-nums font-semibold">{fmtInt(r.pageviews)}</td>
              {!compact && <td className="tabular-nums">{fmtInt(r.visitors)}</td>}
              <td className="tabular-nums whitespace-nowrap">{r.engaged_avg_seconds == null ? '—' : formatDuration(r.engaged_avg_seconds, locale)}</td>
              {!compact && <td className="tabular-nums">{fmtPct(r.read_rate)}</td>}
              {!compact && <td className="whitespace-nowrap">{r.main_source ? t(`source.${r.main_source}` as 'source.direct') : '—'}</td>}
              {!compact && <td className="whitespace-nowrap">{r.published_at ? formatDate(r.published_at, locale, 'short') : '—'}</td>}
              {!compact && <td>{r.author_names ?? '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
