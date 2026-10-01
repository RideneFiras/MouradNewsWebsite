import type { ArticleCard, Category, Lang, Tag } from '@/lib/data/types';

export const nameOf = (x: { name_ar: string; name_fr: string | null }, locale: Lang) =>
  locale === 'fr' ? x.name_fr || x.name_ar : x.name_ar;

export const categoryName = (c: Pick<Category, 'name_ar' | 'name_fr'>, locale: Lang) => nameOf(c, locale);
export const tagName = (t: Pick<Tag, 'name_ar' | 'name_fr'>, locale: Lang) => nameOf(t, locale);

/** Kicker: free override, else the genre (if shown as kicker), else the section. In the article's language. */
export function kickerOf(a: ArticleCard): string {
  const lang = a.language;
  if (a.kicker_override?.trim()) return a.kicker_override.trim();
  if (a.format_show_as_kicker && a.format_name_ar) return (lang === 'fr' ? a.format_name_fr : null) || a.format_name_ar;
  return (lang === 'fr' ? a.category_name_fr : null) || a.category_name_ar;
}

export function bylineNames(a: ArticleCard): { name: string; slug: string | null }[] {
  if (a.byline_override?.trim()) return [{ name: a.byline_override.trim(), slug: null }];
  return a.authors.map((p) => ({ name: (a.language === 'fr' ? p.name_fr : null) || p.name_ar, slug: p.linkable ? p.slug : null }));
}

export const dirOfLang = (l: Lang) => (l === 'ar' ? 'rtl' : 'ltr');
