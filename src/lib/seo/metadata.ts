import type { Metadata } from 'next';
import { siteUrl } from '@/lib/env';
import type { SiteSettings } from '@/lib/data/settings';
import { pick } from '@/lib/data/settings';
import type { ArticleFull, Lang } from '@/lib/data/types';
import { largestUrl } from '@/lib/public/media';
import { mediaUrl } from '@/lib/env';
import { articleHref } from '@/lib/public/links';

export const OG_LOCALE: Record<Lang, string> = { ar: 'ar_TN', fr: 'fr_TN' };

type S = SiteSettings & { default_og_path?: string | null; favicon_path?: string | null };

export function defaultOgImage(settings: S): string | undefined {
  return settings.default_og_path ? mediaUrl(settings.default_og_path) ?? undefined : undefined;
}

/** Both-locale alternates for pages that exist in both interfaces (home, sections, tags...). */
export function bothLocales(pathAfterLocale: string): NonNullable<Metadata['alternates']>['languages'] {
  const base = siteUrl();
  return { ar: `${base}/ar${pathAfterLocale}`, fr: `${base}/fr${pathAfterLocale}`, 'x-default': `${base}/ar${pathAfterLocale}` };
}

export function pageMetadata(opts: {
  locale: Lang;
  settings: S;
  title: string;
  description?: string | null;
  path: string; // after the locale, e.g. "/section/sport"
  bothLanguages?: boolean;
  noindex?: boolean;
  image?: string | null;
  rss?: string;
}): Metadata {
  const { locale, settings } = opts;
  const url = `${siteUrl()}/${locale}${opts.path}`;
  const image = opts.image ?? defaultOgImage(settings);
  const description = opts.description?.slice(0, 300) || pick(settings.tagline, locale);
  return {
    title: opts.title,
    description,
    alternates: {
      canonical: url,
      languages: opts.bothLanguages === false ? undefined : bothLocales(opts.path),
      types: opts.rss ? { 'application/rss+xml': `${siteUrl()}${opts.rss}` } : undefined,
    },
    robots: opts.noindex ? { index: false, follow: true } : { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      type: 'website',
      url,
      title: opts.title,
      description,
      siteName: pick(settings.site_name, locale),
      locale: OG_LOCALE[locale],
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: opts.title, description, images: image ? [image] : undefined },
  };
}

export function homeMetadata(locale: Lang, settings: S): Metadata {
  const name = pick(settings.site_name, locale);
  return pageMetadata({
    locale, settings, path: '', rss: `/${locale}/rss.xml`,
    title: `${name} — ${pick(settings.tagline, locale)}`,
  });
}

export function articleMetadata(a: ArticleFull, settings: S, translations: { language: Lang; url: string }[]): Metadata {
  const url = `${siteUrl()}${articleHref(a)}`;
  const title = a.seo_title || a.title;
  const description = a.seo_description || a.excerpt || a.subtitle || pick(settings.tagline, a.language);
  const og = largestUrl(a.og_media ?? a.cover) ?? defaultOgImage(settings);
  const languages: Record<string, string> = {};
  for (const t of translations) languages[t.language] = t.url;
  if (Object.keys(languages).length > 1) languages['x-default'] = languages.ar ?? url;
  const section = (a.language === 'fr' ? a.category_name_fr : null) || a.category_name_ar;
  return {
    title,
    description,
    alternates: { canonical: a.canonical_url || url, languages: Object.keys(languages).length > 1 ? languages : undefined },
    robots: { index: true, follow: true, 'max-image-preview': 'large' },
    authors: a.authors.map((p) => ({ name: (a.language === 'fr' ? p.name_fr : null) || p.name_ar })),
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: pick(settings.site_name, a.language),
      locale: OG_LOCALE[a.language],
      publishedTime: a.first_published_at ?? a.published_at,
      modifiedTime: a.content_updated_at ?? a.updated_at,
      section,
      tags: a.tags.map((t) => (a.language === 'fr' ? t.name_fr : null) || t.name_ar),
      images: og ? [{ url: og }] : undefined,
    },
    twitter: { card: og ? 'summary_large_image' : 'summary', title, description, images: og ? [og] : undefined },
  };
}
