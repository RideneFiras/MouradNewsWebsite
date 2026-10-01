import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCategories, searchArticles } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { formatListTime } from '@/lib/format/date';
import { articleHref, sectionHref } from '@/lib/public/links';
import { categoryName } from '@/lib/public/labels';
import { Kicker } from '@/components/public/story';
import { Pagination } from '@/components/public/Pagination';

// Search results are per query: rendered on demand, never indexed.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const PER_PAGE = 20;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'search' });
  return { title: t('title'), robots: { index: false, follow: true } };
}

/** Marks query words in a title (diacritics-insensitive for Arabic). */
function highlight(title: string, q: string): ReactNode {
  const strip = (s: string) => s.replace(/[ً-ْٰـ]/g, '');
  const words = strip(q).split(/\s+/).filter((w) => w.length >= 2).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return title;
  const plain = strip(title);
  if (plain !== title) return title; // titles with tashkeel: no mark, avoid misaligned offsets
  const re = new RegExp(`(${words.join('|')})`, 'gi');
  return title.split(re).map((part, i) => (i % 2 ? <mark key={i} className="bg-paper-2 text-ink">{part}</mark> : part));
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 200);
  const lang = one(sp.lang) === 'ar' || one(sp.lang) === 'fr' ? (one(sp.lang) as 'ar' | 'fr') : null;
  const section = one(sp.section);
  const period = one(sp.period);
  const page = Math.max(1, Math.min(500, Number(one(sp.page)) || 1));
  const t = await getTranslations({ locale, namespace: 'search' });
  const ts = await getTranslations({ locale, namespace: 'section' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const categories = (await getCategories()).filter((c) => !c.parent_id);
  const cat = categories.find((c) => c.slug === section);
  const days = period === 'week' ? 7 : period === 'month' ? 31 : period === 'year' ? 366 : 0;
  const since = days ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) + 'T00:00:00Z' : null;
  const result = q ? await searchArticles(q, lang, cat?.id ?? null, since, PER_PAGE, (page - 1) * PER_PAGE) : null;

  const select = (name: string, label: string, value: string, options: [string, string][]) => (
    <label className="flex flex-col gap-1 font-ui text-[14px] text-ink-2">
      {label}
      <select name={name} defaultValue={value} className="input">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );

  return (
    <div className="container-page mt-8 max-w-[960px]">
      <h1 className="headline-1 pb-2">{t('title')}</h1>
      <div className="section-rule mb-6" />
      <form method="get" role="search" className="space-y-4">
        <div className="flex gap-2">
          <label htmlFor="q" className="sr-only">{t('title')}</label>
          <input id="q" name="q" type="search" defaultValue={q} className="input text-[18px]" placeholder={tc('searchPlaceholder')} />
          <button type="submit" className="btn btn-primary">{t('button')}</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {select('lang', t('language'), lang ?? '', [['', t('allLanguages')], ['ar', t('arabic')], ['fr', t('french')]])}
          {select('section', t('section'), cat?.slug ?? '', [['', t('allSections')], ...categories.map((c) => [c.slug, categoryName(c, locale)] as [string, string])])}
          {select('period', t('period'), period, [['', t('anyTime')], ['week', t('lastWeek')], ['month', t('lastMonth')], ['year', t('lastYear')]])}
        </div>
      </form>

      <div className="mt-8">
        {!q && <p className="dek">{t('prompt')}</p>}
        {result && result.total === 0 && (
          <div>
            <p className="dek">{t('empty')}</p>
            <p className="meta mt-3 flex flex-wrap gap-x-4">
              {categories.filter((c) => c.show_in_nav).map((c) => <Link key={c.id} href={sectionHref(locale, c.slug)} className="font-semibold text-ink-2">{categoryName(c, locale)}</Link>)}
            </p>
          </div>
        )}
        {result && result.total > 0 && (
          <>
            <p className="meta mb-2">{t('results', { count: result.total, q })}</p>
            <ul className="hairline-list border-t border-rule">
              {result.items.map((a) => (
                <li key={a.id} className="flex gap-3 py-3" lang={a.language !== locale ? a.language : undefined} dir={a.language !== locale ? (a.language === 'ar' ? 'rtl' : 'ltr') : undefined}>
                  <time dateTime={a.published_at} className="meta w-[4.5rem] shrink-0 pt-1">{formatListTime(a.published_at, a.language)}</time>
                  <div className="min-w-0">
                    <Kicker a={a} locale={locale} />
                    <h2 className="headline-3"><Link href={articleHref(a)} className="hover:text-accent">{highlight(a.title, q)}</Link></h2>
                    {a.excerpt && <p className="excerpt clamp-3 mt-1">{a.excerpt}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <Pagination basePath={`/${locale}/search`} page={page} totalPages={Math.ceil(result.total / PER_PAGE)}
              query={Object.fromEntries(Object.entries({ q, lang: lang ?? '', section: cat?.slug ?? '', period }).filter(([, v]) => v))}
              labels={{ newer: ts('newer'), older: ts('older'), page: (n) => tc('page', { n }) }} />
          </>
        )}
      </div>
    </div>
  );
}
