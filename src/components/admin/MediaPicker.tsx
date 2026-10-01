'use client';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { mediaUrl } from '@/lib/env';
import { listMedia, type AdminMedia } from '@/lib/admin/media';
import { Dialog } from './Dialog';
import { useUpload } from './useUpload';

export function Thumb({ m, size = 120 }: { m: Pick<AdminMedia, 'storage_path' | 'variants' | 'alt_ar' | 'focal_x' | 'focal_y'>; size?: number }) {
  const src = mediaUrl(m.variants?.['480'] ?? m.variants?.['500'] ?? m.storage_path) ?? '';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={m.alt_ar ?? ''} loading="lazy" className="block aspect-square w-full rounded object-cover"
      style={{ maxWidth: size, objectPosition: `${Number(m.focal_x) * 100}% ${Number(m.focal_y) * 100}%` }} />
  );
}

/** Pick an image from the library or upload a new one (camera on phones). */
export function MediaPicker({ open, onClose, onPick, title }: { open: boolean; onClose: () => void; onPick: (m: AdminMedia) => void; title?: string }) {
  const t = useTranslations('admin.media');
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [q, setQ] = useState('');
  const { upload, progress, error } = useUpload();
  const load = useCallback(async (term: string) => {
    const res = await listMedia({ q: term, perPage: 48 });
    if (res.ok) setItems(res.data!.items);
  }, []);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    listMedia({ perPage: 48 }).then((res) => {
      if (alive && res.ok) setItems(res.data!.items);
    });
    return () => {
      alive = false;
    };
  }, [open]);
  return (
    <Dialog open={open} onClose={onClose} title={title ?? t('title')} wide>
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="a-btn a-btn-primary cursor-pointer">
          {t('upload')}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={async (e) => {
            if (!e.target.files?.length) return;
            const done = await upload(e.target.files);
            if (done.length === 1) onPick(done[0]!);
            else await load(q);
          }} />
        </label>
        <label className="a-btn cursor-pointer md:hidden">
          {t('camera')}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={async (e) => {
            if (!e.target.files?.length) return;
            const done = await upload(e.target.files);
            if (done[0]) onPick(done[0]);
          }} />
        </label>
        <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void load(q); }}>
          <input className="a-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchPlaceholder')} />
        </form>
      </div>
      {progress && <p role="status" className="a-notice mb-3">{t('uploading', progress)}</p>}
      {error && <p role="alert" className="a-error mb-3">{error === 'tooBig' || error === 'notImage' ? t(error) : error}</p>}
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {items.map((m) => (
          <li key={m.id}>
            <button type="button" className="block w-full rounded border border-rule hover:border-accent focus-visible:border-focus" onClick={() => onPick(m)} aria-label={m.alt_ar || m.caption_ar || t('select')}>
              <Thumb m={m} size={200} />
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
