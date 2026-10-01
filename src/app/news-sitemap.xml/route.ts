import { siteUrl } from '@/lib/env';
import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import { sinceCards } from '@/lib/seo/feeds';
import { absUrl, xmlEscape, xmlResponse } from '@/lib/seo/xml';

export const revalidate = 300;

/** Google News sitemap: articles first published in the last 48 hours. */
export async function GET() {
  const base = siteUrl();
  const since = new Date(Math.floor(Date.now() / 300_000) * 300_000 - 48 * 3600_000).toISOString();
  const [cards, settings] = await Promise.all([sinceCards(since), getSettings()]);
  const body = cards.map((a) => [
    '<url>',
    `<loc>${xmlEscape(absUrl(base, `/${a.language}/article/${a.public_id}/${a.slug}`))}</loc>`,
    '<news:news><news:publication>',
    `<news:name>${xmlEscape(pick(settings.site_name, a.language))}</news:name>`,
    `<news:language>${a.language}</news:language>`,
    '</news:publication>',
    `<news:publication_date>${new Date(a.first_published_at ?? a.published_at!).toISOString()}</news:publication_date>`,
    `<news:title>${xmlEscape(a.title)}</news:title>`,
    '</news:news></url>',
  ].join('')).join('\n');
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${body}\n</urlset>\n`, 'application/xml', 300);
}
