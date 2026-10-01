'use server';
import { z } from 'zod';
import { sessionClient } from '@/lib/supabase/server';
import { ActionError, assertStaff, check, one, run } from '@/lib/auth/staff';
import { expireTags } from '@/lib/cache/revalidate';
import { SLUG_RE, slugify } from '@/lib/slug';

const ED = ['editor', 'admin'] as const;
const t = z.string().trim().max(500).nullish().transform((v) => v || null);
const slug = z.string().trim().regex(SLUG_RE, 'slug');
const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const done = () => expireTags(['taxonomy', 'articles', 'redirects', 'homepage']);

async function uniqueSlug(table: 'categories' | 'tags' | 'article_formats', base: string, exceptId?: string | null) {
  const db = await sessionClient();
  let s = base;
  for (let i = 2; i < 100; i++) {
    let q = db.from(table).select('id').eq('slug', s);
    if (exceptId) q = q.neq('id', exceptId);
    const { data } = await q.maybeSingle();
    if (!data) return s;
    s = `${base}-${i}`;
  }
  throw new ActionError('slug_taken', 'slug');
}

// ------------------------------------------------------------- categories

const CategoryInput = z.object({
  id: z.string().uuid().nullish(),
  parent_id: z.string().uuid().nullish().transform((v) => v || null),
  name_ar: z.string().trim().min(1).max(120),
  name_fr: t,
  slug: z.string().trim().max(80).optional(),
  description_ar: t,
  description_fr: t,
  color: color.default('#A3161C'),
  show_in_nav: z.boolean().default(true),
  is_active: z.boolean().default(true),
  seo_title_ar: t, seo_title_fr: t, seo_description_ar: t, seo_description_fr: t,
});

export async function saveCategory(raw: z.input<typeof CategoryInput>) {
  return run(async () => {
    await assertStaff([...ED]);
    const d = CategoryInput.parse(raw);
    const base = d.slug ? slug.parse(d.slug) : slugify(d.name_fr || d.name_ar) || 'section';
    const s = await uniqueSlug('categories', base, d.id);
    const db = await sessionClient();
    const row = { ...d, slug: s };
    delete (row as { id?: unknown }).id;
    const res = d.id
      ? one(await db.from('categories').update(row).eq('id', d.id).select('*').single())
      : one(await db.from('categories').insert({ ...row, position: 999 }).select('*').single());
    done();
    return res;
  });
}

export async function patchCategory(id: string, patch: { show_in_nav?: boolean; is_active?: boolean }) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.from('categories').update(z.object({ show_in_nav: z.boolean().optional(), is_active: z.boolean().optional() }).parse(patch)).eq('id', id));
    done();
  });
}

export async function reorderCategories(ids: string[]) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.rpc('reorder_categories', { p_ids: z.array(z.string().uuid()).max(200).parse(ids) }));
    done();
  });
}

export async function deleteCategory(id: string, targetId: string | null) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.rpc('delete_category_with_move', { p_category_id: id, p_target_id: targetId }));
    done();
  });
}

// ------------------------------------------------------------- tags

const TagInput = z.object({
  id: z.string().uuid().nullish(),
  kind: z.enum(['topic', 'place', 'person', 'club', 'competition', 'event']),
  name_ar: z.string().trim().min(1).max(120),
  name_fr: t,
  slug: z.string().trim().max(80).optional(),
  description_ar: t,
  description_fr: t,
  image_media_id: z.string().uuid().nullish().transform((v) => v || null),
  is_featured: z.boolean().default(false),
});

export async function saveTag(raw: z.input<typeof TagInput>) {
  return run(async () => {
    await assertStaff([...ED]);
    const d = TagInput.parse(raw);
    const base = d.slug ? slug.parse(d.slug) : slugify(d.name_fr || d.name_ar) || 'tag';
    const s = await uniqueSlug('tags', base, d.id);
    const db = await sessionClient();
    const row = { ...d, slug: s };
    delete (row as { id?: unknown }).id;
    const res = d.id ? one(await db.from('tags').update(row).eq('id', d.id).select('*').single()) : one(await db.from('tags').insert(row).select('*').single());
    done();
    return res;
  });
}

export async function deleteTag(id: string) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.from('tags').delete().eq('id', id));
    done();
  });
}

export async function mergeTags(fromId: string, intoId: string) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.rpc('merge_tags', { p_from: fromId, p_into: intoId }));
    done();
  });
}

// ------------------------------------------------------------- formats

const FormatInput = z.object({
  id: z.string().uuid().nullish(),
  name_ar: z.string().trim().min(1).max(80),
  name_fr: t,
  slug: z.string().trim().max(60).optional(),
  is_active: z.boolean().default(true),
  show_as_kicker: z.boolean().default(true),
  is_opinion: z.boolean().default(false),
});

export async function saveFormat(raw: z.input<typeof FormatInput>) {
  return run(async () => {
    await assertStaff([...ED]);
    const d = FormatInput.parse(raw);
    const base = d.slug ? slug.parse(d.slug) : slugify(d.name_fr || d.name_ar) || 'format';
    const s = await uniqueSlug('article_formats', base, d.id);
    const db = await sessionClient();
    const row = { ...d, slug: s };
    delete (row as { id?: unknown }).id;
    const res = d.id
      ? one(await db.from('article_formats').update(row).eq('id', d.id).select('*').single())
      : one(await db.from('article_formats').insert({ ...row, position: 999 }).select('*').single());
    done();
    return res;
  });
}

export async function deleteFormat(id: string) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.from('article_formats').delete().eq('id', id));
    done();
  });
}

export async function reorderRows(table: 'article_formats' | 'homepage_sections' | 'menu_items' | 'pages', ids: string[]) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.rpc('reorder_rows', { p_table: table, p_ids: z.array(z.string().uuid()).max(300).parse(ids) }));
    expireTags(table === 'article_formats' ? ['taxonomy'] : table === 'homepage_sections' ? ['homepage'] : table === 'menu_items' ? ['menus'] : ['pages']);
  });
}
