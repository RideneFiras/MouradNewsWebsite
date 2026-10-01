import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getMediaById, getMostRead, getSettings, getTagBySlug, languagesFor, listCards } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { tagName } from '@/lib/public/labels';
import { topicHref } from '@/lib/public/links';
import { PAGE_SIZE, pageFromRest, redirectOr404 } from '@/lib/public/route-helpers';
import { pageMetadata } from '@/lib/seo/metadata';
import { Img } from '@/components/public/Img';
import { Listing } from '@/components/public/Listing';

export const revalidate = 60;

type Params = { params: Promise<{ locale: AppLocale; slug: string; rest?: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug, rest } = await params;
  const tag = await getTagBySlug(slug);
  const page = pageFromRest(rest);
  if (!tag || !page) return {};
  const name = tagName(tag, locale);
  return pageMetadata({
    locale, settings: await getSettings(), title: page > 1 ? `${name} — ${page}` : name,
    description: (locale === 'fr' ? tag.description_fr : null) || tag.description_ar,
    path: `/topic/${slug}${page > 1 ? `?page=${page}` : ''}`,
    noindex: page > 5,
  });
}

export default async function TopicPage({ params }: Params) {
  const { locale, slug, rest } = await params;
  setRequestLocale(locale);
  const page = pageFromRest(rest);
  if (!page) notFound();
  const tag = await getTagBySlug(slug);
  if (!tag) return redirectOr404(`/${locale}/topic/${slug}`);
  const t = await getTranslations({ locale, namespace: 'tag' });
  const ts = await getTranslations({ locale, namespace: 'section' });
  const settings = await getSettings();
  const langs = languagesFor(locale, settings);
  const [{ items, total }, mostRead, image] = await Promise.all([
    listCards({ langs, tagId: tag.id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, withCount: true }),
    getMostRead(langs, 7, 5),
    tag.image_media_id ? getMediaById(tag.image_media_id) : Promise.resolve(null),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) notFound();
  const description = (locale === 'fr' ? tag.description_fr : null) || tag.description_ar;
  return (
    <div className="container-page mt-8">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row">
        {image && page === 1 && <div className="w-40 shrink-0"><Img media={image} lang={locale} ratio="1/1" sizes="160px" /></div>}
        <div className="flex-1">
          <p className="kicker mb-1">{t(`kind_${tag.kind}`)}</p>
          <h1 className="headline-1 pb-2">{tagName(tag, locale)}</h1>
          <div className="section-rule" />
          {description && page === 1 && <p className="dek mt-3 max-w-[var(--measure)]">{description}</p>}
          {tag.kind === 'club' && page === 1 && <p className="meta mt-2">{t('resultsSoon')}</p>}
        </div>
      </header>
      <Listing locale={locale} items={items} page={page} totalPages={totalPages} basePath={topicHref(locale, slug)} mostRead={mostRead} empty={ts('empty')} />
    </div>
  );
}
