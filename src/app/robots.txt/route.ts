import { siteUrl } from '@/lib/env';

export const revalidate = 3600;

/** docs/08: everything public is crawlable; admin, API and search are not. */
export function GET() {
  const base = siteUrl();
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /*/admin',
    'Disallow: /api/',
    'Disallow: /*/search',
    'Disallow: /*/preview',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    `Sitemap: ${base}/news-sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
