import 'server-only';
import { sessionClient } from '@/lib/supabase/server';

/** Options for the campaign form: slots, sections (tree order), creative previews. */
export async function campaignFormData(locale: 'ar' | 'fr', mediaIds: (string | null)[]) {
  const db = await sessionClient();
  const ids = mediaIds.filter(Boolean) as string[];
  const [slots, cats, media] = await Promise.all([
    db.from('ad_slots').select('key, label_ar, label_fr, sizes').order('created_at'),
    db.from('categories').select('id, name_ar, name_fr, parent_id, position').order('position'),
    ids.length ? db.from('media').select('id, storage_path, variants').in('id', ids) : Promise.resolve({ data: [] as { id: string; storage_path: string; variants: Record<string, string> }[] }),
  ]);
  const all = cats.data ?? [];
  const name = (c: { name_ar: string; name_fr: string | null }) => (locale === 'fr' ? c.name_fr || c.name_ar : c.name_ar);
  const tree = all.filter((c) => !c.parent_id).flatMap((p) => [p, ...all.filter((c) => c.parent_id === p.id)]);
  return {
    slots: (slots.data ?? []).map((s) => ({ key: s.key, label: locale === 'fr' ? s.label_fr || s.label_ar : s.label_ar, sizes: s.sizes })),
    categories: tree.map((c) => ({ id: c.id, name: name(c), parent_id: c.parent_id })),
    previews: Object.fromEntries((media.data ?? []).map((m) => [m.id, (m.variants as Record<string, string>)?.['480'] ?? m.storage_path])),
  };
}
