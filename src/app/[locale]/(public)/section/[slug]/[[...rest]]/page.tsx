import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCategories, getMostRead, getSettings, languagesFor, listCards } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { categoryName } from '@/lib/public/labels';
import { sectionHref } from '@/lib/public/links';
import { PAGE_SIZE, pageFromRest, redirectOr404 } from '@/lib/public/route-helpers';
import { pageMetadata } from '@/lib/seo/metadata';
import { breadcrumbs, JsonLd } from '@/lib/seo/jsonld';
import { siteUrl } from '@/lib/env';
import { LeadStory, SecondaryStory } from '@/components/public/story';
import { Pagination } from '@/components/public/Pagination';
import { SideColumn } from '@/components/public/SideColumn';
import { AdSlot } from '@/components/public/AdSlot';

export const revalidate = 300;

// Rendered on first request, then cached (ISR) — nothing is prerendered at build time,
// so building doesn't need database access.
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ locale: AppLocale; slug: string; rest?: string[] }> };

async function load(slug: string) {
  const categories = await getCategories();
  const cat = categories.find((c) => c.slug === slug);
  return { categories, cat };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug, rest } = await params;
  const { cat } = await load(slug);
  const page = pageFromRest(rest);
  if (!cat || !page) return {};
  const name = (locale === 'fr' ? cat.seo_title_fr : cat.seo_title_ar) || categoryName(cat, locale);
  return pageMetadata({
    locale, settings: await getSettings(),
    title: page > 1 ? `${name} — ${page}` : name,
    description: (locale === 'fr' ? cat.seo_description_fr || cat.description_fr : cat.seo_description_ar || cat.description_ar) || null,
    path: `/section/${slug}${page > 1 ? `?page=${page}` : ''}`,
    rss: `/${locale}/section/${slug}/rss.xml`,
  });
}

export default async function SectionPage({ params }: Params) {
  const { locale, slug, rest } = await params;
  setRequestLocale(locale);
  const page = pageFromRest(rest);
  if (!page) notFound();
  const { categories, cat } = await load(slug);
  if (!cat) return redirectOr404(`/${locale}/section/${slug}`);

  const t = await getTranslations({ locale, namespace: 'section' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const settings = await getSettings();
  const langs = languagesFor(locale, settings);
  const children = categories.filter((c) => c.parent_id === cat.id);
  const parent = cat.parent_id ? categories.find((c) => c.id === cat.parent_id) : null;
  const ids = [cat.id, ...children.map((c) => c.id)];

  const [{ items, total }, mostRead] = await Promise.all([
    listCards({ langs, categoryIds: ids, includeExtra: true, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, withCount: true }),
    getMostRead(langs, 30, 5, cat.id),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) notFound();
  const [first, ...others] = page === 1 ? items : [undefined, ...items];
  const description = locale === 'fr' ? cat.description_fr || cat.description_ar : cat.description_ar;
  const base = siteUrl();

  return (
    <div className="container-page mt-8">
      <header className="mb-8">
        {parent && <p className="kicker mb-1"><Link prefetch={false} href={sectionHref(locale, parent.slug)}>{categoryName(parent, locale)}</Link></p>}
        <h1 className="headline-1 pb-2">{categoryName(cat, locale)}</h1>
        <div className="section-rule" style={{ '--notch': cat.color } as CSSProperties} />
        {description && <p className="dek mt-3 max-w-[var(--measure)]">{description}</p>}
        {children.length > 0 && (
          <p className="meta mt-3" aria-label={t('subsections')}>
            {children.map((c, i) => (
              <span key={c.id}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <Link prefetch={false} href={sectionHref(locale, c.slug)} className="font-semibold text-ink-2 hover:text-accent">{categoryName(c, locale)}</Link>
              </span>
            ))}
          </p>
        )}
      </header>

      {items.length === 0 ? (
        <p className="dek">{t('empty')}</p>
      ) : (
        <div className="grid lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-8">
            {first && <div className="mb-8 border-b border-rule pb-8"><LeadStory a={first} locale={locale} layout="stacked" /></div>}
            <div className="space-y-6 [&>*+*]:border-t [&>*+*]:border-rule [&>*+*]:pt-6">
              {others.filter(Boolean).map((a, i) => (
                <div key={a!.id}>
                  <SecondaryStory a={a!} locale={locale} horizontal />
                  {i === 4 && <AdSlot slotKey="category_inline" locale={locale} categoryId={cat.id} className="mt-6" />}
                </div>
              ))}
            </div>
            <Pagination basePath={sectionHref(locale, slug)} page={page} totalPages={totalPages}
              labels={{ newer: t('newer'), older: t('older'), page: (n) => tc('page', { n }) }} />
          </div>
          <SideColumn locale={locale} mostRead={mostRead} categoryId={cat.id} />
        </div>
      )}
      <JsonLd data={{ '@context': 'https://schema.org', ...breadcrumbs([
        { name: tc('home'), url: `${base}/${locale}` },
        ...(parent ? [{ name: categoryName(parent, locale), url: `${base}${sectionHref(locale, parent.slug)}` }] : []),
        { name: categoryName(cat, locale), url: `${base}${sectionHref(locale, cat.slug)}` },
      ]) }} />
    </div>
  );
}
