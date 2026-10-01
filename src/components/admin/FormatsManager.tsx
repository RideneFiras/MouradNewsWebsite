'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { deleteFormat, reorderRows, saveFormat } from '@/lib/admin/taxonomy';
import { Dialog } from './Dialog';
import { Sortable } from './Sortable';

export interface FormatRow { id: string; slug: string; name_ar: string; name_fr: string | null; position: number; is_active: boolean; show_as_kicker: boolean; is_opinion: boolean }

export function FormatsManager({ initial }: { initial: FormatRow[] }) {
  const t = useTranslations('admin.formats');
  const tc = useTranslations('admin.common');
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Partial<FormatRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const patch = async (r: FormatRow, p: Partial<FormatRow>) => {
    const res = await saveFormat({ ...r, ...p });
    if (res.ok) setRows((all) => all.map((x) => (x.id === r.id ? { ...x, ...p } : x)));
  };
  return (
    <div>
      <button type="button" className="a-btn a-btn-primary mb-4" onClick={() => { setError(null); setEditing({ is_active: true, show_as_kicker: true, is_opinion: false }); }}>{t('new')}</button>
      <Sortable items={rows} className="space-y-2" onReorder={async (next) => { setRows(next); await reorderRows('article_formats', next.map((x) => x.id)); }} render={(r) => (
        <div className={`a-panel flex flex-wrap items-center gap-3 p-2 ${r.is_active ? '' : 'opacity-60'}`}>
          <span className="flex-1"><strong>{r.name_ar}</strong> <span className="text-ink-3">· <bdi lang="fr">{r.name_fr}</bdi></span> <span className="text-[12px] text-ink-3"><bdi>/{r.slug}</bdi></span></span>
          <label className="flex items-center gap-1 text-[13px]"><input type="checkbox" checked={r.show_as_kicker} onChange={() => patch(r, { show_as_kicker: !r.show_as_kicker })} />{t('asKicker')}</label>
          <label className="flex items-center gap-1 text-[13px]"><input type="checkbox" checked={r.is_opinion} onChange={() => patch(r, { is_opinion: !r.is_opinion })} />{t('opinion')}</label>
          <label className="flex items-center gap-1 text-[13px]"><input type="checkbox" checked={r.is_active} onChange={() => patch(r, { is_active: !r.is_active })} />{tc('active')}</label>
          <button type="button" className="a-btn a-btn-sm" onClick={() => setEditing(r)}>{tc('edit')}</button>
          <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={async () => { if (confirm(`${tc('delete')}?`)) { const x = await deleteFormat(r.id); if (x.ok) setRows((all) => all.filter((y) => y.id !== r.id)); } }}>{tc('delete')}</button>
        </div>
      )} />
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? tc('edit') : t('new')}>
        {editing && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const res = await saveFormat({ id: editing.id, name_ar: String(f.get('name_ar')), name_fr: String(f.get('name_fr') ?? ''), slug: String(f.get('slug') ?? '') || undefined,
              is_active: f.get('is_active') === 'on', show_as_kicker: f.get('show_as_kicker') === 'on', is_opinion: f.get('is_opinion') === 'on' });
            if (!res.ok) return setError(tc('error'));
            setRows((all) => (editing.id ? all.map((x) => (x.id === editing.id ? (res.data as FormatRow) : x)) : [...all, res.data as FormatRow]));
            setEditing(null);
          }}>
            <div><label className="a-label" htmlFor="f-ar">{tc('nameAr')}</label><input id="f-ar" name="name_ar" required defaultValue={editing.name_ar ?? ''} className="a-input" /></div>
            <div><label className="a-label" htmlFor="f-fr">{tc('nameFr')}</label><input id="f-fr" name="name_fr" lang="fr" dir="ltr" defaultValue={editing.name_fr ?? ''} className="a-input" /></div>
            <div><label className="a-label" htmlFor="f-slug">{tc('slug')}</label><input id="f-slug" name="slug" dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={editing.slug ?? ''} className="a-input" /></div>
            <label className="flex items-center gap-2"><input type="checkbox" name="show_as_kicker" defaultChecked={editing.show_as_kicker} />{t('asKicker')}</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_opinion" defaultChecked={editing.is_opinion} />{t('opinion')}</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={editing.is_active} />{tc('active')}</label>
            {error && <p role="alert" className="a-error">{error}</p>}
            <button type="submit" className="a-btn a-btn-primary">{tc('save')}</button>
          </form>
        )}
      </Dialog>
    </div>
  );
}
