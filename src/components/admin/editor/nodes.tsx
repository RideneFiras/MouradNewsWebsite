'use client';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { mediaUrl } from '@/lib/env';
import { parseEmbed } from '@/lib/content/embeds';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    elborj: {
      setPullQuote: () => ReturnType;
      insertFigure: (attrs: Record<string, unknown>) => ReturnType;
      insertGallery: (images: Record<string, unknown>[]) => ReturnType;
      insertEmbed: (url: string) => ReturnType;
      insertReadAlso: (attrs: { href: string; title: string; publicId: number }) => ReturnType;
    };
  }
}

/** Pull quote: Markazi 26px with an accent rule (rendered by render.ts as blockquote.pull-quote). */
export const PullQuote = Node.create({
  name: 'pullQuote',
  group: 'block',
  content: 'inline*',
  defining: true,
  parseHTML: () => [{ tag: 'blockquote.pull-quote' }],
  renderHTML: ({ HTMLAttributes }) => ['blockquote', mergeAttributes(HTMLAttributes, { class: 'pull-quote' }), 0],
  addCommands() {
    return { setPullQuote: () => ({ commands }) => commands.setNode(this.name) };
  },
});

function FigureView({ node, updateAttributes, selected }: NodeViewProps) {
  const a = node.attrs as Record<string, string>;
  const src = mediaUrl(a.variants && typeof a.variants === 'object' ? (a.variants as unknown as Record<string, string>)['960'] ?? a.src : a.src);
  return (
    <NodeViewWrapper as="figure" className={`my-4 rounded border ${selected ? 'border-focus' : 'border-rule'} p-2`} data-drag-handle>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt={a.alt ?? ''} className="block max-h-80 w-full object-contain" />}
      <div className="mt-2 grid gap-2 sm:grid-cols-3" contentEditable={false}>
        {(['caption', 'credit', 'alt'] as const).map((k) => (
          <input key={k} className="a-input" placeholder={k === 'caption' ? 'تعليق / Légende' : k === 'credit' ? 'المصدر / Crédit' : 'وصف للمكفوفين / Alt'}
            value={a[k] ?? ''} onChange={(e) => updateAttributes({ [k]: e.target.value })} aria-label={k} />
        ))}
      </div>
    </NodeViewWrapper>
  );
}

const figureAttrs = { src: { default: null }, variants: { default: null }, width: { default: null }, height: { default: null }, alt: { default: '' }, caption: { default: '' }, credit: { default: '' }, mediaId: { default: null } };

export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => figureAttrs,
  parseHTML: () => [{ tag: 'figure[data-type="figure"]' }],
  renderHTML: ({ HTMLAttributes }) => ['figure', { 'data-type': 'figure', 'data-src': HTMLAttributes.src }],
  addNodeView: () => ReactNodeViewRenderer(FigureView),
  addCommands() {
    return { insertFigure: (attrs) => ({ commands }) => commands.insertContent({ type: this.name, attrs }) };
  },
});

function GalleryView({ node, selected }: NodeViewProps) {
  const images = (node.attrs.images ?? []) as { src: string; variants?: Record<string, string> }[];
  return (
    <NodeViewWrapper className={`my-4 grid grid-cols-3 gap-2 rounded border ${selected ? 'border-focus' : 'border-rule'} p-2`} data-drag-handle>
      {images.map((i, n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={n} src={mediaUrl(i.variants?.['480'] ?? i.src) ?? ''} alt="" className="aspect-square w-full object-cover" />
      ))}
    </NodeViewWrapper>
  );
}

export const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => ({ images: { default: [] } }),
  parseHTML: () => [{ tag: 'div[data-type="gallery"]' }],
  renderHTML: () => ['div', { 'data-type': 'gallery' }],
  addNodeView: () => ReactNodeViewRenderer(GalleryView),
  addCommands() {
    return { insertGallery: (images) => ({ commands }) => commands.insertContent({ type: this.name, attrs: { images } }) };
  },
});

function EmbedView({ node, selected }: NodeViewProps) {
  const p = parseEmbed(String(node.attrs.url ?? ''));
  return (
    <NodeViewWrapper className={`my-4 rounded border ${selected ? 'border-focus' : 'border-rule'} bg-paper p-3 text-[14px]`} data-drag-handle>
      <strong>{p?.provider ?? 'embed'}</strong> · <span dir="ltr">{String(node.attrs.url)}</span>
    </NodeViewWrapper>
  );
}

export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => ({ url: { default: '' }, caption: { default: '' } }),
  parseHTML: () => [{ tag: 'div[data-type="embed"]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', { 'data-type': 'embed', 'data-url': HTMLAttributes.url }],
  addNodeView: () => ReactNodeViewRenderer(EmbedView),
  addCommands() {
    return { insertEmbed: (url) => ({ commands }) => commands.insertContent({ type: this.name, attrs: { url } }) };
  },
});

function ReadAlsoView({ node, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper className={`my-4 border-y ${selected ? 'border-focus' : 'border-rule'} py-2 text-[15px]`} data-drag-handle>
      <span className="font-semibold text-accent">اقرأ أيضا · À lire aussi </span>
      <span className="font-semibold">{String(node.attrs.title)}</span>
    </NodeViewWrapper>
  );
}

export const ReadAlso = Node.create({
  name: 'readAlso',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => ({ href: { default: '' }, title: { default: '' }, publicId: { default: null } }),
  parseHTML: () => [{ tag: 'p[data-type="read-also"]' }],
  renderHTML: () => ['p', { 'data-type': 'read-also' }],
  addNodeView: () => ReactNodeViewRenderer(ReadAlsoView),
  addCommands() {
    return { insertReadAlso: (attrs) => ({ commands }) => commands.insertContent({ type: this.name, attrs }) };
  },
});
