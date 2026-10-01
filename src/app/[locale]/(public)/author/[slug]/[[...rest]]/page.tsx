import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getAuthorBySlug, getMostRead, getSettings, languagesFor, listCards } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { authorHref } from '@/lib/public/links';
import { PAGE_SIZE, pageFromRest, redirectOr404 } from '@/lib/public/route-helpers';
import { socialLinks, SOCIAL_LABELS } from '@/lib/public/social';
import { pageMetadata } from '@/lib/seo/metadata';
import { JsonLd, profileJsonLd } from '@/lib/seo/jsonld';
import { largestUrl } from '@/lib/public/media';
import { Img } from '@/components/public/Img';
import { Listing } from '@/components/public/Listing';
import { OpinionItem, SectionHeader } from '@/components/public/story';

export const revalidate = 60;

// Rendered on first request, then cached (ISR) — nothing is prerendered at build time,
// so building doesn't need database access.
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ locale: AppLocale; slug: string; rest?: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug, rest } = await params;
  const author = await getAuthorBySlug(slug);
  const page = pageFromRest(rest);
  if (!author || !page) return {};
  const name = (locale === 'fr' ? author.display_name_fr : null) || author.display_name_ar;
  return pageMetadata({
    locale, settings: await getSettings(), title: page > 1 ? `${name} — ${page}` : name,
    description: (locale === 'fr' ? author.bio_fr : null) || author.bio_ar,
    path: `/author/${slug}${page > 1 ? `?page=${page}` : ''}`,
    image: largestUrl(author.avatar),
  });
}

export default async function AuthorPage({ params }: Params) {
  const { locale, slug, rest } = await params;
  setRequestLocale(locale);
  const page = pageFromRest(rest);
  if (!page) notFound();
  const author = await getAuthorBySlug(slug);
  if (!author) return redirectOr404(`/${locale}/author/${slug}`);
  const t = await getTranslations({ locale, namespace: 'author' });
  const settings = await getSettings();
  const langs = languagesFor(locale, settings);
  const [{ items, total }, columns, mostRead] = await Promise.all([
    listCards({ langs, authorId: author.id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, withCount: true }),
    page === 1 ? listCards({ langs, authorId: author.id, opinion: true, limit: 4 }) : Promise.resolve({ items: [], total: 0 }),
    getMostRead(langs, 7, 5),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) notFound();
  const name = (locale === 'fr' ? author.display_name_fr : null) || author.display_name_ar;
  const title = (locale === 'fr' ? author.title_fr : null) || author.title_ar;
  const bio = (locale === 'fr' ? author.bio_fr : null) || author.bio_ar;
  const socials = socialLinks(author.social);

  return (
    <div className="container-page mt-8">
      <header className="mb-10 flex flex-col gap-5 border-b-2 border-rule-strong pb-6 sm:flex-row">
        {author.avatar && <div className="w-[120px] shrink-0"><Img media={author.avatar} lang={locale} alt={name} ratio="1/1" sizes="120px" priority /></div>}
        <div className="max-w-[var(--measure)]">
          <h1 className="headline-1">{name}</h1>
          {title && <p className="kicker mt-1">{title}</p>}
          {bio && <p className="dek mt-3 whitespace-pre-line">{bio}</p>}
          <p className="meta mt-3 flex flex-wrap gap-x-4">
            {author.email_public && <a href={`mailto:${author.email_public}`} dir="ltr">{author.email_public}</a>}
            {socials.map(([k, url]) => <a key={k} href={url} target="_blank" rel="noopener">{SOCIAL_LABELS[k]?.[locale] ?? k}</a>)}
          </p>
        </div>
      </header>
      {columns.items.length > 0 && (
        <section className="mb-10">
          <SectionHeader title={t('columns')} />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">{columns.items.map((a) => <OpinionItem key={a.id} a={a} locale={locale} />)}</div>
        </section>
      )}
      <SectionHeader title={t('articles')} />
      <Listing locale={locale} items={items} page={page} totalPages={totalPages} basePath={authorHref(locale, slug)} mostRead={mostRead} empty={t('noArticles')} />
      <JsonLd data={profileJsonLd(author, locale)} />
    </div>
  );
}
