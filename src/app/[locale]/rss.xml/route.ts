import { getSettings, languagesFor } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import { recentCards } from '@/lib/seo/feeds';
import { rss } from '@/lib/seo/rss';
import { xmlResponse } from '@/lib/seo/xml';

export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: l } = await params;
  if (l !== 'ar' && l !== 'fr') return new Response('Not found', { status: 404 });
  const settings = await getSettings();
  const langs = languagesFor(l, settings);
  const lists = await Promise.all(langs.map((lang) => recentCards(lang, null, 30)));
  const items = lists.flat().sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')).slice(0, 30);
  return xmlResponse(rss({ settings, locale: l, title: pick(settings.site_name, l), selfPath: `/${l}/rss.xml`, linkPath: `/${l}`, items }), 'application/rss+xml', 300);
}
