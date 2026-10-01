import type { AppLocale } from '@/lib/i18n/routing';

export type Lang = AppLocale;

export interface MediaRef {
  id: string;
  path: string;
  variants: Record<string, string>;
  width: number | null;
  height: number | null;
  focal_x: number;
  focal_y: number;
  alt_ar: string | null;
  alt_fr: string | null;
  caption_ar: string | null;
  caption_fr: string | null;
  credit: string | null;
  mime_type?: string;
}

export interface Byline {
  id: string;
  slug: string;
  name_ar: string;
  name_fr: string | null;
  title_ar: string | null;
  title_fr: string | null;
  linkable: boolean;
  avatar: MediaRef | null;
}

export interface ArticleCard {
  id: string;
  public_id: number;
  language: Lang;
  translation_group_id: string | null;
  status: string;
  kicker_override: string | null;
  title: string;
  subtitle: string | null;
  slug: string | null;
  excerpt: string | null;
  category_id: string;
  format_id: string | null;
  location: string | null;
  byline_override: string | null;
  is_breaking: boolean;
  breaking_until: string | null;
  is_featured: boolean;
  is_sponsored: boolean;
  sponsor_name: string | null;
  allow_ads: boolean;
  reading_minutes: number;
  published_at: string;
  first_published_at: string | null;
  content_updated_at: string | null;
  is_demo: boolean;
  cover_caption: string | null;
  cover_credit: string | null;
  cover_alt: string | null;
  category_slug: string;
  category_name_ar: string;
  category_name_fr: string | null;
  category_color: string;
  category_parent_id: string | null;
  format_slug: string | null;
  format_name_ar: string | null;
  format_name_fr: string | null;
  format_show_as_kicker: boolean;
  format_is_opinion: boolean;
  cover: MediaRef | null;
  authors: Byline[];
  tag_ids: string[];
  extra_category_ids: string[];
}

export interface ArticleFull extends ArticleCard {
  body_html: string | null;
  body_text: string | null;
  correction_note_ar: string | null;
  correction_note_fr: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  og_media: MediaRef | null;
  updated_at: string;
  tags: Tag[];
}

export interface Category {
  id: string;
  parent_id: string | null;
  slug: string;
  name_ar: string;
  name_fr: string | null;
  description_ar: string | null;
  description_fr: string | null;
  color: string;
  position: number;
  show_in_nav: boolean;
  show_on_home: boolean;
  is_active: boolean;
  seo_title_ar: string | null;
  seo_title_fr: string | null;
  seo_description_ar: string | null;
  seo_description_fr: string | null;
}

export interface Format {
  id: string;
  slug: string;
  name_ar: string;
  name_fr: string | null;
  position: number;
  is_active: boolean;
  show_as_kicker: boolean;
  is_opinion: boolean;
}

export type TagKind = 'topic' | 'place' | 'person' | 'club' | 'competition' | 'event';

export interface Tag {
  id: string;
  kind: TagKind;
  slug: string;
  name_ar: string;
  name_fr: string | null;
  description_ar: string | null;
  description_fr: string | null;
  image_media_id: string | null;
  is_featured: boolean;
}

export interface PublicAuthor {
  id: string;
  slug: string;
  display_name_ar: string;
  display_name_fr: string | null;
  title_ar: string | null;
  title_fr: string | null;
  bio_ar: string | null;
  bio_fr: string | null;
  email_public: string | null;
  social: Record<string, string>;
  avatar: MediaRef | null;
}

export interface MenuItem {
  id: string;
  menu: 'header_extra' | 'footer' | 'utility';
  label_ar: string;
  label_fr: string | null;
  target_type: 'url' | 'category' | 'page' | 'tag';
  url: string | null;
  category_id: string | null;
  page_id: string | null;
  tag_id: string | null;
  parent_id: string | null;
  position: number;
  open_in_new_tab: boolean;
}

export interface StaticPage {
  id: string;
  slug: string;
  language: Lang;
  title: string;
  body_html: string | null;
  status: string;
  show_in_footer: boolean;
  position: number;
  page_kind: 'standard' | 'media_kit' | 'contact' | 'charter' | 'privacy' | 'about' | 'legal';
  seo_title: string | null;
  seo_description: string | null;
  translation_group_id: string | null;
  updated_at: string;
}

export type HomepageSectionType =
  | 'lead' | 'breaking_ticker' | 'latest_list' | 'category_block' | 'editor_picks'
  | 'most_read' | 'opinion' | 'format_block' | 'tag_block' | 'ad_slot' | 'text_block';

export interface HomepageSection {
  id: string;
  locale: 'ar' | 'fr' | 'both';
  type: HomepageSectionType;
  title_ar: string | null;
  title_fr: string | null;
  config: Record<string, unknown>;
  position: number;
  is_active: boolean;
}

export interface AdSlot {
  key: string;
  label_ar: string;
  label_fr: string | null;
  mode: 'off' | 'adsense' | 'direct' | 'house';
  adsense_slot_id: string | null;
  sizes: { desktop?: [number, number]; mobile?: [number, number] };
}

export interface ActiveCampaign {
  id: string;
  sponsor_name: string;
  slot_key: string;
  locale: 'ar' | 'fr' | 'both';
  alt_text: string;
  weight: number;
  category_ids: string[] | null;
  desktop_path: string | null;
  desktop_variants: Record<string, string> | null;
  desktop_width: number | null;
  desktop_height: number | null;
  mobile_path: string | null;
  mobile_variants: Record<string, string> | null;
  mobile_width: number | null;
  mobile_height: number | null;
}
