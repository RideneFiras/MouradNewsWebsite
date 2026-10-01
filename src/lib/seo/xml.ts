// Small, dependency-free XML helpers for sitemaps and RSS.

export const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    // Characters not allowed in XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');

/** Absolute URL with the path percent-encoded (Arabic slugs), as sitemaps require. */
export function absUrl(base: string, path: string): string {
  return base + path.split('/').map((seg) => (/%[0-9A-F]{2}/i.test(seg) ? seg : encodeURIComponent(seg))).join('/');
}

export function urlset(entries: { loc: string; lastmod?: string | null; alternates?: { lang: string; href: string }[] }[]): string {
  const body = entries.map((e) => [
    '<url>',
    `<loc>${xmlEscape(e.loc)}</loc>`,
    e.lastmod ? `<lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : '',
    ...(e.alternates ?? []).map((a) => `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${xmlEscape(a.href)}"/>`),
    '</url>',
  ].join('')).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
}

export function sitemapIndex(locs: { loc: string; lastmod?: string | null }[]): string {
  const body = locs.map((s) => `<sitemap><loc>${xmlEscape(s.loc)}</loc>${s.lastmod ? `<lastmod>${new Date(s.lastmod).toISOString()}</lastmod>` : ''}</sitemap>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export const xmlResponse = (body: string, type = 'application/xml', maxAge = 600) =>
  new Response(body, { headers: { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}` } });
