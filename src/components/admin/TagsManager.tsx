'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { deleteTag, mergeTags, saveTag } from '@/lib/admin/taxonomy';
import type { AdminMedia } from '@/lib/admin/media';
import { Dialog } from './Dialog';
import { MediaPicker } from './MediaPicker';

export interface TagRow { id: string; kind: string; slug: string; name_ar: string; name_fr: string | null; description_ar: string | null; description_fr: string | null; image_media_id: string | null; is_featured: boolean; count: number }
const KINDS = ['topic', 'place', 'person', 'club', 'competition', 'event'];

export function TagsManager({ initial }: { initial: TagRow[] }) {
  const t = useTranslations('admin.tags');
  const tc = useTranslations('admin.common');
  const [tags, setTags] = useState(initial);
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<TagRow> | null>(null);
  const [merging, setMerging] = useState<TagRow | null>(null);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = useMemo(() => tags.filter((x) => (!kind || x.kind === kind) && (!q || x.name_ar.includes(q) || (x.name_fr ?? '').toLowerCase().includes(q.toLowerCase()) || x.slug.includes(q))), [tags, kind, q]);
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="a-btn a-btn-primary" onClick={() => { setError(null); setEditing({ kind: 'topic', is_featured: false }); }}>{t('new')}</button>
        <select className="a-select w-auto" value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t('kind')}>
          <option value="">{tc('all')}</option>
          {KINDS.map((k) => <option key={k} value={k}>{t(`kind_${k}` as 'kind_topic')}</option>)}
        </select>
        <input className="a-input max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tc('search')} aria-label={tc('search')} />
      </div>
      <div className="a-panel overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>{tc('nameAr')}</th><th>{tc('nameFr')}</th><th>{t('kind')}</th><th>{tc('slug')}</th><th>#</th><th>{t('featured')}</th><th>{tc('actions')}</th></tr></thead>
          <tbody>
            {shown.map((x) => (
              <tr key={x.id}>
                <td className="font-semibold">{x.name_ar}</td>
                <td lang="fr">{x.name_fr}</td>
                <td>{t(`kind_${x.kind}` as 'kind_topic')}</td>
                <td dir="ltr">{x.slug}</td>
                <td className="tabular-nums">{x.count}</td>
                <td><input type="checkbox" aria-label={t('featured')} checked={x.is_featured} onChange={async () => {
                  const r = await saveTag({ ...x, kind: x.kind as 'topic', is_featured: !x.is_featured });
                  if (r.ok) setTags((all) => all.map((y) => (y.id === x.id ? { ...y, is_featured: !x.is_featured } : y)));
                }} /></td>
                <td className="whitespace-nowrap">
                  <div className="flex gap-1">
                    <button type="button" className="a-btn a-btn-sm" onClick={() => { setError(null); setEditing(x); }}>{tc('edit')}</button>
                    <button type="button" className="a-btn a-btn-sm" onClick={() => { setError(null); setMerging(x); }}>{t('merge')}</button>
                    <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={async () => { if (confirm(`${tc('delete')}: ${x.name_ar}?`)) { const r = await deleteTag(x.id); if (r.ok) setTags((all) => all.filter((y) => y.id !== x.id)); } }}>{tc('delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? tc('edit') : t('new')}>
        {editing && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const get = (k: string) => String(f.get(k) ?? '');
            const r = await saveTag({ id: editing.id, kind: get('kind') as 'topic', name_ar: get('name_ar'), name_fr: get('name_fr'), slug: get('slug') || undefined,
              description_ar: get('description_ar'), description_fr: get('description_fr'), image_media_id: editing.image_media_id ?? null, is_featured: f.get('is_featured') === 'on' });
            if (!r.ok) return setError(tc('error'));
            const row = { ...(r.data as TagRow), count: editing.count ?? 0 };
            setTags((all) => (editing.id ? all.map((y) => (y.id === editing.id ? row : y)) : [row, ...all]));
            setEditing(null);
          }}>
            <div><label className="a-label" htmlFor="t-kind">{t('kind')}</label>
              <select id="t-kind" name="kind" defaultValue={editing.kind} className="a-select">{KINDS.map((k) => <option key={k} value={k}>{t(`kind_${k}` as 'kind_topic')}</option>)}</select></div>
            <div><label className="a-label" htmlFor="t-ar">{tc('nameAr')}</label><input id="t-ar" name="name_ar" required defaultValue={editing.name_ar ?? ''} className="a-input" /></div>
            <div><label className="a-label" htmlFor="t-fr">{tc('nameFr')}</label><input id="t-fr" name="name_fr" lang="fr" dir="ltr" defaultValue={editing.name_fr ?? ''} className="a-input" /></div>
            <div><label className="a-label" htmlFor="t-slug">{tc('slug')}</label><input id="t-slug" name="slug" dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={editing.slug ?? ''} className="a-input" /><p className="a-help">{tc('slugHelp')} {editing.id && tc('slugChanged')}</p></div>
            <div><label className="a-label" htmlFor="t-dar">{tc('descriptionAr')}</label><textarea id="t-dar" name="description_ar" defaultValue={editing.description_ar ?? ''} className="a-textarea" /></div>
            <div><label className="a-label" htmlFor="t-dfr">{tc('descriptionFr')}</label><textarea id="t-dfr" name="description_fr" lang="fr" dir="ltr" defaultValue={editing.description_fr ?? ''} className="a-textarea" /></div>
            <div className="flex items-center gap-2">
              <button type="button" className="a-btn a-btn-sm" onClick={() => setPicker(true)}>{t('image')}</button>
              {editing.image_media_id && <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => setEditing({ ...editing, image_media_id: null })}>×</button>}
              {editing.image_media_id && <span className="text-[13px] text-ok">✓</span>}
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={editing.is_featured} />{t('featured')}</label>
            {error && <p role="alert" className="a-error">{error}</p>}
            <button type="submit" className="a-btn a-btn-primary">{tc('save')}</button>
          </form>
        )}
      </Dialog>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={(m: AdminMedia) => { setEditing((e) => (e ? { ...e, image_media_id: m.id } : e)); setPicker(false); }} />

      <Dialog open={!!merging} onClose={() => setMerging(null)} title={t('merge')}>
        {merging && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const into = String(new FormData(e.currentTarget).get('into') ?? '');
            const r = await mergeTags(merging.id, into);
            if (!r.ok) return setError(tc('error'));
            setTags((all) => all.filter((y) => y.id !== merging.id).map((y) => (y.id === into ? { ...y, count: y.count + merging.count } : y)));
            setMerging(null);
          }}>
            <p><strong>{merging.name_ar}</strong> → </p>
            <label className="a-label" htmlFor="into">{t('mergeInto')}</label>
            <select id="into" name="into" required className="a-select">
              <option value="">—</option>
              {tags.filter((y) => y.id !== merging.id).map((y) => <option key={y.id} value={y.id}>{y.name_ar}{y.name_fr ? ` · ${y.name_fr}` : ''}</option>)}
            </select>
            <p className="a-help">{t('mergeHelp')}</p>
            {error && <p role="alert" className="a-error">{error}</p>}
            <button type="submit" className="a-btn a-btn-primary">{t('merge')}</button>
          </form>
        )}
      </Dialog>
    </div>
  );
}
