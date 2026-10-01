import { getCategories, getSettings, languagesFor } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import { recentCards } from '@/lib/seo/feeds';
import { rss } from '@/lib/seo/rss';
import { xmlResponse } from '@/lib/seo/xml';

export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

/** Per-section feed (the section and its sub-sections). */
export async function GET(_req: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: l, slug } = await params;
  if (l !== 'ar' && l !== 'fr') return new Response('Not found', { status: 404 });
  const [settings, cats] = await Promise.all([getSettings(), getCategories()]);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return new Response('Not found', { status: 404 });
  const ids = [cat.id, ...cats.filter((c) => c.parent_id === cat.id).map((c) => c.id)];
  const lists = await Promise.all(languagesFor(l, settings).map((lang) => recentCards(lang, ids, 30)));
  const items = lists.flat().sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')).slice(0, 30);
  const name = (l === 'fr' ? cat.name_fr : null) || cat.name_ar;
  return xmlResponse(rss({ settings, locale: l, title: `${name} | ${pick(settings.site_name, l)}`, selfPath: `/${l}/section/${slug}/rss.xml`, linkPath: `/${l}/section/${slug}`, items }), 'application/rss+xml', 300);
}
