'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { deleteMedia, listMedia, mediaUsage, updateMedia, type AdminMedia } from '@/lib/admin/media';
import { Dialog } from './Dialog';
import { FocalPicker } from './FocalPicker';
import { Thumb } from './MediaPicker';
import { useUpload } from './useUpload';

export function MediaLibrary({ initial, total, uploaders }: { initial: AdminMedia[]; total: number; uploaders: { id: string; name: string }[] }) {
  const t = useTranslations('admin.media');
  const tc = useTranslations('admin.common');
  const te = useTranslations('admin.editor');
  const [items, setItems] = useState(initial);
  const [count, setCount] = useState(total);
  const [q, setQ] = useState('');
  const [uploader, setUploader] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminMedia | null>(null);
  const [usage, setUsage] = useState<{ kind: string; label: string }[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { upload, progress, error } = useUpload();
  const names = new Map(uploaders.map((u) => [u.id, u.name]));

  async function reload(p = page, term = q, up = uploader) {
    const res = await listMedia({ q: term, uploader: up || undefined, page: p });
    if (res.ok) {
      setItems(res.data!.items);
      setCount(res.data!.total);
      setPage(p);
    }
  }
  async function openEdit(m: AdminMedia) {
    setEditing(m);
    setUsage(null);
    setMsg(null);
    const u = await mediaUsage(m.id);
    if (u.ok) setUsage(u.data!);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="a-btn a-btn-primary cursor-pointer">
          {t('upload')}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={async (e) => { if (e.target.files?.length) { await upload(e.target.files); await reload(1); } }} />
        </label>
        <label className="a-btn cursor-pointer md:hidden">
          {t('camera')}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={async (e) => { if (e.target.files?.length) { await upload(e.target.files); await reload(1); } }} />
        </label>
        <form className="flex min-w-[200px] flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void reload(1); }}>
          <input className="a-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchPlaceholder')} />
          <select className="a-select max-w-[200px]" value={uploader} aria-label={t('allUploaders')} onChange={(e) => { setUploader(e.target.value); void reload(1, q, e.target.value); }}>
            <option value="">{t('allUploaders')}</option>
            {uploaders.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="a-btn" type="submit">{tc('search')}</button>
        </form>
      </div>
      {progress && <p role="status" className="a-notice mb-3">{t('uploading', progress)}</p>}
      {error && <p role="alert" className="a-error mb-3">{error === 'tooBig' || error === 'notImage' ? t(error) : error}</p>}
      {items.length === 0 ? <p className="text-ink-3">{tc('empty')}</p> : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => openEdit(m)} className="block w-full rounded border border-rule bg-white p-1 hover:border-accent" aria-label={`${t('edit')}: ${m.alt_ar || m.caption_ar || m.id.slice(0, 8)}`}>
                <Thumb m={m} size={240} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {count > items.length && (
        <div className="mt-4 flex gap-2">
          <button className="a-btn a-btn-sm" disabled={page <= 1} onClick={() => reload(page - 1)}>{tc('previous')}</button>
          <span className="text-[14px] text-ink-3">{tc('page', { n: page })}</span>
          <button className="a-btn a-btn-sm" disabled={page * 48 >= count} onClick={() => reload(page + 1)}>{tc('next')}</button>
        </div>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={t('edit')} wide>
        {editing && (
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const res = await updateMedia(editing.id, {
                alt_ar: String(f.get('alt_ar') ?? ''), alt_fr: String(f.get('alt_fr') ?? ''), caption_ar: String(f.get('caption_ar') ?? ''),
                caption_fr: String(f.get('caption_fr') ?? ''), credit: String(f.get('credit') ?? ''), focal_x: editing.focal_x, focal_y: editing.focal_y,
              });
              if (res.ok) {
                setItems((xs) => xs.map((x) => (x.id === editing.id ? res.data! : x)));
                setEditing(null);
              } else setMsg(tc('error'));
            }}
          >
            <div>
              <FocalPicker path={editing.storage_path} variants={editing.variants} x={Number(editing.focal_x)} y={Number(editing.focal_y)} label={te('focal')}
                onChange={(x, y) => setEditing({ ...editing, focal_x: x, focal_y: y })} />
              <p className="a-help">{editing.width && editing.height ? t('dimensions', { w: editing.width, h: editing.height }) : ''} · {editing.uploaded_by ? t('uploadedBy', { name: names.get(editing.uploaded_by) ?? '—' }) : ''}</p>
              <p className="mt-3 text-[14px] font-semibold">{t('usedIn')}</p>
              {usage === null ? <p className="a-help">{tc('loading')}</p> : usage.length === 0 ? <p className="a-help">{t('notUsed')}</p> : (
                <ul className="a-help list-disc ps-5">{usage.map((u, i) => <li key={i}>{u.label}</li>)}</ul>
              )}
            </div>
            <div className="space-y-3">
              {(['alt_ar', 'alt_fr', 'caption_ar', 'caption_fr', 'credit'] as const).map((k) => (
                <div key={k}>
                  <label className="a-label" htmlFor={`m-${k}`}>{t(k === 'alt_ar' ? 'altAr' : k === 'alt_fr' ? 'altFr' : k === 'caption_ar' ? 'captionAr' : k === 'caption_fr' ? 'captionFr' : 'credit')}</label>
                  <input id={`m-${k}`} name={k} defaultValue={editing[k] ?? ''} className="a-input" dir={k.endsWith('_fr') || k === 'credit' ? 'auto' : undefined} />
                </div>
              ))}
              {msg && <p role="alert" className="a-error">{msg}</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" className="a-btn a-btn-primary">{tc('save')}</button>
                <button type="button" className="a-btn a-btn-danger" disabled={usage === null}
                  onClick={async () => {
                    if (usage && usage.length) return setMsg(t('cannotDelete') + ' ' + usage.map((u) => u.label).join('، '));
                    if (!confirm(tc('delete') + '?')) return;
                    const res = await deleteMedia(editing.id);
                    if (res.ok) {
                      setItems((xs) => xs.filter((x) => x.id !== editing.id));
                      setEditing(null);
                    } else setMsg(res.error === 'in_use' ? t('cannotDelete') : tc('error'));
                  }}>{tc('delete')}</button>
              </div>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
