import { describe, expect, it } from 'vitest';
import { splitSentences } from '@/lib/public/sentences';

describe('splitSentences', () => {
  it('splits Arabic text on . and ؟ and keeps offsets', () => {
    const t = 'قليبية — انطلق المهرجان. هل تحضر؟ نعم، سأحضر';
    const s = splitSentences(t);
    expect(s.map((x) => x.text)).toEqual(['قليبية — انطلق المهرجان.', 'هل تحضر؟', 'نعم، سأحضر']);
    for (const x of s) expect(t.slice(x.start, x.end)).toBe(x.text);
  });
  it('splits on line breaks and drops punctuation-only pieces', () => {
    expect(splitSentences('الجمعة 2 أكتوبر\nعرض مسرحي .\n...').map((x) => x.text)).toEqual(['الجمعة 2 أكتوبر', 'عرض مسرحي .']);
  });
  it('keeps decimal-free French sentences', () => {
    expect(splitSentences('Le festival ouvre. Entrée libre !').map((x) => x.text)).toEqual(['Le festival ouvre.', 'Entrée libre !']);
  });
});
