// Zod-free constants and types for the homepage builder (client component).
// Validation schemas live in homepage-config.ts (server).

export const SECTION_TYPES = ['lead', 'breaking_ticker', 'latest_list', 'category_block', 'editor_picks', 'most_read', 'opinion', 'format_block', 'tag_block', 'ad_slot', 'text_block', 'agenda'] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export interface BuilderSection {
  id: string;
  isNew?: boolean;
  locale: 'ar' | 'fr' | 'both';
  type: SectionType;
  title_ar: string | null;
  title_fr: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
}

const DEFAULTS: Partial<Record<SectionType, Record<string, unknown>>> = {
  lead: { source: 'featured_or_latest', secondary_count: 3, layout: 'side_by_side' },
  latest_list: { count: 10 },
  editor_picks: { count: 4 },
  most_read: { window_days: 7, count: 5 },
  opinion: { count: 4 },
  agenda: { count: 5 },
};

export function defaultConfig(type: SectionType, firstIds: { category?: string; format?: string; tag?: string }): Record<string, unknown> {
  switch (type) {
    case 'category_block': return { category_id: firstIds.category, count: 5, layout: 'one_big_four_list' };
    case 'format_block': return { format_id: firstIds.format, count: 4 };
    case 'tag_block': return { tag_id: firstIds.tag, count: 4 };
    case 'ad_slot': return { ad_slot_key: 'home_mid' };
    case 'text_block': return { text_ar: '', text_fr: '' };
    default: return { ...(DEFAULTS[type] ?? {}) };
  }
}
