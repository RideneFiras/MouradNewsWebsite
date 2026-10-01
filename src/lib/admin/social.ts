'use server';
import { z } from 'zod';
import { sessionClient } from '@/lib/supabase/server';
import { ActionError, assertStaff, check, one, run } from '@/lib/auth/staff';
import { expireTags } from '@/lib/cache/revalidate';

// Manual social numbers (docs/07 "Manual social stats"): the only human-entered statistics.
// RLS: editors/admins insert their own; they may correct their own entry for 24 hours.
const count = z.number().int().min(0).max(1_000_000_000).nullable();
const SocialInput = z.object({
  id: z.string().uuid().optional(),
  platform: z.enum(['facebook', 'instagram', 'youtube', 'tiktok']),
  recorded_for: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  followers: count,
  reach_28d: count,
  engagement_28d: count,
  note: z.string().trim().max(300).nullish().transform((v) => v || null),
});

export async function saveSocialStats(input: z.input<typeof SocialInput>) {
  return run(async () => {
    await assertStaff(['editor', 'admin']);
    const v = SocialInput.parse(input);
    if (v.followers == null && v.reach_28d == null && v.engagement_28d == null) throw new ActionError('need_one', 'followers');
    const db = await sessionClient();
    const { id, ...row } = v;
    const sel = 'id, platform, recorded_for, followers, reach_28d, engagement_28d, note, entered_by, created_at';
    const saved = id
      ? one(await db.from('social_stats').update(row).eq('id', id).select(sel).maybeSingle())
      : check(await db.from('social_stats').insert(row).select(sel).single());
    expireTags(['stats']);
    return saved;
  });
}
