import { siteUrl } from '@/lib/env';
import { allArticleStubs, allAuthors, allTags } from '@/lib/seo/feeds';
import { getCategories, getPublishedPages } from '@/lib/data/queries';
import { pageHref } from '@/lib/public/links';
import { absUrl, urlset, xmlResponse } from '@/lib/seo/xml';

export const revalidate = 600;
export function generateStaticParams() {
  return [];
}

const both = (base: string, path: string) => [
  { lang: 'ar', href: absUrl(base, `/ar${path}`) },
  { lang: 'fr', href: absUrl(base, `/fr${path}`) },
  { lang: 'x-default', href: absUrl(base, `/ar${path}`) },
];
const twice = (base: string, path: string, lastmod?: string | null) =>
  (['ar', 'fr'] as const).map((l) => ({ loc: absUrl(base, `/${l}${path}`), lastmod, alternates: both(base, path) }));

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const base = siteUrl();
  const month = file.match(/^articles-(\d{4}-\d{2})\.xml$/)?.[1];
  if (month) {
    const stubs = await allArticleStubs();
    const inMonth = stubs.filter((a) => a.published_at.startsWith(month));
    if (!inMonth.length) return new Response('Not found', { status: 404 });
    const byGroup = new Map<string, typeof stubs>();
    for (const a of stubs) if (a.translation_group_id) byGroup.set(a.translation_group_id, [...(byGroup.get(a.translation_group_id) ?? []), a]);
    const href = (a: (typeof stubs)[number]) => absUrl(base, `/${a.language}/article/${a.public_id}/${a.slug}`);
    return xmlResponse(urlset(inMonth.map((a) => {
      const group = a.translation_group_id ? byGroup.get(a.translation_group_id) ?? [] : [];
      return {
        loc: href(a),
        lastmod: a.content_updated_at ?? a.published_at,
        alternates: group.length > 1 ? group.map((g) => ({ lang: g.language, href: href(g) })) : undefined,
      };
    })));
  }
  switch (file) {
    case 'sections.xml': {
      const cats = await getCategories();
      return xmlResponse(urlset([...twice(base, ''), ...twice(base, '/latest'), ...cats.flatMap((c) => twice(base, `/section/${c.slug}`))]));
    }
    case 'tags.xml': {
      // Only tags with at least 3 articles (docs/08: avoid thin pages).
      const [tags, stubs] = await Promise.all([allTags(), allArticleStubs()]);
      const count = new Map<string, number>();
      for (const a of stubs) for (const id of a.tag_ids ?? []) count.set(id, (count.get(id) ?? 0) + 1);
      return xmlResponse(urlset(tags.filter((t) => (count.get(t.id) ?? 0) >= 3).flatMap((t) => twice(base, `/topic/${t.slug}`, t.updated_at))));
    }
    case 'authors.xml': {
      const authors = await allAuthors();
      return xmlResponse(urlset(authors.flatMap((a) => twice(base, `/author/${a.slug}`))));
    }
    case 'pages.xml': {
      const [ar, fr] = await Promise.all([getPublishedPages('ar'), getPublishedPages('fr')]);
      return xmlResponse(urlset([...ar, ...fr].map((p) => ({ loc: absUrl(base, pageHref(p.language, p.slug, p.page_kind)), lastmod: p.updated_at }))));
    }
    default:
      return new Response('Not found', { status: 404 });
  }
}
