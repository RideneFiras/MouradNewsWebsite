// Slugs for URLs of sections, tags, authors and pages: lowercase ASCII [a-z0-9-].
// Arabic names are transliterated (simple, readable, not scholarly).

const AR_MAP: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ٱ': 'a', 'ء': '', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
  'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'ch', 'ص': 's', 'ض': 'd',
  'ط': 't', 'ظ': 'dh', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'k', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'ة': 'a', 'و': 'ou', 'ؤ': 'ou', 'ي': 'i', 'ى': 'a', 'ئ': 'i', 'ڤ': 'v', 'پ': 'p', 'گ': 'g',
};

export function transliterateArabic(input: string): string {
  return input
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/^ال|\sال/g, (m) => (m.startsWith(' ') ? ' el-' : 'el-'))
    .split('')
    .map((ch) => AR_MAP[ch] ?? ch)
    .join('');
}

export function slugify(input: string, maxLength = 60): string {
  const latin = transliterateArabic(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return latin.slice(0, maxLength).replace(/-+$/g, '');
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Cosmetic article slug (Arabic allowed), mirrors public.article_slug() in SQL. */
export function articleSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[^a-z0-9ء-ي٠-٩À-ÿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}
