import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSettings, languagesFor, listCards } from '@/lib/data/queries';
import type { ArticleCard } from '@/lib/data/types';
import type { AppLocale } from '@/lib/i18n/routing';
import { formatDate, todayAndYesterday, tunisDayKey } from '@/lib/format/date';
import { articleHref } from '@/lib/public/links';
import { pageFromRest } from '@/lib/public/route-helpers';
import { pageMetadata } from '@/lib/seo/metadata';
import { Img } from '@/components/public/Img';
import { Kicker } from '@/components/public/story';
import { Pagination } from '@/components/public/Pagination';

export const revalidate = 60;
const PER_PAGE = 40;

type Params = { params: Promise<{ locale: AppLocale; rest?: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, rest } = await params;
  const page = pageFromRest(rest) ?? 1;
  const t = await getTranslations({ locale, namespace: 'latest' });
  return pageMetadata({ locale, settings: await getSettings(), title: t('title'), path: `/latest${page > 1 ? `?page=${page}` : ''}`, rss: `/${locale}/rss.xml` });
}

export default async function LatestPage({ params }: Params) {
  const { locale, rest } = await params;
  setRequestLocale(locale);
  const page = pageFromRest(rest);
  if (!page) notFound();
  const t = await getTranslations({ locale, namespace: 'latest' });
  const tt = await getTranslations({ locale, namespace: 'time' });
  const ts = await getTranslations({ locale, namespace: 'section' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const settings = await getSettings();
  const { items, total } = await listCards({ langs: languagesFor(locale, settings), limit: PER_PAGE, offset: (page - 1) * PER_PAGE, withCount: true });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (page > totalPages) notFound();

  const { today, yesterday } = todayAndYesterday();
  const groups: { key: string; items: ArticleCard[] }[] = [];
  for (const a of items) {
    const k = tunisDayKey(a.published_at);
    const g = groups[groups.length - 1];
    if (g && g.key === k) g.items.push(a);
    else groups.push({ key: k, items: [a] });
  }
  const dayLabel = (k: string, sample: string) => (k === today ? tt('today') : k === yesterday ? tt('yesterday') : formatDate(sample, locale, 'full'));

  return (
    <div className="container-page mt-8">
      <h1 className="headline-1 pb-2">{t('title')}</h1>
      <div className="section-rule mb-6" />
      <div className="max-w-[860px]">
        {groups.map((g) => (
          <section key={g.key} className="mb-8" aria-labelledby={`d-${g.key}`}>
            <h2 id={`d-${g.key}`} className="kicker border-b border-rule-strong pb-2 text-ink">{dayLabel(g.key, g.items[0]!.published_at)}</h2>
            <ul className="hairline-list">
              {g.items.map((a) => (
                <li key={a.id} className="flex gap-4 py-3" lang={a.language !== locale ? a.language : undefined} dir={a.language !== locale ? (a.language === 'ar' ? 'rtl' : 'ltr') : undefined}>
                  <time dateTime={a.published_at} className="meta w-12 shrink-0 pt-1 tabular-nums">{formatDate(a.published_at, a.language, 'time')}</time>
                  <div className="min-w-0 flex-1">
                    <Kicker a={a} locale={locale} />
                    <h3 className="headline-3"><Link href={articleHref(a)} className="hover:text-accent">{a.title}</Link></h3>
                  </div>
                  {a.cover && (
                    <Link href={articleHref(a)} tabIndex={-1} aria-hidden="true" className="hidden w-32 shrink-0 lg:block">
                      <Img media={a.cover} lang={a.language} alt={a.cover_alt} ratio="4/3" sizes="128px" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <Pagination basePath={`/${locale}/latest`} page={page} totalPages={totalPages} labels={{ newer: ts('newer'), older: ts('older'), page: (n) => tc('page', { n }) }} />
      </div>
    </div>
  );
}
