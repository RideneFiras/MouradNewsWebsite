'use client';
import { useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';
import { processImage } from '@/lib/admin/image-process';
import { createMedia, type AdminMedia } from '@/lib/admin/media';

const MAX_BYTES = 10 * 1024 * 1024;

/** Process + upload images to Storage ("media" bucket, YYYY/MM/<uuid>/…) and create media rows. */
export function useUpload() {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | File[]): Promise<AdminMedia[]> {
    const list = Array.from(files);
    setError(null);
    setProgress({ done: 0, total: list.length });
    const db = browserClient();
    const out: AdminMedia[] = [];
    for (const [i, file] of list.entries()) {
      try {
        if (!file.type.startsWith('image/')) throw new Error('notImage');
        if (file.size > MAX_BYTES * 3) throw new Error('tooBig');
        const p = await processImage(file);
        const now = new Date();
        const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}`;
        const variants: Record<string, string> = {};
        let original = '';
        let size = 0;
        for (const f of p.files) {
          if (f.blob.size > MAX_BYTES) throw new Error('tooBig');
          const path = `${dir}/${f.name}`;
          const { error: err } = await db.storage.from('media').upload(path, f.blob, { contentType: p.mime, cacheControl: '31536000', upsert: false });
          if (err) throw new Error(err.message);
          if (f.name.startsWith('original')) {
            original = path;
            size = f.blob.size;
          } else variants[String(f.width)] = path;
        }
        if (p.mime === 'image/webp' && !variants[String(p.width)] && p.width < 1600) variants[String(p.width)] = original;
        const res = await createMedia({ storage_path: original, variants, width: p.width, height: p.height, size_bytes: size, mime_type: p.mime as 'image/webp' });
        if (!res.ok) throw new Error(res.error);
        out.push(res.data!);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'error');
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    return out;
  }
  return { upload, progress, error };
}
