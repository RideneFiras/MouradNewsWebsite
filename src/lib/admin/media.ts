'use server';
import { z } from 'zod';
import { sessionClient } from '@/lib/supabase/server';
import { ActionError, assertStaff, check, isEditor, one, run } from '@/lib/auth/staff';
import { expireTags } from '@/lib/cache/revalidate';

export interface AdminMedia {
  id: string;
  storage_path: string;
  variants: Record<string, string>;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  mime_type: string;
  focal_x: number;
  focal_y: number;
  alt_ar: string | null;
  alt_fr: string | null;
  caption_ar: string | null;
  caption_fr: string | null;
  credit: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const PATH = z.string().regex(/^[0-9]{4}\/[0-9]{2}\/[0-9a-f-]{36}\/[a-z0-9_.-]+$/);

export async function createMedia(input: { storage_path: string; variants: Record<string, string>; width: number; height: number; size_bytes: number; mime_type: string }) {
  return run(async () => {
    const staff = await assertStaff();
    const d = z.object({
      storage_path: PATH, variants: z.record(z.string(), PATH), width: z.number().int().positive(), height: z.number().int().positive(),
      size_bytes: z.number().int().nonnegative(), mime_type: z.enum(['image/webp', 'image/svg+xml', 'image/png', 'image/jpeg']),
    }).parse(input);
    const db = await sessionClient();
    return one(await db.from('media').insert({ ...d, uploaded_by: staff.id }).select('*').single()) as AdminMedia;
  });
}

export async function updateMedia(id: string, patch: Partial<Pick<AdminMedia, 'alt_ar' | 'alt_fr' | 'caption_ar' | 'caption_fr' | 'credit' | 'focal_x' | 'focal_y'>>) {
  return run(async () => {
    await assertStaff();
    const t = z.string().trim().max(500).nullish().transform((v) => v || null);
    const d = z.object({
      alt_ar: t, alt_fr: t, caption_ar: t, caption_fr: t, credit: t,
      focal_x: z.number().min(0).max(1).optional(), focal_y: z.number().min(0).max(1).optional(),
    }).partial().parse(patch);
    const db = await sessionClient();
    const row = one(await db.from('media').update(d).eq('id', z.string().uuid().parse(id)).select('*').single()) as AdminMedia;
    expireTags(['articles', 'taxonomy', 'authors']);
    return row;
  });
}

export async function mediaUsage(id: string) {
  return run(async () => {
    await assertStaff();
    const db = await sessionClient();
    return (check(await db.rpc('media_usage', { p_media_id: id })) ?? []) as { kind: string; ref_id: string | null; label: string }[];
  });
}

export async function deleteMedia(id: string) {
  return run(async () => {
    const staff = await assertStaff();
    const db = await sessionClient();
    const used = (check(await db.rpc('media_usage', { p_media_id: id })) ?? []) as unknown[];
    if (used.length) throw new ActionError('in_use');
    const m = one(await db.from('media').select('*').eq('id', id).single()) as AdminMedia;
    if (!isEditor(staff) && m.uploaded_by !== staff.id) throw new ActionError('not_allowed');
    const paths = Array.from(new Set([m.storage_path, ...Object.values(m.variants ?? {})])).filter((p) => !/^https?:/.test(p));
    if (paths.length) await db.storage.from('media').remove(paths);
    check(await db.from('media').delete().eq('id', id));
  });
}

export async function listMedia(opts: { q?: string; uploader?: string; page?: number; perPage?: number } = {}) {
  return run(async () => {
    await assertStaff();
    const db = await sessionClient();
    const perPage = Math.min(opts.perPage ?? 48, 96);
    const page = Math.max(1, opts.page ?? 1);
    let q = db.from('media').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * perPage, page * perPage - 1);
    const term = opts.q?.trim().replace(/[%_,()]/g, '');
    if (term) q = q.or(`caption_ar.ilike.%${term}%,caption_fr.ilike.%${term}%,credit.ilike.%${term}%,alt_ar.ilike.%${term}%,alt_fr.ilike.%${term}%`);
    if (opts.uploader) q = q.eq('uploaded_by', opts.uploader);
    const res = await q;
    if (res.error) throw new Error(res.error.message);
    return { items: (res.data ?? []) as AdminMedia[], total: res.count ?? 0 };
  });
}
