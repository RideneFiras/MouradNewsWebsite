import 'server-only';
import { getCategories, getMenu, getPublishedPages, getSettings, languagesFor, listCards } from './queries';
import type { Lang } from './types';

/** Everything the masthead and footer need (cached queries, ~5 DB round trips when cold). */
export async function getChrome(locale: Lang) {
  const settings = await getSettings();
  const langs = languagesFor(locale, settings);
  const [categories, menu, pages, latest, breaking] = await Promise.all([
    getCategories(),
    getMenu('footer'),
    getPublishedPages(locale),
    listCards({ langs, limit: 1 }),
    listCards({ langs, breaking: true, limit: 5 }),
  ]);
  return { settings, langs, categories, menu, pages, latest: latest.items[0] ?? null, breaking: breaking.items };
}
