import { siteUrl } from '@/lib/env';
import { allArticleStubs } from '@/lib/seo/feeds';
import { sitemapIndex, xmlResponse } from '@/lib/seo/xml';

// Rendered on request (data cached by tag): the build must not need the database.
export const dynamic = 'force-dynamic';

/** Sitemap index: one sitemap per month of articles, plus sections, tags, authors, pages. */
export async function GET() {
  const base = siteUrl();
  const stubs = await allArticleStubs();
  const months = new Map<string, string>();
  for (const a of stubs) {
    const m = a.published_at.slice(0, 7);
    const mod = a.content_updated_at && a.content_updated_at > a.published_at ? a.content_updated_at : a.published_at;
    if (!months.has(m) || mod > months.get(m)!) months.set(m, mod);
  }
  return xmlResponse(sitemapIndex([
    ...[...months].map(([m, lastmod]) => ({ loc: `${base}/sitemaps/articles-${m}.xml`, lastmod })),
    { loc: `${base}/sitemaps/sections.xml` },
    { loc: `${base}/sitemaps/tags.xml` },
    { loc: `${base}/sitemaps/authors.xml` },
    { loc: `${base}/sitemaps/pages.xml` },
  ]));
}
