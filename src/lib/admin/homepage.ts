'use server';
import { z } from 'zod';
import { sessionClient } from '@/lib/supabase/server';
import { ActionError, assertStaff, check, run } from '@/lib/auth/staff';
import { expireTags } from '@/lib/cache/revalidate';
import { SECTION_CONFIG } from './homepage-config';
import { SECTION_TYPES, type BuilderSection } from './homepage-types';

/** Saves the composition of one interface tab. Sections shared by both tabs ("both") are kept in both. */
export async function saveHomepage(tab: 'ar' | 'fr', sections: BuilderSection[]) {
  return run(async () => {
    await assertStaff(['editor', 'admin']);
    const db = await sessionClient();
    const rows = sections.map((s, i) => {
      const type = z.enum(SECTION_TYPES).parse(s.type);
      const parsed = SECTION_CONFIG[type].safeParse(s.config ?? {});
      if (!parsed.success) throw new ActionError('invalid_config', s.id);
      return {
        ...(s.isNew ? {} : { id: z.string().uuid().parse(s.id) }),
        locale: z.enum(['ar', 'fr', 'both']).parse(s.locale), type, position: i + 1, is_active: Boolean(s.is_active),
        title_ar: s.title_ar?.trim() || null, title_fr: s.title_fr?.trim() || null, config: parsed.data,
      };
    });
    const { data: current } = await db.from('homepage_sections').select('id').in('locale', [tab, 'both']);
    const keep = new Set(rows.filter((r) => 'id' in r).map((r) => (r as { id: string }).id));
    const removed = (current ?? []).map((r) => r.id).filter((x) => !keep.has(x));
    if (removed.length) check(await db.from('homepage_sections').delete().in('id', removed));
    const existing = rows.filter((r) => 'id' in r);
    const fresh = rows.filter((r) => !('id' in r));
    if (existing.length) check(await db.from('homepage_sections').upsert(existing));
    if (fresh.length) check(await db.from('homepage_sections').insert(fresh));
    expireTags(['homepage']);
  });
}
