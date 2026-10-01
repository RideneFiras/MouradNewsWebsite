import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ArticleView } from '@/components/public/ArticleView';
import { getArticle, getAuthorBySlug, getMostRead, getSettings, getTranslations as getArticleTranslations, languagesFor, listCards } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { articleHref, sectionHref } from '@/lib/public/links';
import { siteUrl } from '@/lib/env';
import { daysAgoIso } from '@/lib/format/date';
import { articleMetadata } from '@/lib/seo/metadata';
import { articleJsonLd, JsonLd } from '@/lib/seo/jsonld';

export const revalidate = 60;

type Params = { params: Promise<{ locale: AppLocale; id: string; slug?: string[] }> };

const parseId = (id: string) => (/^\d{1,15}$/.test(id) ? Number(id) : null);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const pid = parseId(id);
  const a = pid ? await getArticle(pid) : null;
  if (!a) return {};
  const settings = await getSettings();
  const translations = a.translation_group_id ? await getArticleTranslations(a.translation_group_id) : [];
  return articleMetadata(a, settings, translations.map((t) => ({ language: t.language, url: `${siteUrl()}${articleHref(t)}` })));
}

export default async function ArticlePage({ params }: Params) {
  const { locale, id, slug } = await params;
  setRequestLocale(locale);
  const pid = parseId(id);
  if (!pid) notFound();
  const a = await getArticle(pid);
  if (!a) notFound();

  const translations = a.translation_group_id ? await getArticleTranslations(a.translation_group_id) : [];
  // An article lives under the locale of its language (or its translation's).
  if (a.language !== locale) {
    const tr = translations.find((t) => t.language === locale);
    permanentRedirect(articleHref(tr ?? a));
  }
  const wanted = a.slug ?? '';
  const got = slug?.length ? decodeURIComponent(slug.join('/')) : '';
  if (got !== wanted || (slug?.length ?? 0) > 1) permanentRedirect(articleHref(a));

  const settings = await getSettings();
  const langs = languagesFor(locale, settings);
  const since = daysAgoIso(180);
  const [byTags, bySection, mostRead] = await Promise.all([
    a.tag_ids.length ? listCards({ langs: [a.language], tagIds: a.tag_ids, excludeIds: [a.id], since, limit: 3 }) : Promise.resolve({ items: [], total: 0 }),
    listCards({ langs: [a.language], categoryIds: [a.category_id], excludeIds: [a.id], since, limit: 8 }),
    getMostRead(langs, 7, 5),
  ]);
  const primary = a.authors[0];
  const author = primary?.linkable ? await getAuthorBySlug(primary.slug) : null;
  const authorBio = author ? (a.language === 'fr' ? author.bio_fr : null) || author.bio_ar : null;
  const related = [...byTags.items, ...bySection.items.filter((x) => !byTags.items.some((y) => y.id === x.id))].slice(0, 3);
  const moreFromSection = bySection.items.filter((x) => !related.some((r) => r.id === x.id)).slice(0, 5);

  const other = locale === 'ar' ? 'fr' : 'ar';
  const otherTr = translations.find((t) => t.language === other);
  const switchHref = otherTr ? articleHref(otherTr) : `/${other}`;
  const base = siteUrl();
  const sectionName = (a.language === 'fr' ? a.category_name_fr : null) || a.category_name_ar;

  return (
    <>
      <span hidden data-lang-switch={switchHref} />
      <ArticleView a={a} locale={locale} settings={settings} related={related} moreFromSection={moreFromSection} mostRead={mostRead.filter((x) => x.id !== a.id)} authorBio={authorBio} />
      <JsonLd data={articleJsonLd(a, settings, [
        { name: locale === 'fr' ? 'Accueil' : 'الرئيسية', url: `${base}/${locale}` },
        { name: sectionName, url: `${base}${sectionHref(a.language, a.category_slug)}` },
        { name: a.title, url: `${base}${articleHref(a)}` },
      ])} />
    </>
  );
}
