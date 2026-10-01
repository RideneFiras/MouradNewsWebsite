import { getTranslations } from 'next-intl/server';
import type { ArticleCard, Lang } from '@/lib/data/types';
import { AdSlot } from './AdSlot';
import { NumberedItem, SectionHeader } from './story';

/** Side column: ad sidebar_top + most read (+ optional extra block). */
export async function SideColumn({ locale, mostRead, categoryId, children }: {
  locale: Lang; mostRead: ArticleCard[]; categoryId?: string | null; children?: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: 'article' });
  return (
    <aside className="col-rule mt-10 space-y-10 lg:col-span-4 lg:mt-0">
      <AdSlot slotKey="sidebar_top" locale={locale} categoryId={categoryId} />
      {mostRead.length > 0 && (
        <section aria-label={t('mostRead')}>
          <SectionHeader title={t('mostRead')} />
          <ol className="hairline-list -mt-3">
            {mostRead.map((a, i) => <NumberedItem key={a.id} a={a} locale={locale} n={i + 1} />)}
          </ol>
        </section>
      )}
      {children}
    </aside>
  );
}
