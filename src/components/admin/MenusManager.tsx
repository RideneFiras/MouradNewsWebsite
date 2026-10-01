'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { deleteMenuItem, saveMenuItem } from '@/lib/admin/site';
import { reorderRows } from '@/lib/admin/taxonomy';
import { Dialog } from './Dialog';
import { Sortable } from './Sortable';

export interface MenuRow { id: string; menu: 'footer' | 'utility' | 'header_extra'; label_ar: string; label_fr: string | null; target_type: 'url' | 'category' | 'page' | 'tag'; url: string | null; category_id: string | null; page_id: string | null; tag_id: string | null; position: number; is_active: boolean; open_in_new_tab: boolean }
type Opt = { id: string; name: string };

export function MenusManager({ initial, categories, pages, tags }: { initial: MenuRow[]; categories: Opt[]; pages: Opt[]; tags: Opt[] }) {
  const t = useTranslations('admin.menus');
  const tc = useTranslations('admin.common');
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<MenuRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const target = (r: MenuRow) => r.target_type === 'url' ? r.url : (r.target_type === 'category' ? categories : r.target_type === 'page' ? pages : tags).find((x) => x.id === (r.category_id ?? r.page_id ?? r.tag_id))?.name;
  return (
    <div className="space-y-8">
      {(['footer', 'utility', 'header_extra'] as const).map((menu) => {
        const list = rows.filter((r) => r.menu === menu).sort((a, b) => a.position - b.position);
        return (
          <section key={menu}>
            <div className="mb-2 flex items-center gap-2"><h2 className="a-h2">{t(menu)}</h2>
              <button type="button" className="a-btn a-btn-sm" onClick={() => { setError(null); setEditing({ menu, target_type: 'url', is_active: true, open_in_new_tab: false }); }}>{t('addLink')}</button></div>
            {list.length === 0 ? <p className="text-[14px] text-ink-3">{tc('empty')}</p> : (
              <Sortable items={list} className="space-y-2" onReorder={async (next) => {
                setRows((all) => all.map((r) => { const i = next.findIndex((x) => x.id === r.id); return i >= 0 ? { ...r, position: i + 1 } : r; }));
                await reorderRows('menu_items', next.map((x) => x.id));
              }} render={(r) => (
                <div className={`a-panel flex flex-wrap items-center gap-3 p-2 ${r.is_active ? '' : 'opacity-60'}`}>
                  <span className="flex-1"><strong>{r.label_ar}</strong> <span className="text-ink-3">· <bdi lang="fr">{r.label_fr}</bdi></span> <span className="text-[12px] text-ink-3" dir="auto">→ {t(`target_${r.target_type}` as 'target_url')}: {target(r)}</span></span>
                  <button type="button" className="a-btn a-btn-sm" onClick={() => setEditing(r)}>{tc('edit')}</button>
                  <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={async () => { const x = await deleteMenuItem(r.id); if (x.ok) setRows((all) => all.filter((y) => y.id !== r.id)); }}>{tc('delete')}</button>
                </div>
              )} />
            )}
          </section>
        );
      })}
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? tc('edit') : t('addLink')}>
        {editing && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const g = (k: string) => String(f.get(k) ?? '');
            const tt = g('target_type') as MenuRow['target_type'];
            const res = await saveMenuItem({ id: editing.id, menu: editing.menu!, label_ar: g('label_ar'), label_fr: g('label_fr'), target_type: tt,
              url: tt === 'url' ? g('url') : null, category_id: tt === 'category' ? g('category_id') : null, page_id: tt === 'page' ? g('page_id') : null,
              tag_id: tt === 'tag' ? g('tag_id') : null, is_active: f.get('is_active') === 'on', open_in_new_tab: f.get('open_in_new_tab') === 'on' });
            if (!res.ok) return setError(tc('error'));
            setRows((all) => (editing.id ? all.map((x) => (x.id === editing.id ? (res.data as MenuRow) : x)) : [...all, res.data as MenuRow]));
            setEditing(null);
          }}>
            <div><label className="a-label" htmlFor="m-ar">{t('label')} — {tc('arabic')}</label><input id="m-ar" name="label_ar" required defaultValue={editing.label_ar ?? ''} className="a-input" /></div>
            <div><label className="a-label" htmlFor="m-fr">{t('label')} — {tc('french')}</label><input id="m-fr" name="label_fr" lang="fr" dir="ltr" defaultValue={editing.label_fr ?? ''} className="a-input" /></div>
            <TargetFields editing={editing} categories={categories} pages={pages} tags={tags} />
            <label className="flex items-center gap-2"><input type="checkbox" name="open_in_new_tab" defaultChecked={editing.open_in_new_tab} />{t('newTab')}</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={editing.is_active} />{tc('active')}</label>
            {error && <p role="alert" className="a-error">{error}</p>}
            <button type="submit" className="a-btn a-btn-primary">{tc('save')}</button>
          </form>
        )}
      </Dialog>
    </div>
  );
}

function TargetFields({ editing, categories, pages, tags }: { editing: Partial<MenuRow>; categories: Opt[]; pages: Opt[]; tags: Opt[] }) {
  const t = useTranslations('admin.menus');
  const [type, setType] = useState(editing.target_type ?? 'url');
  const pick = (name: string, opts: Opt[], value: string | null | undefined) => (
    <select name={name} defaultValue={value ?? ''} className="a-select" aria-label={t('target')} required>{opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
  );
  return (
    <div className="space-y-2">
      <label className="a-label" htmlFor="m-type">{t('target')}</label>
      <select id="m-type" name="target_type" value={type} onChange={(e) => setType(e.target.value as MenuRow['target_type'])} className="a-select">
        {(['url', 'category', 'page', 'tag'] as const).map((x) => <option key={x} value={x}>{t(`target_${x}`)}</option>)}
      </select>
      {type === 'url' && (<><input name="url" dir="ltr" required defaultValue={editing.url ?? ''} className="a-input" aria-label={t('url')} /><p className="a-help">{t('urlHelp')}</p></>)}
      {type === 'category' && pick('category_id', categories, editing.category_id)}
      {type === 'page' && pick('page_id', pages, editing.page_id)}
      {type === 'tag' && pick('tag_id', tags, editing.tag_id)}
    </div>
  );
}
