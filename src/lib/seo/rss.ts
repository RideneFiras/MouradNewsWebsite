import 'server-only';
import { siteUrl } from '@/lib/env';
import { pick, type SiteSettings } from '@/lib/data/settings';
import type { ArticleCard } from '@/lib/data/types';
import { largestUrl } from '@/lib/public/media';
import { absUrl, xmlEscape } from './xml';

/** RSS 2.0 with media:content for the cover (docs/08 "Sitemaps and feeds"). */
export function rss(opts: { settings: SiteSettings; locale: 'ar' | 'fr'; title: string; selfPath: string; linkPath: string; items: ArticleCard[] }): string {
  const base = siteUrl();
  const { settings, locale } = opts;
  const items = opts.items.map((a) => {
    const url = absUrl(base, `/${a.language}/article/${a.public_id}/${a.slug}`);
    const img = a.cover ? largestUrl(a.cover) : null;
    const authors = (a.authors ?? []).map((p) => (a.language === 'fr' ? p.name_fr : null) || p.name_ar).join('، ');
    const cat = (a.language === 'fr' ? a.category_name_fr : null) || a.category_name_ar;
    return [
      '<item>',
      `<title>${xmlEscape(a.title)}</title>`,
      `<link>${xmlEscape(url)}</link>`,
      `<guid isPermaLink="false">${xmlEscape(`${base}/a/${a.public_id}`)}</guid>`,
      `<pubDate>${new Date(a.published_at ?? Date.now()).toUTCString()}</pubDate>`,
      a.excerpt || a.subtitle ? `<description>${xmlEscape(a.excerpt || a.subtitle || '')}</description>` : '',
      authors ? `<dc:creator>${xmlEscape(authors)}</dc:creator>` : '',
      cat ? `<category>${xmlEscape(cat)}</category>` : '',
      img ? `<media:content url="${xmlEscape(img)}" medium="image"${a.cover?.width ? ` width="${a.cover.width}"` : ''}${a.cover?.height ? ` height="${a.cover.height}"` : ''}/>` : '',
      '</item>',
    ].join('');
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${xmlEscape(opts.title)}</title>
<link>${xmlEscape(absUrl(base, opts.linkPath))}</link>
<description>${xmlEscape(pick(settings.tagline, locale))}</description>
<language>${locale}</language>
<atom:link href="${xmlEscape(absUrl(base, opts.selfPath))}" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>
`;
}
