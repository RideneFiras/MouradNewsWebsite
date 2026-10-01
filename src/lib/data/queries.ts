import 'server-only';
import { publicClient } from '@/lib/supabase/public';
import { cached, TAGS } from './cache';
import { mergeSettings, type SiteSettings } from './settings';
import type {
  ActiveCampaign, AdSlot, ArticleCard, ArticleFull, Category, Format, HomepageSection, Lang,
  MediaRef, MenuItem, PublicAuthor, StaticPage, Tag,
} from './types';

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Supabase query failed (${what}): ${error?.message ?? 'unknown error'}`);
}

// ---------------------------------------------------------------- settings

export const getSettings = cached(
  async (): Promise<SiteSettings> => {
    const db = publicClient();
    const { data, error } = await db.from('site_settings').select('key, value');
    if (error) fail('site_settings', error);
    const settings = mergeSettings(data ?? []);
    const mediaIds = [settings.logo.media_id, settings.default_og_media_id, settings.favicon_media_id].filter(Boolean) as string[];
    if (mediaIds.length) {
      const { data: media } = await db.from('media').select('id, storage_path').in('id', mediaIds);
      const byId = new Map((media ?? []).map((m) => [m.id as string, m.storage_path as string]));
      settings.logo = { ...settings.logo, path: settings.logo.media_id ? byId.get(settings.logo.media_id) ?? null : null };
      (settings as SiteSettings & { default_og_path?: string | null }).default_og_path = settings.default_og_media_id ? byId.get(settings.default_og_media_id) ?? null : null;
      (settings as SiteSettings & { favicon_path?: string | null }).favicon_path = settings.favicon_media_id ? byId.get(settings.favicon_media_id) ?? null : null;
    }
    return settings;
  },
  'settings',
  [TAGS.settings],
);

/** Content languages listed under an interface locale (content mixing setting). */
export function languagesFor(locale: Lang, settings: SiteSettings): Lang[] {
  if (locale === 'ar') return settings.content_mixing.ar_include_french_content ? ['ar', 'fr'] : ['ar'];
  return settings.content_mixing.fr_include_arabic_content ? ['fr', 'ar'] : ['fr'];
}

// ---------------------------------------------------------------- taxonomy

export const getCategories = cached(
  async (): Promise<Category[]> => {
    const { data, error } = await publicClient().from('categories').select('*').eq('is_active', true).order('position');
    if (error) fail('categories', error);
    return (data ?? []) as Category[];
  },
  'categories',
  [TAGS.taxonomy],
);

export const getFormats = cached(
  async (): Promise<Format[]> => {
    const { data, error } = await publicClient().from('article_formats').select('*').eq('is_active', true).order('position');
    if (error) fail('formats', error);
    return (data ?? []) as Format[];
  },
  'formats',
  [TAGS.taxonomy],
);

export const getTagBySlug = cached(
  async (slug: string): Promise<Tag | null> => {
    const { data, error } = await publicClient().from('tags').select('*').eq('slug', slug).maybeSingle();
    if (error) fail('tag', error);
    return (data as Tag) ?? null;
  },
  'tag-by-slug',
  [TAGS.taxonomy],
);

export const getTagsByIds = cached(
  async (ids: string[]): Promise<Tag[]> => {
    if (!ids.length) return [];
    const { data, error } = await publicClient().from('tags').select('*').in('id', ids);
    if (error) fail('tags', error);
    return (data ?? []) as Tag[];
  },
  'tags-by-ids',
  [TAGS.taxonomy],
);

export const getFeaturedTags = cached(
  async (): Promise<Tag[]> => {
    const { data, error } = await publicClient().from('tags').select('*').eq('is_featured', true).order('name_ar');
    if (error) fail('featured tags', error);
    return (data ?? []) as Tag[];
  },
  'featured-tags',
  [TAGS.taxonomy],
);

export const getMediaById = cached(
  async (id: string): Promise<MediaRef | null> => {
    const { data, error } = await publicClient().from('media').select('*').eq('id', id).maybeSingle();
    if (error) fail('media', error);
    if (!data) return null;
    return { ...data, path: data.storage_path } as MediaRef;
  },
  'media-by-id',
  [TAGS.articles, TAGS.taxonomy],
);

// ---------------------------------------------------------------- menus, pages, homepage

export const getMenu = cached(
  async (menu: MenuItem['menu']): Promise<MenuItem[]> => {
    const { data, error } = await publicClient().from('menu_items').select('*').eq('menu', menu).eq('is_active', true).order('position');
    if (error) fail('menu_items', error);
    return (data ?? []) as MenuItem[];
  },
  'menu',
  [TAGS.menus],
);

export const getPublishedPages = cached(
  async (locale: Lang): Promise<StaticPage[]> => {
    const { data, error } = await publicClient()
      .from('pages')
      .select('id, slug, language, title, status, show_in_footer, position, page_kind, seo_title, seo_description, translation_group_id, updated_at')
      .eq('language', locale)
      .eq('status', 'published')
      .order('position');
    if (error) fail('pages', error);
    return (data ?? []) as StaticPage[];
  },
  'pages-published',
  [TAGS.pages],
);

export const getPage = cached(
  async (locale: Lang, slug: string): Promise<StaticPage | null> => {
    const { data, error } = await publicClient()
      .from('pages').select('*').eq('language', locale).eq('slug', slug).eq('status', 'published').maybeSingle();
    if (error) fail('page', error);
    return (data as StaticPage) ?? null;
  },
  'page',
  [TAGS.pages],
);

export const getPageByKind = cached(
  async (locale: Lang, kind: StaticPage['page_kind']): Promise<StaticPage | null> => {
    const { data, error } = await publicClient()
      .from('pages').select('*').eq('language', locale).eq('page_kind', kind).eq('status', 'published')
      .order('position').limit(1).maybeSingle();
    if (error) fail('page by kind', error);
    return (data as StaticPage) ?? null;
  },
  'page-kind',
  [TAGS.pages],
);

export const getPageTranslation = cached(
  async (groupId: string, language: Lang): Promise<{ slug: string; page_kind: string } | null> => {
    const { data } = await publicClient()
      .from('pages').select('slug, page_kind').eq('translation_group_id', groupId).eq('language', language).eq('status', 'published').maybeSingle();
    return data ?? null;
  },
  'page-translation',
  [TAGS.pages],
);

export const getHomepageSections = cached(
  async (locale: Lang): Promise<HomepageSection[]> => {
    const { data, error } = await publicClient()
      .from('homepage_sections').select('*').in('locale', [locale, 'both']).eq('is_active', true).order('position');
    if (error) fail('homepage_sections', error);
    return (data ?? []) as HomepageSection[];
  },
  'homepage-sections',
  [TAGS.homepage],
);

export const getRedirect = cached(
  async (path: string): Promise<string | null> => {
    const { data } = await publicClient().from('redirects').select('to_path').eq('from_path', path).maybeSingle();
    return (data?.to_path as string) ?? null;
  },
  'redirect',
  [TAGS.redirects, TAGS.taxonomy, TAGS.pages, TAGS.authors],
);

// ---------------------------------------------------------------- articles

export interface CardFilter {
  langs: Lang[];
  categoryIds?: string[];
  /** Also match articles that list one of categoryIds as a secondary section. */
  includeExtra?: boolean;
  tagId?: string;
  formatId?: string;
  authorId?: string;
  featured?: boolean;
  opinion?: boolean;
  breaking?: boolean;
  excludeIds?: string[];
  since?: string;
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

async function queryCards(f: CardFilter): Promise<{ items: ArticleCard[]; total: number }> {
  let q = publicClient()
    .from('article_cards')
    .select('*', f.withCount ? { count: 'exact' } : undefined)
    .in('language', f.langs)
    .order('published_at', { ascending: false });
  if (f.categoryIds?.length) {
    const list = f.categoryIds.join(',');
    q = f.includeExtra ? q.or(`category_id.in.(${list}),extra_category_ids.ov.{${list}}`) : q.in('category_id', f.categoryIds);
  }
  if (f.tagId) q = q.contains('tag_ids', [f.tagId]);
  if (f.formatId) q = q.eq('format_id', f.formatId);
  if (f.authorId) q = q.contains('authors', JSON.stringify([{ id: f.authorId }]));
  if (f.featured) q = q.eq('is_featured', true);
  if (f.opinion) q = q.eq('format_is_opinion', true);
  if (f.breaking) q = q.eq('is_breaking', true).gt('breaking_until', new Date().toISOString());
  if (f.excludeIds?.length) q = q.not('id', 'in', `(${f.excludeIds.join(',')})`);
  if (f.since) q = q.gte('published_at', f.since);
  const limit = f.limit ?? 20;
  const offset = f.offset ?? 0;
  q = q.range(offset, offset + limit - 1);
  const { data, error, count } = await q;
  if (error) fail('article_cards', error);
  return { items: (data ?? []) as ArticleCard[], total: count ?? (data?.length ?? 0) };
}

export const listCards = cached(queryCards, 'cards', [TAGS.articles]);

export const getCardsByIds = cached(
  async (ids: string[]): Promise<ArticleCard[]> => {
    if (!ids.length) return [];
    const { data, error } = await publicClient().from('article_cards').select('*').in('id', ids);
    if (error) fail('cards by ids', error);
    const byId = new Map((data as ArticleCard[]).map((a) => [a.id, a]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as ArticleCard[];
  },
  'cards-by-ids',
  [TAGS.articles],
);

export const getArticle = cached(
  async (publicId: number): Promise<ArticleFull | null> => {
    const db = publicClient();
    const [{ data: card, error: e1 }, { data: body, error: e2 }] = await Promise.all([
      db.from('article_cards').select('*').eq('public_id', publicId).maybeSingle(),
      db.from('articles')
        .select('body_html, body_text, correction_note_ar, correction_note_fr, seo_title, seo_description, canonical_url, og_media_id, updated_at')
        .eq('public_id', publicId).maybeSingle(),
    ]);
    if (e1) fail('article card', e1);
    if (e2) fail('article body', e2);
    if (!card || !body) return null;
    const c = card as ArticleCard;
    const [tags, og] = await Promise.all([
      c.tag_ids.length ? db.from('tags').select('*').in('id', c.tag_ids).then((r) => (r.data ?? []) as Tag[]) : Promise.resolve([] as Tag[]),
      body.og_media_id ? db.from('media').select('*').eq('id', body.og_media_id).maybeSingle().then((r) => (r.data ? ({ ...r.data, path: r.data.storage_path } as MediaRef) : null)) : Promise.resolve(null),
    ]);
    return { ...c, ...body, og_media: og, tags } as ArticleFull;
  },
  'article',
  [TAGS.articles],
);

export const getTranslations = cached(
  async (groupId: string): Promise<{ public_id: number; language: Lang; slug: string | null }[]> => {
    const { data } = await publicClient().from('article_cards').select('public_id, language, slug').eq('translation_group_id', groupId);
    return (data ?? []) as { public_id: number; language: Lang; slug: string | null }[];
  },
  'translations',
  [TAGS.articles],
);

export const getMostReadIds = cached(
  async (windowDays: number, limit: number, categoryId: string | null, lang: Lang | null): Promise<string[]> => {
    const { data, error } = await publicClient().rpc('public_most_read', {
      p_window_days: windowDays, p_limit: limit, p_category_id: categoryId, p_language: lang,
    });
    if (error) return [];
    return ((data ?? []) as { article_id: string }[]).map((r) => r.article_id);
  },
  'most-read',
  [TAGS.stats, TAGS.articles],
  600,
);

export async function getMostRead(langs: Lang[], windowDays: number, limit: number, categoryId: string | null = null): Promise<ArticleCard[]> {
  const ids = await getMostReadIds(windowDays, limit * 2, categoryId, langs.length === 1 ? langs[0]! : null);
  const cards = (await getCardsByIds(ids)).filter((c) => langs.includes(c.language)).slice(0, limit);
  if (cards.length >= Math.min(3, limit)) return cards;
  // Not enough data yet: fall back to the latest articles.
  const { items } = await listCards({ langs, categoryIds: categoryId ? [categoryId] : undefined, includeExtra: false, limit });
  return items;
}

export const searchArticles = cached(
  async (q: string, lang: Lang | null, categoryId: string | null, since: string | null, limit: number, offset: number) => {
    const { data, error } = await publicClient().rpc('search_articles', {
      q, lang, limit, offset, category: categoryId, since,
    });
    if (error) fail('search', error);
    const rows = (data ?? []) as { id: string; total: number }[];
    const items = await getCardsByIds(rows.map((r) => r.id));
    return { items, total: rows[0]?.total ?? 0 };
  },
  'search',
  [TAGS.articles],
);

// ---------------------------------------------------------------- authors

export const getAuthorBySlug = cached(
  async (slug: string): Promise<PublicAuthor | null> => {
    const { data, error } = await publicClient().from('public_authors').select('*').eq('slug', slug).maybeSingle();
    if (error) fail('author', error);
    return (data as PublicAuthor) ?? null;
  },
  'author',
  [TAGS.authors],
);

// ---------------------------------------------------------------- ads

export const getAdData = cached(
  async (): Promise<{ slots: AdSlot[]; campaigns: ActiveCampaign[] }> => {
    const db = publicClient();
    const [slots, campaigns] = await Promise.all([
      db.from('public_ad_slots').select('*'),
      db.from('active_ad_campaigns').select('*'),
    ]);
    return { slots: (slots.data ?? []) as AdSlot[], campaigns: (campaigns.data ?? []) as ActiveCampaign[] };
  },
  'ads',
  [TAGS.ads],
);

export const getMediaKitNumbers = cached(
  async (): Promise<Record<string, unknown>> => {
    const { data, error } = await publicClient().rpc('media_kit_public');
    if (error) return {};
    return (data ?? {}) as Record<string, unknown>;
  },
  'media-kit-numbers',
  [TAGS.stats, TAGS.settings],
  3600,
);
