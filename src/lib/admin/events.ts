'use server';
import { z } from 'zod';
import { sessionClient } from '@/lib/supabase/server';
import { assertStaff, check, run } from '@/lib/auth/staff';
import { expireTags } from '@/lib/cache/revalidate';
import { tunisianHolidays } from '@/lib/events/holidays';

const ED = ['editor', 'admin'] as const;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullish().or(z.literal('')).transform((v) => v || null);
const text = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);
const uuid = z.string().uuid().nullish().or(z.literal('')).transform((v) => v || null);

const EventInput = z.object({
  id: z.string().uuid().nullish(),
  kind: z.enum(['event', 'holiday']).default('event'),
  title_ar: z.string().trim().min(1).max(300),
  title_fr: text(300),
  starts_on: day,
  ends_on: day.nullish().or(z.literal('')).transform((v) => v || null),
  start_time: time,
  end_time: time,
  place: text(200),
  town_tag_id: uuid,
  article_id: uuid,
  is_estimate: z.boolean().default(false),
  is_visible: z.boolean().default(true),
}).refine((v) => !v.ends_on || v.ends_on >= v.starts_on, { message: 'ends_before_start', path: ['ends_on'] });

export type EventInputT = z.input<typeof EventInput>;

const done = () => expireTags(['events', 'homepage']);

/** Create or update a calendar entry (الأجندة). */
export async function saveEvent(input: EventInputT) {
  return run(async () => {
    await assertStaff([...ED]);
    const { id, ...v } = EventInput.parse(input);
    const db = await sessionClient();
    const row = id
      ? check(await db.from('events').update(v).eq('id', id).select('id').single())
      : check(await db.from('events').insert(v).select('id').single());
    done();
    return row as { id: string };
  });
}

export async function deleteEvent(id: string) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.from('events').delete().eq('id', z.string().uuid().parse(id)));
    done();
  });
}

/**
 * Adds the Tunisian public holidays of a year: the fixed civil ones, and the Islamic ones as
 * estimates (to confirm after the official announcement). A holiday already on the calendar
 * (same name, same year) is left as it is, so the editor's corrections are kept.
 */
export async function addHolidays(year: number) {
  return run(async () => {
    await assertStaff([...ED]);
    const y = z.number().int().min(2020).max(2100).parse(year);
    const db = await sessionClient();
    const { data: settings } = await db.from('site_settings').select('value').eq('key', 'show_hijri_date').maybeSingle();
    const offset = Number((settings?.value as { offset_days?: number } | null)?.offset_days ?? 0) || 0;
    const existing = check(await db.from('events').select('title_ar').eq('kind', 'holiday').gte('starts_on', `${y}-01-01`).lte('starts_on', `${y}-12-31`)) as { title_ar: string }[];
    const have = new Set(existing.map((e) => e.title_ar));
    const rows = tunisianHolidays(y, offset).filter((h) => !have.has(h.title_ar)).map((h) => ({ ...h, kind: 'holiday' as const }));
    if (rows.length) check(await db.from('events').insert(rows));
    done();
    return { added: rows.length };
  });
}

/** Articles to link an event to (drafts included: the event shows once the article is public). */
export async function searchArticlesForEvent(q: string) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    const term = z.string().trim().max(100).parse(q);
    let query = db.from('articles').select('id, public_id, title, status').neq('status', 'archived').order('updated_at', { ascending: false }).limit(8);
    if (term) query = /^\d+$/.test(term) ? query.eq('public_id', Number(term)) : query.ilike('title', `%${term.replace(/[%_]/g, '')}%`);
    return check(await query) as { id: string; public_id: number; title: string; status: string }[];
  });
}
