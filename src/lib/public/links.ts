import type { ArticleCard, Lang } from '@/lib/data/types';

/** Articles live under the locale of their own language. */
export function articleHref(a: Pick<ArticleCard, 'public_id' | 'slug' | 'language'>): string {
  return `/${a.language}/article/${a.public_id}${a.slug ? `/${encodeURIComponent(a.slug)}` : ''}`;
}
export const sectionHref = (locale: Lang, slug: string) => `/${locale}/section/${slug}`;
export const topicHref = (locale: Lang, slug: string) => `/${locale}/topic/${slug}`;
export const authorHref = (locale: Lang, slug: string) => `/${locale}/author/${slug}`;
export const formatHref = (locale: Lang, slug: string) => `/${locale}/format/${slug}`;
export const pageHref = (locale: Lang, slug: string, kind?: string) =>
  kind === 'media_kit' ? `/${locale}/advertise` : kind === 'contact' ? `/${locale}/contact` : `/${locale}/p/${slug}`;

/** Menu URLs are stored locale-relative ("/p/about") or absolute ("https://…"). */
export function menuUrl(locale: Lang, url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  if (/^\/(ar|fr)(\/|$)/.test(url)) return url;
  return `/${locale}${url.startsWith('/') ? url : `/${url}`}`;
}

/** Adds share-tracking UTM params (docs/07: recover WhatsApp/Facebook shares). */
export function withShareUtm(url: string, source: 'whatsapp' | 'facebook' | 'x' | 'copy'): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', 'share');
  return u.toString();
}
