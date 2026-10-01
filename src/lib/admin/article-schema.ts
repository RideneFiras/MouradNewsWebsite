import { z } from 'zod';

const uuid = z.string().uuid();
const optText = z.string().trim().max(2000).nullish().transform((v) => (v ? v : null));

export const ArticleInput = z.object({
  id: uuid.nullish(),
  language: z.enum(['ar', 'fr']),
  kicker_override: optText,
  title: z.string().trim().max(400),
  subtitle: optText,
  body_json: z.any().nullish(),
  location: z.string().trim().max(80).nullish().transform((v) => v || null),
  category_id: uuid.nullish(),
  extra_category_ids: z.array(uuid).max(5).default([]),
  format_id: uuid.nullish(),
  tag_ids: z.array(uuid).max(30).default([]),
  author_ids: z.array(uuid).max(6).default([]),
  byline_override: optText,
  cover_media_id: uuid.nullish(),
  cover_caption: optText,
  cover_credit: optText,
  cover_alt: optText,
  excerpt: z.string().trim().max(400).nullish().transform((v) => v || null),
  is_featured: z.boolean().default(false),
  is_breaking: z.boolean().default(false),
  breaking_hours: z.number().int().min(1).max(72).default(6),
  is_sponsored: z.boolean().default(false),
  sponsor_name: optText,
  allow_ads: z.boolean().default(true),
  seo_title: z.string().trim().max(200).nullish().transform((v) => v || null),
  seo_description: z.string().trim().max(400).nullish().transform((v) => v || null),
  correction_note_ar: optText,
  correction_note_fr: optText,
  significant_update: z.boolean().default(false),
  translation_group_id: uuid.nullish(),
});
export type ArticleInputT = z.input<typeof ArticleInput>;
