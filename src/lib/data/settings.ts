// Typed view of site_settings (public keys). Defaults mirror supabase/seed.sql so the
// site still renders if a key was deleted.

export interface Bilingual {
  ar: string;
  fr: string;
}

export interface MediaKitFormat {
  name_ar: string;
  name_fr: string;
  description_ar: string;
  description_fr: string;
  size: string;
  price_ar: string;
  price_fr: string;
  visible: boolean;
}

export interface MediaKitSettings {
  metrics: Record<string, boolean>;
  period: 'last_full_month' | 'last_30_days' | 'last_3_months_avg';
  rounding: 'exact' | 'round_down';
  statement_ar: string;
  statement_fr: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  formats: MediaKitFormat[];
}

export interface SiteSettings {
  site_name: Bilingual;
  tagline: Bilingual;
  logo: { media_id: string | null; use_text_nameplate: boolean; path?: string | null };
  favicon_media_id: string | null;
  masthead_ears: { start: 'latest' | 'none'; end_ar: string; end_fr: string };
  legal_masthead: Record<string, string>;
  social_links: Record<string, string>;
  show_hijri_date: { enabled: boolean; offset_days: number };
  breaking: { enabled: boolean; default_hours: number };
  content_mixing: { fr_include_arabic_content: boolean; ar_include_french_content: boolean };
  /** Languages readers can switch to. French off = no FR switch and no hreflang to /fr. */
  public_languages: { fr: boolean };
  ga4: { measurement_id: string };
  adsense: { client_id: string; enabled: boolean };
  ads_txt: { content: string };
  consent: { mode: 'google_cmp' | 'none'; custom_text_ar: string; custom_text_fr: string };
  in_article_ads: { after_paragraphs: number[]; min_paragraphs: number };
  default_og_media_id: string | null;
  home_text_block: { text_ar: string; text_fr: string };
  media_kit: MediaKitSettings;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: { ar: 'البرج', fr: 'El Borj' },
  tagline: { ar: 'جريدة إلكترونية مستقلّة', fr: 'Journal électronique indépendant' },
  logo: { media_id: null, use_text_nameplate: true },
  favicon_media_id: null,
  masthead_ears: { start: 'latest', end_ar: '', end_fr: '' },
  legal_masthead: {},
  social_links: {},
  show_hijri_date: { enabled: true, offset_days: 0 },
  breaking: { enabled: true, default_hours: 6 },
  content_mixing: { fr_include_arabic_content: true, ar_include_french_content: true },
  public_languages: { fr: false },
  ga4: { measurement_id: '' },
  adsense: { client_id: '', enabled: false },
  ads_txt: { content: '' },
  consent: { mode: 'google_cmp', custom_text_ar: '', custom_text_fr: '' },
  in_article_ads: { after_paragraphs: [3, 8], min_paragraphs: 5 },
  default_og_media_id: null,
  home_text_block: { text_ar: '', text_fr: '' },
  media_kit: {
    metrics: {},
    period: 'last_full_month',
    rounding: 'round_down',
    statement_ar: '',
    statement_fr: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    formats: [],
  },
};

export function mergeSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    const def = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[r.key];
    if (def && typeof def === 'object' && !Array.isArray(def) && r.value && typeof r.value === 'object') {
      out[r.key] = { ...(def as object), ...(r.value as object) };
    } else if (r.value !== undefined) {
      out[r.key] = r.value;
    }
  }
  return out as unknown as SiteSettings;
}

export const pick = (b: Partial<Bilingual> | undefined, locale: 'ar' | 'fr'): string =>
  (locale === 'fr' ? b?.fr || b?.ar : b?.ar || b?.fr) ?? '';
