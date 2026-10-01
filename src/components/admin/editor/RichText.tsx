'use client';
import { useEffect, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { useTranslations } from 'next-intl';
import { parseEmbed } from '@/lib/content/embeds';
import type { PMNode } from '@/lib/content/render';
import type { AdminMedia } from '@/lib/admin/media';
import { searchArticlesForLink } from '@/lib/admin/articles';
import { articleHref } from '@/lib/public/links';
import { MediaPicker } from '../MediaPicker';
import { Dialog } from '../Dialog';
import { SearchIcon } from '@/components/shared/icons';
import { Embed, Figure, Gallery, PullQuote, ReadAlso } from './nodes';

/** Word / Facebook paste: keep paragraphs, bold, italic, links; drop styles, classes and Office junk. */
function cleanPastedHTML(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(o|w|v|m):[^>]*>/gi, '')
    .replace(/<(style|script|meta|link|xml)[\s\S]*?<\/\1>/gi, '')
    .replace(/\s(style|class|lang|id|align|face|size|color|width|height)="[^"]*"/gi, '')
    .replace(/<\/?(span|font|div)(\s[^>]*)?>/gi, (m) => (m.startsWith('</div') ? '</p>' : m.startsWith('<div') ? '<p>' : ''))
    .replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, '');
}

function mediaToFigure(m: AdminMedia, lang: 'ar' | 'fr') {
  return {
    src: m.storage_path, variants: m.variants, width: m.width, height: m.height, mediaId: m.id,
    alt: (lang === 'fr' ? m.alt_fr || m.alt_ar : m.alt_ar || m.alt_fr) ?? '',
    caption: (lang === 'fr' ? m.caption_fr || m.caption_ar : m.caption_ar || m.caption_fr) ?? '',
    credit: m.credit ?? '',
  };
}

export default function RichText({ value, onChange, onBlur, language, placeholder, editable = true }: {
  value: PMNode | null; onChange: (doc: PMNode) => void; onBlur?: () => void; language: 'ar' | 'fr'; placeholder: string; editable?: boolean;
}) {
  const t = useTranslations('admin.editor');
  const [picker, setPicker] = useState<'image' | 'gallery' | null>(null);
  const [gallery, setGallery] = useState<AdminMedia[]>([]);
  const [readAlso, setReadAlso] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, strike: false, underline: false, link: { openOnClick: false, autolink: true, protocols: ['https', 'http', 'mailto'] } }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder }),
      PullQuote, Figure, Gallery, Embed, ReadAlso,
    ],
    content: value ?? { type: 'doc', content: [] },
    editorProps: {
      attributes: { class: 'prose-article admin-prose min-h-[320px] max-w-none outline-none', dir: language === 'fr' ? 'ltr' : 'rtl', lang: language, 'aria-label': t('body'), 'aria-multiline': 'true' },
      transformPastedHTML: cleanPastedHTML,
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as PMNode),
    onBlur: () => onBlur?.(),
  });

  useEffect(() => {
    if (!editor) return;
    editor.view.dom.setAttribute('dir', language === 'fr' ? 'ltr' : 'rtl');
    editor.view.dom.setAttribute('lang', language);
  }, [editor, language]);

  if (!editor) return <div className="a-panel min-h-[360px]" />;
  return (
    <div className="a-panel">
      {editable && <Toolbar editor={editor} t={t} onImage={() => setPicker('image')} onGallery={() => { setGallery([]); setPicker('gallery'); }} onReadAlso={() => setReadAlso(true)} />}
      <div className="px-4 py-3"><EditorContent editor={editor} /></div>
      <MediaPicker open={picker !== null} title={picker === 'gallery' ? `${t('tb_gallery')} (${gallery.length})` : t('tb_image')}
        onClose={() => {
          if (picker === 'gallery' && gallery.length) editor.chain().focus().insertGallery(gallery.map((m) => mediaToFigure(m, language))).run();
          setPicker(null);
        }}
        onPick={(m) => {
          if (picker === 'gallery') setGallery((g) => [...g, m]);
          else {
            editor.chain().focus().insertFigure(mediaToFigure(m, language)).run();
            setPicker(null);
          }
        }} />
      <ReadAlsoDialog open={readAlso} onClose={() => setReadAlso(false)} t={t}
        onPick={(a) => { editor.chain().focus().insertReadAlso({ href: articleHref(a), title: a.title, publicId: a.public_id }).run(); setReadAlso(false); }} />
    </div>
  );
}

