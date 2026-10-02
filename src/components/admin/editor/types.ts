import type { PMNode } from '@/lib/content/render';

export interface EditorArticle {
  id: string | null;
  public_id: number | null;
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived';
  language: 'ar' | 'fr';
  kicker_override: string;
  title: string;
  subtitle: string;
  body_json: PMNode | null;
  location: string;
  category_id: string;
  extra_category_ids: string[];
  format_id: string;
  tag_ids: string[];
  author_ids: string[];
  byline_override: string;
  /** Published without any author name (no «بقلم» line, no author box). */
  unsigned: boolean;
  cover_media_id: string | null;
  cover: { storage_path: string; variants: Record<string, string>; focal_x: number; focal_y: number; alt_ar: string | null; alt_fr: string | null; caption_ar: string | null; caption_fr: string | null; credit: string | null } | null;
  cover_caption: string;
  cover_credit: string;
  cover_alt: string;
  excerpt: string;
  is_featured: boolean;
  is_breaking: boolean;
  breaking_hours: number;
  is_sponsored: boolean;
  sponsor_name: string;
  allow_ads: boolean;
  seo_title: string;
  seo_description: string;
  correction_note_ar: string;
  correction_note_fr: string;
  significant_update: boolean;
  translation_group_id: string | null;
  review_note: string | null;
  scheduled_for: string | null;
  slug: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface EditorOptions {
  categories: { id: string; parent_id: string | null; name_ar: string; name_fr: string | null; is_active: boolean }[];
  formats: { id: string; name_ar: string; name_fr: string | null }[];
  tags: { id: string; name_ar: string; name_fr: string | null; kind: string; slug: string }[];
  people: { id: string; name: string }[];
  places: string[];
  translations: { id: string; language: 'ar' | 'fr'; title: string; status: string }[];
  breakingHours: number;
  siteUrl: string;
  siteName: string;
}
