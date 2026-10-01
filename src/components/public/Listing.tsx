import { getTranslations } from 'next-intl/server';
import type { ArticleCard, Lang } from '@/lib/data/types';
import { Pagination } from './Pagination';
import { SecondaryStory } from './story';
import { SideColumn } from './SideColumn';

/** Main column of secondary units (image at inline-start) + side column, with pagination. */
export async function Listing({ locale, items, page, totalPages, basePath, mostRead, empty }: {
  locale: Lang; items: ArticleCard[]; page: number; totalPages: number; basePath: string; mostRead: ArticleCard[]; empty: string;
}) {
  const t = await getTranslations({ locale, namespace: 'section' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="grid lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-8">
        {items.length === 0 ? (
          <p className="dek">{empty}</p>
        ) : (
          <div className="space-y-6 [&>*+*]:border-t [&>*+*]:border-rule [&>*+*]:pt-6">
            {items.map((a) => <SecondaryStory key={a.id} a={a} locale={locale} horizontal />)}
          </div>
        )}
        <Pagination basePath={basePath} page={page} totalPages={totalPages} labels={{ newer: t('newer'), older: t('older'), page: (n) => tc('page', { n }) }} />
      </div>
      <SideColumn locale={locale} mostRead={mostRead} />
    </div>
  );
}
