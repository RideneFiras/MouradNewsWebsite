import { describe, expect, it } from 'vitest';
import { articleSlug, slugify, SLUG_RE, transliterateArabic } from '@/lib/slug';

describe('slugify', () => {
  it('French names', () => {
    expect(slugify('Volley-ball')).toBe('volley-ball');
    expect(slugify('Économie')).toBe('economie');
    expect(slugify('Arts plastiques')).toBe('arts-plastiques');
    expect(slugify("L’Étoile du Sahel")).toBe('letoile-du-sahel');
  });
  it('Arabic names are transliterated to valid slugs', () => {
    for (const name of ['قليبية', 'الكرة الطائرة', 'منزل تميم', 'النادي الأولمبي بقليبية']) {
      const s = slugify(name);
      expect(s).toMatch(SLUG_RE);
    }
    expect(slugify('قليبية')).toBe('klibia');
    expect(transliterateArabic('الحمامات')).toBe('el-hmamat');
  });
  it('trims and limits length', () => {
    expect(slugify('  --Hello   World--  ')).toBe('hello-world');
    expect(slugify('a'.repeat(100)).length).toBe(60);
  });
});

describe('articleSlug', () => {
  it('keeps Arabic, strips diacritics and punctuation', () => {
    expect(articleSlug('«مُباراة» النادي: 3-1!')).toBe('مباراة-النادي-3-1');
  });
  it('max 80 chars, no trailing dash', () => {
    const s = articleSlug('كلمة '.repeat(40));
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith('-')).toBe(false);
  });
});
