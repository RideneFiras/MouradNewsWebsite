import 'server-only';
import { getPageTranslation } from '@/lib/data/queries';
import type { Lang, StaticPage } from '@/lib/data/types';
import { pageHref } from './links';

/** Where the language switch goes from a static page: its translation, or the other homepage. */
export async function pageSwitchHref(page: StaticPage, locale: Lang): Promise<string> {
  const other: Lang = locale === 'ar' ? 'fr' : 'ar';
  if (!page.translation_group_id) return `/${other}`;
  const tr = await getPageTranslation(page.translation_group_id, other);
  return tr ? pageHref(other, tr.slug, tr.page_kind) : `/${other}`;
}
