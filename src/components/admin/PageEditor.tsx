'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { PMNode } from '@/lib/content/render';
import { deletePage, savePage } from '@/lib/admin/site';

const RichText = dynamic(() => import('./editor/RichText'), { ssr: false, loading: () => <div className="a-panel min-h-[360px]" /> });
const KINDS = ['standard', 'about', 'charter', 'contact', 'media_kit', 'privacy', 'legal'] as const;

export interface PageData { id: string | null; language: 'ar' | 'fr'; title: string; slug: string; body_json: PMNode | null; page_kind: (typeof KINDS)[number]; show_in_footer: boolean; status: 'draft' | 'published'; seo_title: string; seo_description: string; translation_group_id: string | null }

export function PageEditor({ initial, locale }: { initial: PageData; locale: string }) {
  const t = useTranslations('admin.pages');
  const tc = useTranslations('admin.common');
  const te = useTranslations('admin.editor');
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const set = <K extends keyof PageData>(k: K, v: PageData[K]) => setP((x) => ({ ...x, [k]: v }));
  const save = async (status = p.status) => {
    const res = await savePage({ ...p, status, slug: p.slug || undefined });
    if (!res.ok) return setMsg(tc('error'));
    setMsg(tc('saved'));
    setP((x) => ({ ...x, status, id: res.data!.id, slug: res.data!.slug }));
    if (!p.id) router.replace(`/${locale}/admin/pages/${res.data!.id}`);
  };
  return (
    <div className="grid gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4" dir={p.language === 'fr' ? 'ltr' : 'rtl'} lang={p.language}>
        <div><label className="a-label" htmlFor="p-title">{te('title')}</label><input id="p-title" className="a-input font-headline text-[24px] font-bold" value={p.title} onChange={(e) => set('title', e.target.value)} /></div>
        <RichText value={p.body_json} language={p.language} placeholder={te('bodyPlaceholder')} onChange={(d) => set('body_json', d)} />
      </div>
      <aside className="a-panel h-fit space-y-4 p-4">
        <div><label className="a-label" htmlFor="p-lang">{tc('language')}</label>
          <select id="p-lang" className="a-select" value={p.language} onChange={(e) => set('language', e.target.value as 'ar')}><option value="ar">{tc('arabic')}</option><option value="fr">{tc('french')}</option></select></div>
        <div><label className="a-label" htmlFor="p-slug">{tc('slug')}</label><input id="p-slug" className="a-input" dir="ltr" value={p.slug} onChange={(e) => set('slug', e.target.value)} /><p className="a-help">{tc('slugHelp')}</p></div>
        <div><label className="a-label" htmlFor="p-kind">{t('kind')}</label>
          <select id="p-kind" className="a-select" value={p.page_kind} onChange={(e) => set('page_kind', e.target.value as PageData['page_kind'])}>{KINDS.map((k) => <option key={k} value={k}>{t(`kind_${k}`)}</option>)}</select></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={p.show_in_footer} onChange={(e) => set('show_in_footer', e.target.checked)} />{t('showInFooter')}</label>
        <div><label className="a-label" htmlFor="p-seo">{te('seoTitle')}</label><input id="p-seo" className="a-input" value={p.seo_title} onChange={(e) => set('seo_title', e.target.value)} /></div>
        <div><label className="a-label" htmlFor="p-seod">{te('seoDescription')}</label><textarea id="p-seod" className="a-textarea" value={p.seo_description} onChange={(e) => set('seo_description', e.target.value)} /></div>
        <p className="text-[14px]">{tc('preview')}: <span className="a-chip" data-status={p.status}>{p.status === 'published' ? t('publish') : t('unpublish')}</span></p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="a-btn" onClick={() => save()}>{tc('save')}</button>
          {p.status === 'draft' ? <button type="button" className="a-btn a-btn-primary" onClick={() => save('published')}>{t('publish')}</button>
            : <button type="button" className="a-btn" onClick={() => save('draft')}>{t('unpublish')}</button>}
          {p.id && <button type="button" className="a-btn a-btn-danger" onClick={async () => { if (confirm(`${tc('delete')}?`)) { const r = await deletePage(p.id!); if (r.ok) router.push(`/${locale}/admin/pages`); } }}>{tc('delete')}</button>}
        </div>
        {msg && <p role="status" className="text-[13px] text-ink-3">{msg}</p>}
      </aside>
    </div>
  );
}
