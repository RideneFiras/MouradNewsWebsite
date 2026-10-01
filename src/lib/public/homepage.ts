import 'server-only';
import { getCategories, getFormats, getMostRead, getTagBySlug, getTagsByIds, listCards } from '@/lib/data/queries';
import type { ArticleCard, Category, Format, HomepageSection, Lang, Tag } from '@/lib/data/types';

export type CategoryLayout = 'one_big_four_list' | 'feature_plus_list' | 'three_columns' | 'list_only';

export type ResolvedSection =
  | { kind: 'lead'; id: string; lead: ArticleCard; secondary: ArticleCard[]; layout: 'side_by_side' | 'stacked' }
  | { kind: 'latest'; id: string; title: string | null; items: ArticleCard[] }
  | { kind: 'category'; id: string; title: string; category: Category; items: ArticleCard[]; layout: CategoryLayout }
  | { kind: 'picks'; id: string; title: string | null; items: ArticleCard[] }
  | { kind: 'most_read'; id: string; title: string | null; items: ArticleCard[] }
  | { kind: 'opinion'; id: string; title: string | null; items: ArticleCard[] }
  | { kind: 'format'; id: string; title: string; format: Format; items: ArticleCard[] }
  | { kind: 'tag'; id: string; title: string; tag: Tag; items: ArticleCard[] }
  | { kind: 'ad'; id: string; slotKey: string }
  | { kind: 'text'; id: string; text: string };

const num = (v: unknown, d: number, max = 20) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : d;
};
const str = (v: unknown) => (typeof v === 'string' ? v : null);

/**
 * Builds the homepage from homepage_sections. One pooled query of recent articles feeds
 * every section; a section only queries again if the pool doesn't have enough for it.
 * An article shown in the lead area or a block is not repeated lower on the page.
 */
export async function resolveHomepage(sections: HomepageSection[], locale: Lang, langs: Lang[]): Promise<ResolvedSection[]> {
  const [{ items: pool }, categories, formats] = await Promise.all([listCards({ langs, limit: 80 }), getCategories(), getFormats()]);
  const shown = new Set<string>();
  const title = (s: HomepageSection) => (locale === 'fr' ? s.title_fr || s.title_ar : s.title_ar) || null;
  const take = (cands: ArticleCard[], n: number) => {
    const out = cands.filter((a) => !shown.has(a.id)).slice(0, n);
    out.forEach((a) => shown.add(a.id));
    return out;
  };
  const fill = async (cands: ArticleCard[], n: number, more: () => Promise<ArticleCard[]>) => {
    const fromPool = cands.filter((a) => !shown.has(a.id));
    if (fromPool.length >= n) return take(fromPool, n);
    const extra = await more();
    const seen = new Set(fromPool.map((a) => a.id));
    return take([...fromPool, ...extra.filter((a) => !seen.has(a.id))], n);
  };

  const out: ResolvedSection[] = [];
  for (const s of sections) {
    const c = s.config ?? {};
    switch (s.type) {
      case 'lead': {
        const cutoff = Date.now() - 48 * 3600 * 1000;
        const lead = pool.find((a) => a.is_featured && Date.parse(a.published_at) >= cutoff && !shown.has(a.id)) ?? pool.find((a) => !shown.has(a.id));
        if (!lead) break;
        shown.add(lead.id);
        const n = num(c.secondary_count, 3, 6);
        const featured = pool.filter((a) => a.is_featured);
        const secondary = take([...featured, ...pool.filter((a) => !a.is_featured)], n);
        out.push({ kind: 'lead', id: s.id, lead, secondary, layout: c.layout === 'stacked' ? 'stacked' : 'side_by_side' });
        break;
      }
      case 'latest_list': {
        // A chronological feed: not deduplicated against the lead (it is the "latest" column).
        const items = pool.slice(0, num(c.count, 10, 30));
        if (items.length) out.push({ kind: 'latest', id: s.id, title: title(s), items });
        break;
      }
      case 'category_block': {
        const cat = categories.find((x) => x.id === str(c.category_id));
        if (!cat) break;
        const ids = [cat.id, ...categories.filter((x) => x.parent_id === cat.id).map((x) => x.id)];
        const n = num(c.count, 5);
        const inCat = (a: ArticleCard) => ids.includes(a.category_id) || a.extra_category_ids.some((x) => ids.includes(x));
        const items = await fill(pool.filter(inCat), n, async () => (await listCards({ langs, categoryIds: ids, includeExtra: true, limit: n + shown.size })).items);
        const layout = (['one_big_four_list', 'feature_plus_list', 'three_columns', 'list_only'] as const).find((l) => l === c.layout) ?? 'one_big_four_list';
        if (items.length) out.push({ kind: 'category', id: s.id, title: title(s) || (locale === 'fr' ? cat.name_fr || cat.name_ar : cat.name_ar), category: cat, items, layout });
        break;
      }
      case 'editor_picks': {
        const n = num(c.count, 4, 8);
        const items = await fill(pool.filter((a) => a.is_featured), n, async () => (await listCards({ langs, featured: true, limit: n + shown.size })).items);
        if (items.length) out.push({ kind: 'picks', id: s.id, title: title(s), items });
        break;
      }
      case 'most_read': {
        const items = await getMostRead(langs, num(c.window_days, 7, 90), num(c.count, 5, 10));
        if (items.length) out.push({ kind: 'most_read', id: s.id, title: title(s), items });
        break;
      }
      case 'opinion': {
        const n = num(c.count, 4, 8);
        const items = await fill(pool.filter((a) => a.format_is_opinion), n, async () => (await listCards({ langs, opinion: true, limit: n + shown.size })).items);
        if (items.length) out.push({ kind: 'opinion', id: s.id, title: title(s), items });
        break;
      }
      case 'format_block': {
        const f = formats.find((x) => x.id === str(c.format_id));
        if (!f) break;
        const n = num(c.count, 4, 8);
        const items = await fill(pool.filter((a) => a.format_id === f.id), n, async () => (await listCards({ langs, formatId: f.id, limit: n + shown.size })).items);
        if (items.length) out.push({ kind: 'format', id: s.id, title: title(s) || (locale === 'fr' ? f.name_fr || f.name_ar : f.name_ar), format: f, items });
        break;
      }
      case 'tag_block': {
        const tagId = str(c.tag_id);
        const slug = str(c.tag_slug);
        const tag = tagId ? ((await getTagsByIds([tagId]))[0] ?? null) : slug ? await getTagBySlug(slug) : null;
        if (!tag) break;
        const n = num(c.count, 4, 8);
        const items = await fill(pool.filter((a) => a.tag_ids.includes(tag.id)), n, async () => (await listCards({ langs, tagId: tag.id, limit: n + shown.size })).items);
        if (items.length) out.push({ kind: 'tag', id: s.id, title: title(s) || (locale === 'fr' ? tag.name_fr || tag.name_ar : tag.name_ar), tag, items });
        break;
      }
      case 'ad_slot': {
        const key = str(c.ad_slot_key);
        if (key) out.push({ kind: 'ad', id: s.id, slotKey: key });
        break;
      }
      case 'text_block': {
        const text = (locale === 'fr' ? str(c.text_fr) || str(c.text_ar) : str(c.text_ar)) ?? '';
        if (text.trim()) out.push({ kind: 'text', id: s.id, text });
        break;
      }
      case 'breaking_ticker':
      default:
        // The breaking bar is part of the masthead on every page (see DECISIONS.md).
        break;
    }
  }
  return out;
}
