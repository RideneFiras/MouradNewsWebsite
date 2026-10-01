'use server';
import { z } from 'zod';
import { sessionClient } from '@/lib/supabase/server';
import { ActionError, assertStaff, check, one, run } from '@/lib/auth/staff';
import { expireTags } from '@/lib/cache/revalidate';

// Ad slots and sponsor campaigns (admin only; RLS: ad_slots_admin / ad_campaigns_admin).
// Ad statistics are never written here: only /api/ads/i and /api/ads/c through the
// service-role counters.

const AD = ['admin'] as const;
const size = z.tuple([z.coerce.number().int().min(50).max(1200), z.coerce.number().int().min(50).max(1200)]);

const SlotInput = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  label_ar: z.string().trim().min(1).max(120),
  label_fr: z.string().trim().max(120).nullish().transform((v) => v || null),
  mode: z.enum(['off', 'adsense', 'direct', 'house']),
  adsense_slot_id: z.string().trim().regex(/^(\d{4,20})?$/).nullish().transform((v) => v || null),
  sizes: z.object({ desktop: size, mobile: size }),
  is_active: z.boolean(),
});

export async function saveSlot(raw: z.input<typeof SlotInput>) {
  return run(async () => {
    await assertStaff([...AD]);
    const v = SlotInput.parse(raw);
    if (v.mode === 'adsense' && !v.adsense_slot_id) throw new ActionError('adsense_slot_required', 'adsense_slot_id');
    const db = await sessionClient();
    const { key, ...row } = v;
    const saved = one(await db.from('ad_slots').update(row).eq('key', key).select('*').maybeSingle());
    expireTags(['ads']);
    return saved;
  });
}

const tunisLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
/** Tunisia is UTC+1 all year (no daylight saving since 2009). */
const fromTunis = (v: string) => new Date(`${v}:00+01:00`).toISOString();

const CampaignInput = z.object({
  id: z.string().uuid().optional(),
  sponsor_name: z.string().trim().min(1).max(120),
  slot_key: z.string().regex(/^[a-z0-9_]+$/),
  locale: z.enum(['ar', 'fr', 'both']),
  creative_desktop_media_id: z.string().uuid().nullable(),
  creative_mobile_media_id: z.string().uuid().nullable(),
  click_url: z.string().trim().max(2000).regex(/^https:\/\/[^\s]+$/, 'https'),
  alt_text: z.string().trim().max(200).default(''),
  starts_at: tunisLocal,
  ends_at: tunisLocal.nullish().or(z.literal('')).transform((v) => v || null),
  weight: z.coerce.number().int().min(1).max(100),
  category_ids: z.array(z.string().uuid()).max(50),
  is_active: z.boolean(),
  notes: z.string().trim().max(1000).nullish().transform((v) => v || null),
});

export async function saveCampaign(raw: z.input<typeof CampaignInput>) {
  return run(async () => {
    await assertStaff([...AD]);
    const parsed = CampaignInput.safeParse(raw);
    if (!parsed.success) throw new ActionError('invalid', String(parsed.error.issues[0]?.path[0] ?? ''));
    const v = parsed.data;
    if (!v.creative_desktop_media_id && !v.creative_mobile_media_id) throw new ActionError('creative_required', 'creative_desktop_media_id');
    const starts = fromTunis(v.starts_at);
    const ends = v.ends_at ? fromTunis(v.ends_at) : null;
    if (ends && ends <= starts) throw new ActionError('ends_before_start', 'ends_at');
    const db = await sessionClient();
    const { id, ...rest } = v;
    const row = { ...rest, starts_at: starts, ends_at: ends, category_ids: v.category_ids.length ? v.category_ids : null };
    const saved = id
      ? one(await db.from('ad_campaigns').update(row).eq('id', id).select('id').maybeSingle())
      : check(await db.from('ad_campaigns').insert(row).select('id').single());
    expireTags(['ads']);
    return saved as { id: string };
  });
}

/** Only a campaign that was never shown can be deleted (deleting would erase its numbers). */
export async function deleteCampaign(id: string) {
  return run(async () => {
    await assertStaff([...AD]);
    const db = await sessionClient();
    const { count } = await db.from('ad_daily_stats').select('campaign_id', { count: 'exact', head: true }).eq('campaign_id', id);
    if ((count ?? 0) > 0) throw new ActionError('has_stats');
    check(await db.from('ad_campaigns').delete().eq('id', id));
    expireTags(['ads']);
  });
}
