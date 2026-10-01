import { siteUrl, mediaUrl } from '@/lib/env';
import type { SiteSettings } from '@/lib/data/settings';
import { pick } from '@/lib/data/settings';
import type { ArticleFull, Lang, PublicAuthor, StaticPage } from '@/lib/data/types';
import { articleHref, authorHref, pageHref } from '@/lib/public/links';

/** Renders JSON-LD safely (escapes "<" so content can't close the script tag). */
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

type S = SiteSettings & { default_og_path?: string | null };

export function organization(locale: Lang, settings: S, policyPages: StaticPage[] = []) {
  const base = siteUrl();
  const logo = settings.logo.path ? mediaUrl(settings.logo.path) : null;
  const byKind = (k: string) => policyPages.find((p) => p.page_kind === k);
  const charter = byKind('charter');
  const about = byKind('about');
  return {
    '@type': 'NewsMediaOrganization',
    '@id': `${base}/#organization`,
    name: pick(settings.site_name, locale),
    alternateName: locale === 'ar' ? settings.site_name.fr : settings.site_name.ar,
    url: `${base}/${locale}`,
    ...(logo ? { logo: { '@type': 'ImageObject', url: logo } } : {}),
    ...(charter ? { ethicsPolicy: `${base}${pageHref(locale, charter.slug)}`, correctionsPolicy: `${base}${pageHref(locale, charter.slug)}` } : {}),
    ...(about ? { masthead: `${base}${pageHref(locale, about.slug)}` } : {}),
    sameAs: Object.values(settings.social_links ?? {}).filter((u) => typeof u === 'string' && u.startsWith('https://')),
  };
}

export function homeJsonLd(locale: Lang, settings: S) {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization(locale, settings),
      {
        '@type': 'WebSite',
        '@id': `${base}/#website-${locale}`,
        url: `${base}/${locale}`,
        name: pick(settings.site_name, locale),
        inLanguage: locale,
        publisher: { '@id': `${base}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${base}/${locale}/search?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

export function articleJsonLd(a: ArticleFull, settings: S, crumbs: { name: string; url: string }[]) {
  const base = siteUrl();
  const v = a.cover?.variants ?? {};
  const images = Object.keys(v).filter((w) => /^\d+$/.test(w)).sort((x, y) => Number(y) - Number(x)).map((w) => mediaUrl(v[w])).filter(Boolean);
  if (!images.length && a.cover) images.push(mediaUrl(a.cover.path));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        '@id': `${base}${articleHref(a)}#article`,
        mainEntityOfPage: `${base}${articleHref(a)}`,
        headline: a.title.slice(0, 110),
        description: a.seo_description || a.excerpt || a.subtitle || undefined,
        image: images.length ? images : undefined,
        datePublished: a.first_published_at ?? a.published_at,
        dateModified: a.content_updated_at ?? a.updated_at ?? a.published_at,
        author: a.byline_override
          ? [{ '@type': 'Organization', name: a.byline_override }]
          : a.authors.map((p) => ({
              '@type': 'Person',
              name: (a.language === 'fr' ? p.name_fr : null) || p.name_ar,
              ...(p.linkable ? { url: `${base}${authorHref(a.language, p.slug)}` } : {}),
            })),
        publisher: organization(a.language, settings),
        articleSection: (a.language === 'fr' ? a.category_name_fr : null) || a.category_name_ar,
        inLanguage: a.language,
        isAccessibleForFree: true,
        keywords: a.tags.map((t) => (a.language === 'fr' ? t.name_fr : null) || t.name_ar).join(', ') || undefined,
      },
      breadcrumbs(crumbs),
    ],
  };
}

export function profileJsonLd(author: PublicAuthor, locale: Lang) {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: (locale === 'fr' ? author.display_name_fr : null) || author.display_name_ar,
      jobTitle: (locale === 'fr' ? author.title_fr : null) || author.title_ar || undefined,
      description: (locale === 'fr' ? author.bio_fr : null) || author.bio_ar || undefined,
      url: `${base}${authorHref(locale, author.slug)}`,
      image: author.avatar ? mediaUrl(Object.values(author.avatar.variants ?? {})[0] ?? author.avatar.path) : undefined,
      sameAs: Object.values(author.social ?? {}).filter((u) => typeof u === 'string' && u.startsWith('https://')),
    },
  };
}
