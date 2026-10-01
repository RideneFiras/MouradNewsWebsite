import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getFormats, getMostRead, getSettings, languagesFor, listCards } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { nameOf } from '@/lib/public/labels';
import { formatHref } from '@/lib/public/links';
import { PAGE_SIZE, pageFromRest } from '@/lib/public/route-helpers';
import { pageMetadata } from '@/lib/seo/metadata';
import { Listing } from '@/components/public/Listing';

export const revalidate = 60;

// Rendered on first request, then cached (ISR) — nothing is prerendered at build time,
// so building doesn't need database access.
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ locale: AppLocale; slug: string; rest?: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug, rest } = await params;
  const f = (await getFormats()).find((x) => x.slug === slug);
  const page = pageFromRest(rest);
  if (!f || !page) return {};
  return pageMetadata({ locale, settings: await getSettings(), title: nameOf(f, locale), path: `/format/${slug}${page > 1 ? `?page=${page}` : ''}` });
}

export default async function FormatPage({ params }: Params) {
  const { locale, slug, rest } = await params;
  setRequestLocale(locale);
  const page = pageFromRest(rest);
  if (!page) notFound();
  const f = (await getFormats()).find((x) => x.slug === slug);
  if (!f) notFound();
  const ts = await getTranslations({ locale, namespace: 'section' });
  const settings = await getSettings();
  const langs = languagesFor(locale, settings);
  // "opinion" lists every opinion-style genre (opinion + column).
  const [{ items, total }, mostRead] = await Promise.all([
    f.slug === 'opinion'
      ? listCards({ langs, opinion: true, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, withCount: true })
      : listCards({ langs, formatId: f.id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, withCount: true }),
    getMostRead(langs, 7, 5),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) notFound();
  return (
    <div className="container-page mt-8">
      <h1 className="headline-1 pb-2">{nameOf(f, locale)}</h1>
      <div className="section-rule mb-8" />
      <Listing locale={locale} items={items} page={page} totalPages={totalPages} basePath={formatHref(locale, slug)} mostRead={mostRead} empty={ts('empty')} />
    </div>
  );
}
