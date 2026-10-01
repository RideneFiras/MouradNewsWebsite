// Tiptap/ProseMirror JSON → HTML, with an allowlist of node and mark types.
// Used server-side on every save (articles, pages) and by the demo seed generator.
// The output is sanitized again with sanitize-html before it is stored (sanitize.ts).
import { parseEmbed } from './embeds';

export interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export interface RenderOptions {
  /** Public URL builder for media paths stored in image nodes. */
  mediaUrl?: (path: string) => string | null;
  /** Locale of the content, used for figure labels. */
  locale?: 'ar' | 'fr';
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (v: unknown) => esc(String(v ?? ''));

function safeHref(href: unknown): string | null {
  if (typeof href !== 'string') return null;
  const h = href.trim();
  if (/^https?:\/\//i.test(h) || h.startsWith('/') || /^mailto:/i.test(h)) return h;
  return null;
}

function dirAttr(n: PMNode): string {
  const d = n.attrs?.dir;
  return d === 'rtl' || d === 'ltr' || d === 'auto' ? ` dir="${d}"` : '';
}

function renderText(n: PMNode): string {
  let out = esc(n.text ?? '');
  for (const m of n.marks ?? []) {
    switch (m.type) {
      case 'bold':
        out = `<strong>${out}</strong>`;
        break;
      case 'italic':
        out = `<em>${out}</em>`;
        break;
      case 'link': {
        const href = safeHref(m.attrs?.href);
        if (href) {
          const external = /^https?:\/\//i.test(href);
          out = `<a href="${attr(href)}"${external ? ' rel="noopener" target="_blank"' : ''}>${out}</a>`;
        }
        break;
      }
      default:
        break; // unknown marks are dropped
    }
  }
  return out;
}

function inline(nodes: PMNode[] | undefined): string {
  return (nodes ?? [])
    .map((n) => (n.type === 'text' ? renderText(n) : n.type === 'hardBreak' ? '<br>' : ''))
    .join('');
}

function srcset(variants: unknown, mediaUrl: (p: string) => string | null): string {
  if (!variants || typeof variants !== 'object') return '';
  return Object.entries(variants as Record<string, string>)
    .map(([w, p]) => {
      const u = mediaUrl(p);
      return u && /^\d+$/.test(w) ? `${u} ${w}w` : null;
    })
    .filter(Boolean)
    .join(', ');
}

function figure(a: Record<string, unknown>, opts: Required<RenderOptions>): string {
  const src = typeof a.src === 'string' ? opts.mediaUrl(a.src) : null;
  if (!src) return '';
  const set = srcset(a.variants, opts.mediaUrl);
  const w = Number(a.width) || undefined;
  const h = Number(a.height) || undefined;
  const caption = [a.caption, a.credit].filter((x) => typeof x === 'string' && x.trim()).map((x) => esc(String(x)));
  const img = `<img src="${attr(src)}"${set ? ` srcset="${attr(set)}" sizes="(min-width: 1024px) 680px, 100vw"` : ''} alt="${attr(a.alt)}"${w && h ? ` width="${w}" height="${h}"` : ''} loading="lazy" decoding="async">`;
  return `<figure>${img}${caption.length ? `<figcaption>${caption.join(' · ')}</figcaption>` : ''}</figure>`;
}

function embed(a: Record<string, unknown>): string {
  const parsed = typeof a.url === 'string' ? parseEmbed(a.url) : null;
  if (!parsed) return '';
  const caption = typeof a.caption === 'string' && a.caption.trim() ? `<figcaption>${esc(a.caption)}</figcaption>` : '';
  if (parsed.provider === 'youtube' && parsed.id) {
    return `<figure class="embed embed-youtube"><iframe src="https://www.youtube-nocookie.com/embed/${attr(parsed.id)}" title="YouTube" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>${caption}</figure>`;
  }
  if (parsed.provider === 'facebook') {
    const isVideo = /\/videos?\/|fb\.watch|\/reel\//.test(parsed.url);
    const plugin = isVideo ? 'video.php' : 'post.php';
    return `<figure class="embed embed-facebook"><iframe src="https://www.facebook.com/plugins/${plugin}?href=${encodeURIComponent(parsed.url)}&amp;show_text=true" title="Facebook" loading="lazy" style="aspect-ratio:auto;min-height:420px"></iframe><p><a href="${attr(parsed.url)}" rel="noopener" target="_blank">facebook.com</a></p>${caption}</figure>`;
  }
  const label = parsed.provider === 'x' ? 'X' : 'Instagram';
  return `<figure class="embed embed-link"><p><a href="${attr(parsed.url)}" rel="noopener" target="_blank">${label}: ${esc(parsed.url.replace(/^https:\/\/(www\.)?/, ''))}</a></p>${caption}</figure>`;
}

function block(n: PMNode, opts: Required<RenderOptions>): string {
  const a = n.attrs ?? {};
  switch (n.type) {
    case 'paragraph': {
      const body = inline(n.content);
      return body.trim() ? `<p${dirAttr(n)}>${body}</p>` : '';
    }
    case 'heading': {
      const level = a.level === 3 ? 3 : 2;
      return `<h${level}${dirAttr(n)}>${inline(n.content)}</h${level}>`;
    }
    case 'blockquote':
      return `<blockquote${dirAttr(n)}>${(n.content ?? []).map((c) => block(c, opts)).join('')}</blockquote>`;
    case 'pullQuote':
      return `<blockquote class="pull-quote"${dirAttr(n)}><p>${inline(n.content)}</p></blockquote>`;
    case 'bulletList':
      return `<ul>${(n.content ?? []).map((c) => block(c, opts)).join('')}</ul>`;
    case 'orderedList':
      return `<ol>${(n.content ?? []).map((c) => block(c, opts)).join('')}</ol>`;
    case 'listItem':
      return `<li${dirAttr(n)}>${(n.content ?? []).map((c) => (c.type === 'paragraph' ? inline(c.content) : block(c, opts))).join('')}</li>`;
    case 'horizontalRule':
      return '<hr>';
    case 'image':
    case 'figure':
      return figure(a, opts);
    case 'gallery': {
      const imgs = Array.isArray(a.images) ? (a.images as Record<string, unknown>[]) : [];
      const inner = imgs.map((i) => figure(i, opts)).join('');
      return inner ? `<div class="gallery">${inner}</div>` : '';
    }
    case 'embed':
      return embed(a);
    case 'readAlso': {
      const href = safeHref(a.href);
      if (!href || typeof a.title !== 'string') return '';
      const label = opts.locale === 'fr' ? 'À lire aussi' : 'اقرأ أيضا';
      return `<p class="read-also"><span>${label}</span><a href="${attr(href)}">${esc(a.title)}</a></p>`;
    }
    case 'table': {
      const rows = (n.content ?? []).map((row) => {
        const cells = (row.content ?? []).map((cell) => {
          const tag = cell.type === 'tableHeader' ? 'th' : 'td';
          const inner = (cell.content ?? []).map((c) => (c.type === 'paragraph' ? inline(c.content) : '')).join('<br>');
          return `<${tag}>${inner}</${tag}>`;
        });
        return `<tr>${cells.join('')}</tr>`;
      });
      if (!rows.length) return '';
      const firstIsHeader = (n.content?.[0]?.content ?? []).every((c) => c.type === 'tableHeader');
      const head = firstIsHeader ? `<thead>${rows[0]}</thead>` : '';
      const body = `<tbody>${(firstIsHeader ? rows.slice(1) : rows).join('')}</tbody>`;
      return `<div class="table-wrap"><table>${head}${body}</table></div>`;
    }
    default:
      return '';
  }
}

/** Render a document. Top-level blocks are separated by "\n" (used to insert ads). */
export function renderDoc(doc: PMNode | null | undefined, options: RenderOptions = {}): string {
  const opts: Required<RenderOptions> = { mediaUrl: options.mediaUrl ?? ((p) => p), locale: options.locale ?? 'ar' };
  if (!doc || doc.type !== 'doc') return '';
  return (doc.content ?? []).map((n) => block(n, opts)).filter(Boolean).join('\n');
}

/** Plain text for search and reading time: one line per block. */
export function docToText(doc: PMNode | null | undefined): string {
  const lines: string[] = [];
  const walk = (n: PMNode, out: string[]) => {
    if (n.type === 'text') out.push(n.text ?? '');
    else if (n.type === 'hardBreak') out.push(' ');
    for (const c of n.content ?? []) walk(c, out);
  };
  for (const n of doc?.content ?? []) {
    const parts: string[] = [];
    walk(n, parts);
    const line = parts.join('').replace(/\s+/g, ' ').trim();
    if (line) lines.push(line);
  }
  return lines.join('\n');
}

/** First paragraph text (used for an automatic excerpt). */
export function firstParagraph(doc: PMNode | null | undefined, max = 220): string {
  const p = (doc?.content ?? []).find((n) => n.type === 'paragraph' && inline(n.content).trim());
  if (!p) return '';
  const t = docToText({ type: 'doc', content: [p] });
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).trim();
}
