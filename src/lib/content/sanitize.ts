import sanitizeHtml from 'sanitize-html';

/** Allowlist for article/page HTML. Matches what render.ts produces; anything else is dropped. */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'h2', 'h3', 'strong', 'em', 'b', 'i', 'a', 'br', 'blockquote', 'ul', 'ol', 'li', 'hr', 'figure', 'figcaption', 'img', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'iframe'],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding'],
    iframe: ['src', 'title', 'loading', 'allow', 'allowfullscreen', 'referrerpolicy', 'style'],
    p: ['dir', 'class'],
    h2: ['dir'],
    h3: ['dir'],
    li: ['dir'],
    blockquote: ['dir', 'class'],
    figure: ['class'],
    div: ['class'],
    span: ['class'],
  },
  allowedClasses: {
    p: ['read-also'],
    blockquote: ['pull-quote'],
    figure: ['embed', 'embed-youtube', 'embed-facebook', 'embed-link'],
    div: ['gallery', 'table-wrap'],
    span: ['dateline'],
  },
  allowedSchemes: ['https', 'http', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  allowedIframeHostnames: ['www.youtube-nocookie.com', 'www.facebook.com'],
  allowedStyles: { iframe: { 'aspect-ratio': [/^auto$/], 'min-height': [/^\d+px$/] } },
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//i.test(attribs.href ?? '');
      return { tagName, attribs: { ...attribs, ...(external ? { rel: 'noopener', target: '_blank' } : {}) } };
    },
  },
};

export function sanitizeArticleHtml(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html, OPTIONS);
}
