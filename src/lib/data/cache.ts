import 'server-only';
import { unstable_cache } from 'next/cache';

/** Every public page is fresh within 5 minutes; mutations revalidate these tags at once. */
export const REVALIDATE_SECONDS = 300;

export const TAGS = {
  settings: 'settings',
  taxonomy: 'taxonomy',
  menus: 'menus',
  pages: 'pages',
  homepage: 'homepage',
  articles: 'articles',
  authors: 'authors',
  ads: 'ads',
  stats: 'stats',
  redirects: 'redirects',
} as const;

export const ALL_TAGS = Object.values(TAGS);

export function cached<A extends unknown[], T>(fn: (...args: A) => Promise<T>, key: string, tags: string[], revalidate = REVALIDATE_SECONDS) {
  return unstable_cache(fn, [key], { revalidate, tags });
}
