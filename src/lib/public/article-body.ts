import { sanitizeArticleHtml } from '@/lib/content/sanitize';

export interface BodyChunk {
  html: string;
  adAfter?: 'in_article_1' | 'in_article_2';
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Splits stored body HTML into top-level blocks (render.ts joins them with "\n"),
 * prints the dateline at the start of the first paragraph, and marks where the
 * in-article ad slots go: after paragraph N (top-level <p> only — never inside quotes,
 * lists, tables or embeds), only if the article is long enough.
 */
export function buildBody(html: string | null, opts: { location?: string | null; ads: boolean; afterParagraphs: number[]; minParagraphs: number }): BodyChunk[] {
  const clean = sanitizeArticleHtml(html);
  const blocks = clean.split(/\n(?=<)/).filter((b) => b.trim());
  const isPara = (b: string) => /^<p[\s>]/.test(b) && !/^<p class="read-also"/.test(b);
  if (opts.location) {
    const i = blocks.findIndex(isPara);
    if (i >= 0) blocks[i] = blocks[i]!.replace(/^<p([^>]*)>/, `<p$1><span class="dateline">${esc(opts.location)} — </span>`);
  }
  const paraCount = blocks.filter(isPara).length;
  const adPositions = opts.ads && paraCount >= opts.minParagraphs ? opts.afterParagraphs.slice(0, 2) : [];
  const chunks: BodyChunk[] = [];
  let current: string[] = [];
  let paras = 0;
  for (const b of blocks) {
    current.push(b);
    if (isPara(b)) {
      paras++;
      const idx = adPositions.indexOf(paras);
      if (idx >= 0 && paras < paraCount) {
        chunks.push({ html: current.join('\n'), adAfter: idx === 0 ? 'in_article_1' : 'in_article_2' });
        current = [];
      }
    }
  }
  if (current.length) chunks.push({ html: current.join('\n') });
  return chunks;
}
