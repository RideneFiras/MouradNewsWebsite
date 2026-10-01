import { z } from 'zod';

// Config of each homepage section type (docs/04 homepage_sections.config). Shared by the
// builder (client) and the server action.
const count = (d: number, max = 20) => z.coerce.number().int().min(1).max(max).default(d);
const id = z.string().uuid();

export const SECTION_CONFIG = {
  lead: z.object({ source: z.literal('featured_or_latest').default('featured_or_latest'), secondary_count: count(3, 6), layout: z.enum(['side_by_side', 'stacked']).default('side_by_side') }),
  breaking_ticker: z.object({}),
  latest_list: z.object({ count: count(10, 30) }),
  category_block: z.object({ category_id: id, count: count(5), layout: z.enum(['one_big_four_list', 'feature_plus_list', 'three_columns', 'list_only']).default('one_big_four_list') }),
  editor_picks: z.object({ count: count(4, 8) }),
  most_read: z.object({ window_days: count(7, 90), count: count(5, 10) }),
  opinion: z.object({ count: count(4, 8) }),
  format_block: z.object({ format_id: id, count: count(4, 8) }),
  tag_block: z.object({ tag_id: id, count: count(4, 8) }),
  ad_slot: z.object({ ad_slot_key: z.string().regex(/^[a-z0-9_]+$/) }),
  text_block: z.object({ text_ar: z.string().max(2000).default(''), text_fr: z.string().max(2000).default('') }),
} as const;

export { SECTION_TYPES, defaultConfig, type BuilderSection, type SectionType } from './homepage-types';