type T = ReturnType<typeof useTranslations<'admin.editor'>>;

function Toolbar({ editor, t, onImage, onGallery, onReadAlso }: { editor: Editor; t: T; onImage: () => void; onGallery: () => void; onReadAlso: () => void }) {
  const btn = (label: string, action: () => void, active = false) => (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={action} aria-pressed={active}
      className={`a-btn a-btn-sm ${active ? 'a-btn-primary' : 'a-btn-ghost'}`}>{label}</button>
  );
  const c = () => editor.chain().focus();
  return (
    <div className="sticky top-12 z-10 flex flex-nowrap gap-1 overflow-x-auto border-b border-rule bg-white p-2 lg:top-0 lg:flex-wrap" role="toolbar" aria-label="toolbar">
      {btn(t('tb_paragraph'), () => c().setParagraph().run(), editor.isActive('paragraph'))}
      {btn(t('tb_h2'), () => c().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
      {btn(t('tb_h3'), () => c().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
      {btn(t('tb_bold'), () => c().toggleBold().run(), editor.isActive('bold'))}
      {btn(t('tb_italic'), () => c().toggleItalic().run(), editor.isActive('italic'))}
      {btn(t('tb_link'), () => {
        const prev = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt(t('linkPrompt'), prev ?? 'https://');
        if (url === null) return;
        if (!url || url === 'https://') c().unsetLink().run();
        else if (/^(https?:\/\/|mailto:|\/)/.test(url)) c().extendMarkRange('link').setLink({ href: url }).run();
      }, editor.isActive('link'))}
      {btn(t('tb_quote'), () => c().toggleBlockquote().run(), editor.isActive('blockquote'))}
      {btn(t('tb_pull'), () => c().setPullQuote().run(), editor.isActive('pullQuote'))}
      {btn(t('tb_ul'), () => c().toggleBulletList().run(), editor.isActive('bulletList'))}
      {btn(t('tb_ol'), () => c().toggleOrderedList().run(), editor.isActive('orderedList'))}
      {btn(t('tb_image'), onImage)}
      {btn(t('tb_gallery'), onGallery)}
      {btn(t('tb_embed'), () => {
        const url = window.prompt(t('embedPrompt'));
        if (!url) return;
        if (!parseEmbed(url)) return window.alert(t('embedInvalid'));
        c().insertEmbed(url).run();
      })}
      {btn(t('tb_table'), () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
      {editor.isActive('table') && (
        <>
          {btn(t('addRow'), () => c().addRowAfter().run())}
          {btn(t('addCol'), () => c().addColumnAfter().run())}
          {btn(t('deleteTable'), () => c().deleteTable().run())}
        </>
      )}
      {btn(t('tb_divider'), () => c().setHorizontalRule().run())}
      {btn(t('tb_readAlso'), onReadAlso)}
      {btn(t('tb_undo'), () => c().undo().run())}
      {btn(t('tb_redo'), () => c().redo().run())}
    </div>
  );
}

function ReadAlsoDialog({ open, onClose, onPick, t }: { open: boolean; onClose: () => void; t: T; onPick: (a: { public_id: number; title: string; language: 'ar' | 'fr'; slug: string | null }) => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<{ id: string; public_id: number; title: string; language: 'ar' | 'fr'; slug: string | null }[]>([]);
  return (
    <Dialog open={open} onClose={onClose} title={t('tb_readAlso')}>
      <form className="mb-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await searchArticlesForLink(q); if (r.ok) setItems(r.data!); }}>
        <input className="a-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('readAlsoSearch')} aria-label={t('readAlsoSearch')} autoFocus />
        <button className="a-btn" type="submit" aria-label={t('readAlsoSearch')}><SearchIcon size={18} /></button>
      </form>
      <ul className="divide-y divide-rule">
        {items.map((a) => (
          <li key={a.id}><button type="button" className="w-full py-2 text-start hover:text-accent" onClick={() => onPick(a)} lang={a.language}>{a.title}</button></li>
        ))}
      </ul>
    </Dialog>
  );
}
