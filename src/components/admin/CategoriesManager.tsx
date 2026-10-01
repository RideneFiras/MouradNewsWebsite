'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteCategory, patchCategory, reorderCategories, saveCategory } from '@/lib/admin/taxonomy';
import { slugify } from '@/lib/slug';
import { Dialog } from './Dialog';
import { Sortable } from './Sortable';

export interface Cat {
  id: string; parent_id: string | null; slug: string; name_ar: string; name_fr: string | null; description_ar: string | null; description_fr: string | null;
  color: string; position: number; show_in_nav: boolean; is_active: boolean; seo_title_ar: string | null; seo_title_fr: string | null;
  seo_description_ar: string | null; seo_description_fr: string | null;
}

const PALETTE = ['#A3161C', '#17140F', '#2F6B3A', '#9A6B00', '#0B5CAD', '#6B3A5A'];

export function CategoriesManager({ initial, counts }: { initial: Cat[]; counts: Record<string, number> }) {
  const t = useTranslations('admin.categories');
  const tc = useTranslations('admin.common');
  const router = useRouter();
  const [cats, setCats] = useState(initial);
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);
  const [deleting, setDeleting] = useState<Cat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tops = cats.filter((c) => !c.parent_id).sort((a, b) => a.position - b.position);
  const kids = (id: string) => cats.filter((c) => c.parent_id === id).sort((a, b) => a.position - b.position);

  const reorder = async (list: Cat[]) => {
    setCats((all) => all.map((c) => { const i = list.findIndex((x) => x.id === c.id); return i >= 0 ? { ...c, position: i + 1 } : c; }));
    await reorderCategories(list.map((c) => c.id));
  };
  const toggle = async (c: Cat, field: 'show_in_nav' | 'is_active') => {
    setCats((all) => all.map((x) => (x.id === c.id ? { ...x, [field]: !c[field] } : x)));
    await patchCategory(c.id, { [field]: !c[field] });
  };
  const row = (c: Cat) => (
    <div className={`a-panel flex flex-wrap items-center gap-3 p-2 ${c.is_active ? '' : 'opacity-60'}`}>
      <span className="h-4 w-1.5" style={{ background: c.color }} aria-hidden="true" />
      <span className="min-w-[140px] flex-1">
        <strong>{c.name_ar}</strong> {c.name_fr && <span className="text-ink-3">· <bdi lang="fr">{c.name_fr}</bdi></span>}
        <span className="ms-2 text-[12px] text-ink-3"><bdi>/{c.slug}</bdi></span>
      </span>
      <span className="text-[13px] text-ink-3">{counts[c.id] ?? 0} {t('articles')}</span>
      {!c.parent_id && (
        <label className="flex items-center gap-1 text-[13px]"><input type="checkbox" checked={c.show_in_nav} onChange={() => toggle(c, 'show_in_nav')} />{t('inNav')}</label>
      )}
      <label className="flex items-center gap-1 text-[13px]"><input type="checkbox" checked={c.is_active} onChange={() => toggle(c, 'is_active')} />{t('active')}</label>
      <button type="button" className="a-btn a-btn-sm" onClick={() => { setError(null); setEditing(c); }}>{tc('edit')}</button>
      <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => { setError(null); setDeleting(c); }}>{tc('delete')}</button>
    </div>
  );

  return (
    <div>
      <button type="button" className="a-btn a-btn-primary mb-4" onClick={() => { setError(null); setEditing({ color: '#A3161C', show_in_nav: true, is_active: true, parent_id: null }); }}>{t('new')}</button>
      <Sortable items={tops} onReorder={reorder} className="space-y-2" render={(c) => (
        <div>
          {row(c)}
          {kids(c.id).length > 0 && (
            <Sortable items={kids(c.id)} onReorder={reorder} className="ms-8 mt-2 space-y-2" render={(k) => row(k)} />
          )}
        </div>
      )} />

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? tc('edit') : t('new')}>
        {editing && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const get = (k: string) => String(f.get(k) ?? '');
            const res = await saveCategory({
              id: editing.id, parent_id: get('parent_id') || null, name_ar: get('name_ar'), name_fr: get('name_fr'), slug: get('slug') || undefined,
              description_ar: get('description_ar'), description_fr: get('description_fr'), color: get('color') || '#A3161C',
              show_in_nav: f.get('show_in_nav') === 'on', is_active: f.get('is_active') === 'on',
              seo_title_ar: get('seo_title_ar'), seo_title_fr: get('seo_title_fr'), seo_description_ar: get('seo_description_ar'), seo_description_fr: get('seo_description_fr'),
            });
            if (!res.ok) return setError(res.error === 'not_allowed' ? tc('notAllowed') : /depth|23514/.test(res.error) ? t('maxDepth') : tc('error'));
            setEditing(null);
            router.refresh();
            setCats((all) => (editing.id ? all.map((c) => (c.id === editing.id ? (res.data as Cat) : c)) : [...all, res.data as Cat]));
          }}>
            <div><label className="a-label" htmlFor="c-name_ar">{tc('nameAr')}</label><input id="c-name_ar" name="name_ar" required defaultValue={editing.name_ar ?? ''} className="a-input" /></div>
            <div><label className="a-label" htmlFor="c-name_fr">{tc('nameFr')}</label><input id="c-name_fr" name="name_fr" lang="fr" dir="ltr" defaultValue={editing.name_fr ?? ''} className="a-input"
              onBlur={(e) => { const s = (e.currentTarget.form?.elements.namedItem('slug') as HTMLInputElement | null); if (s && !s.value) s.value = slugify(e.currentTarget.value); }} /></div>
            <div>
              <label className="a-label" htmlFor="c-slug">{tc('slug')}</label>
              <input id="c-slug" name="slug" dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={editing.slug ?? ''} className="a-input" />
              <p className="a-help">{tc('slugHelp')} {editing.id && tc('slugChanged')}</p>
            </div>
            <div>
              <label className="a-label" htmlFor="c-parent">{t('parent')}</label>
              <select id="c-parent" name="parent_id" defaultValue={editing.parent_id ?? ''} className="a-select">
                <option value="">{t('noParent')}</option>
                {tops.filter((c) => c.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div><label className="a-label" htmlFor="c-desc_ar">{tc('descriptionAr')}</label><textarea id="c-desc_ar" name="description_ar" defaultValue={editing.description_ar ?? ''} className="a-textarea" /></div>
            <div><label className="a-label" htmlFor="c-desc_fr">{tc('descriptionFr')}</label><textarea id="c-desc_fr" name="description_fr" lang="fr" dir="ltr" defaultValue={editing.description_fr ?? ''} className="a-textarea" /></div>
            <ColorField label={t('color')} help={t('colorHelp')} initial={editing.color ?? '#A3161C'} />
            <label className="flex items-center gap-2"><input type="checkbox" name="show_in_nav" defaultChecked={editing.show_in_nav ?? true} />{t('inNav')}</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={editing.is_active ?? true} />{t('active')}</label>
            <details><summary className="a-label cursor-pointer">{t('seoTitle')}</summary>
              <div className="mt-2 space-y-2">
                <input name="seo_title_ar" aria-label={`${t('seoTitle')} AR`} defaultValue={editing.seo_title_ar ?? ''} className="a-input" />
                <input name="seo_title_fr" aria-label={`${t('seoTitle')} FR`} lang="fr" dir="ltr" defaultValue={editing.seo_title_fr ?? ''} className="a-input" />
                <textarea name="seo_description_ar" aria-label={`${t('seoDescription')} AR`} defaultValue={editing.seo_description_ar ?? ''} className="a-textarea" />
                <textarea name="seo_description_fr" aria-label={`${t('seoDescription')} FR`} lang="fr" dir="ltr" defaultValue={editing.seo_description_fr ?? ''} className="a-textarea" />
              </div>
            </details>
            {error && <p role="alert" className="a-error">{error}</p>}
            <button type="submit" className="a-btn a-btn-primary">{tc('save')}</button>
          </form>
        )}
      </Dialog>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)} title={t('deleteTitle')}>
        {deleting && (() => {
          const n = counts[deleting.id] ?? 0;
          const hasKids = kids(deleting.id).length > 0;
          return (
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const mode = String(f.get('mode'));
              const res = mode === 'deactivate'
                ? await patchCategory(deleting.id, { is_active: false })
                : await deleteCategory(deleting.id, n > 0 ? String(f.get('target') || '') || null : null);
              if (!res.ok) return setError(tc('error'));
              setDeleting(null);
              router.refresh();
              setCats((all) => (mode === 'deactivate' ? all.map((c) => (c.id === deleting.id ? { ...c, is_active: false } : c)) : all.filter((c) => c.id !== deleting.id)));
            }}>
              {hasKids ? <p className="a-notice" data-tone="warn">{t('hasChildren')}</p> : n > 0 && (
                <div>
                  <label className="a-label" htmlFor="target">{t('hasArticles', { count: n })}</label>
                  <select id="target" name="target" className="a-select" required>
                    <option value="">—</option>
                    {cats.filter((c) => c.id !== deleting.id).map((c) => <option key={c.id} value={c.id}>{c.parent_id ? '— ' : ''}{c.name_ar}</option>)}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2"><input type="radio" name="mode" value="deactivate" defaultChecked />{t('deactivateInstead')}</label>
              {!hasKids && <label className="flex items-center gap-2"><input type="radio" name="mode" value="delete" />{n > 0 ? t('moveAndDelete') : t('deleteEmpty')}</label>}
              {error && <p role="alert" className="a-error">{error}</p>}
              <button type="submit" className="a-btn a-btn-primary">{tc('confirm')}</button>
            </form>
          );
        })()}
      </Dialog>
    </div>
  );
}

function ColorField({ label, help, initial }: { label: string; help: string; initial: string }) {
  const [value, setValue] = useState(initial.toUpperCase());
  return (
    <fieldset>
      <legend className="a-label">{label}</legend>
      <input type="hidden" name="color" value={/^#[0-9A-F]{6}$/.test(value) ? value : '#A3161C'} />
      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((p) => (
          <button key={p} type="button" aria-pressed={value === p} aria-label={p} onClick={() => setValue(p)}
            className={`h-7 w-7 rounded border-2 ${value === p ? 'border-focus' : 'border-transparent'}`} style={{ background: p }} />
        ))}
        <input type="text" value={value} onChange={(e) => setValue(e.target.value.toUpperCase())} dir="ltr" className="a-input w-28" aria-label="#RRGGBB" />
      </div>
      <p className="a-help">{help}</p>
    </fieldset>
  );
}
