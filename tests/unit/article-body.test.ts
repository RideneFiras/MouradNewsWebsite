import { describe, expect, it } from 'vitest';
import { buildBody } from '@/lib/public/article-body';
import { renderDoc } from '@/lib/content/render';
import { sanitizeArticleHtml } from '@/lib/content/sanitize';

const doc = (n: number) => ({
  type: 'doc',
  content: [
    ...Array.from({ length: n }, (_, i) => ({ type: 'paragraph', content: [{ type: 'text', text: `فقرة ${i + 1}` }] })),
  ],
});

describe('buildBody', () => {
  it('prints the dateline in the first paragraph', () => {
    const chunks = buildBody(renderDoc(doc(2)), { location: 'قليبية', ads: false, afterParagraphs: [], minParagraphs: 5 });
    expect(chunks[0]!.html).toContain('<p><span class="dateline">قليبية — </span>فقرة 1</p>');
  });
  it('inserts ads after paragraphs 3 and 8 only when long enough', () => {
    const long = buildBody(renderDoc(doc(10)), { ads: true, afterParagraphs: [3, 8], minParagraphs: 5 });
    expect(long.map((c) => c.adAfter).filter(Boolean)).toEqual(['in_article_1', 'in_article_2']);
    const short = buildBody(renderDoc(doc(4)), { ads: true, afterParagraphs: [3, 8], minParagraphs: 5 });
    expect(short.some((c) => c.adAfter)).toBe(false);
    const noAds = buildBody(renderDoc(doc(10)), { ads: false, afterParagraphs: [3, 8], minParagraphs: 5 });
    expect(noAds.some((c) => c.adAfter)).toBe(false);
  });
  it('never counts paragraphs inside quotes or lists', () => {
    const d = { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
      { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'q1' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'q2' }] }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'c' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'd' }] },
    ] };
    const chunks = buildBody(renderDoc(d), { ads: true, afterParagraphs: [3], minParagraphs: 3 });
    expect(chunks[0]!.html).toMatch(/<p[^>]*>c<\/p>$/);
  });
  it('save-time sanitizer strips scripts, handlers and unknown iframes', () => {
    const html = sanitizeArticleHtml('<p>ok</p>\n<script>alert(1)</script>\n<iframe src="https://evil.example/x"></iframe>\n<p onclick="x()">y</p>\n<a href="javascript:alert(1)">z</a>');
    expect(html).not.toMatch(/script|evil|onclick|javascript/);
    expect(html).toContain('<p>y</p>');
  });
});

describe('paragraph direction', () => {
  it('marks a French quote inside an Arabic article as ltr, leaves Arabic paragraphs alone', () => {
    const html = renderDoc({ type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'PSG فاز في المباراة' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Nous avons bien joué ce soir' }] },
    ] }, { locale: 'ar' });
    expect(html).toContain('<p>PSG فاز في المباراة</p>');
    expect(html).toContain('<p dir="ltr">Nous avons bien joué ce soir</p>');
  });
});
