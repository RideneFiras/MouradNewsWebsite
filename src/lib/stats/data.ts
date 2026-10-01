import 'server-only';
import { sessionClient } from '@/lib/supabase/server';

// Read-only wrappers around the stats RPCs (migration 11). Every RPC checks the caller's
// role in the database; these helpers only shape the results. Nothing here writes.

export interface Overview {
  pageviews: number;
  visitors_daily_sum: number;
  visitors_monthly: number | null;
  single_day: boolean;
  engaged_avg_seconds: number | null;
  read_rate: number | null;
  articles_published: number;
}
export interface SeriesPoint {
  bucket: string;
  pageviews: number;
  visitors: number;
  engaged_avg_seconds: number | null;
}
export interface ArticleRow {
  article_id: string;
  public_id: number;
  title: string;
  language: 'ar' | 'fr';
  published_at: string | null;
  category_id: string | null;
  author_names: string | null;
  pageviews: number;
  visitors: number;
  engaged_avg_seconds: number | null;
  read_rate: number | null;
  main_source: string | null;
}
export interface BreakdownRow {
  value: string;
  pageviews: number;
  visitors: number;
  share: number | null;
}
export interface AuthorRow {
  profile_id: string;
  display_name_ar: string;
  display_name_fr: string | null;
  articles_published: number;
  pageviews: number;
  avg_views_per_article: number | null;
  engaged_avg_seconds: number | null;
}
export interface CategoryRow {
  category_id: string;
  parent_id: string | null;
  name_ar: string;
  name_fr: string | null;
  pageviews: number;
  articles_published: number;
  avg_views_per_article: number | null;
}
export interface ArticleDetail {
  daily: { date: string; pageviews: number; visitors: number }[];
  pageviews: number;
  visitors_daily_sum: number;
  engaged_avg_seconds: number | null;
  read_rate: number | null;
  sources: Record<string, number> | null;
  countries: Record<string, number> | null;
  devices: Record<string, number> | null;
  referrers: Record<string, number> | null;
}
export interface Realtime {
  pageviews: number;
  top: { article_id: string; public_id: number; title: string; language: 'ar' | 'fr'; pageviews: number }[];
}
export interface SocialRow {
  id: string;
  platform: 'facebook' | 'instagram' | 'youtube' | 'tiktok';
  recorded_for: string;
  followers: number | null;
  reach_28d: number | null;
  engagement_28d: number | null;
  note: string | null;
  entered_by: string | null;
  created_at: string;
  profiles?: { display_name_ar: string } | null;
}

const num = (v: unknown) => (v == null ? 0 : Number(v));
const numOrNull = (v: unknown) => (v == null ? null : Number(v));

function rows<T>(res: { data: unknown; error: { message: string } | null }, label: string): T[] {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return (res.data ?? []) as T[];
}

export async function tunisToday(): Promise<string> {
  const db = await sessionClient();
  const { data } = await db.rpc('tunis_today');
  return (data as string | null) ?? new Date().toISOString().slice(0, 10);
}

export async function getOverview(from: string, to: string, locale?: 'ar' | 'fr' | null): Promise<Overview> {
  const db = await sessionClient();
  const { data, error } = await db.rpc('stats_overview', { p_from: from, p_to: to, p_locale: locale ?? null });
  if (error) throw new Error(`stats_overview: ${error.message}`);
  const o = (data ?? {}) as Record<string, unknown>;
  return {
    pageviews: num(o.pageviews),
    visitors_daily_sum: num(o.visitors_daily_sum),
    visitors_monthly: numOrNull(o.visitors_monthly),
    single_day: Boolean(o.single_day),
    engaged_avg_seconds: numOrNull(o.engaged_avg_seconds),
    read_rate: numOrNull(o.read_rate),
    articles_published: num(o.articles_published),
  };
}

export async function getMySummary(from: string, to: string): Promise<Overview> {
  const db = await sessionClient();
  const { data, error } = await db.rpc('my_summary', { p_from: from, p_to: to });
  if (error) throw new Error(`my_summary: ${error.message}`);
  const o = (data ?? {}) as Record<string, unknown>;
  return {
    pageviews: num(o.pageviews),
    visitors_daily_sum: num(o.visitors_daily_sum),
    visitors_monthly: null,
    single_day: from === to,
    engaged_avg_seconds: numOrNull(o.engaged_avg_seconds),
    read_rate: numOrNull(o.read_rate),
    articles_published: num(o.articles_published),
  };
}

export async function getTimeseries(from: string, to: string): Promise<SeriesPoint[]> {
  const db = await sessionClient();
  const r = rows<SeriesPoint>(await db.rpc('stats_timeseries', { p_from: from, p_to: to, p_metric: 'pageviews', p_granularity: 'day' }), 'stats_timeseries');
  return r.map((p) => ({ bucket: p.bucket, pageviews: num(p.pageviews), visitors: num(p.visitors), engaged_avg_seconds: numOrNull(p.engaged_avg_seconds) }));
}

const normArticle = (a: ArticleRow): ArticleRow => ({
  ...a,
  pageviews: num(a.pageviews),
  visitors: num(a.visitors),
  engaged_avg_seconds: numOrNull(a.engaged_avg_seconds),
  read_rate: numOrNull(a.read_rate),
});

export async function getTopArticles(from: string, to: string, limit = 10, opts: { categoryId?: string; authorId?: string } = {}): Promise<ArticleRow[]> {
  const db = await sessionClient();
  const res = await db.rpc('stats_top_articles', { p_from: from, p_to: to, p_limit: limit, p_category_id: opts.categoryId ?? null, p_author_id: opts.authorId ?? null });
  return rows<ArticleRow>(res, 'stats_top_articles').map(normArticle);
}

export async function getArticleDetail(articleId: string, from: string, to: string): Promise<ArticleDetail> {
  const db = await sessionClient();
  const { data, error } = await db.rpc('stats_article_detail', { p_article_id: articleId, p_from: from, p_to: to });
  if (error) throw new Error(`stats_article_detail: ${error.message}`);
  const d = (data ?? {}) as ArticleDetail;
  return {
    ...d,
    daily: (d.daily ?? []).map((p) => ({ date: String(p.date).slice(0, 10), pageviews: num(p.pageviews), visitors: num(p.visitors) })),
    pageviews: num(d.pageviews),
    visitors_daily_sum: num(d.visitors_daily_sum),
    engaged_avg_seconds: numOrNull(d.engaged_avg_seconds),
    read_rate: numOrNull(d.read_rate),
  };
}

export type Dimension = 'locale' | 'source' | 'country' | 'device' | 'category' | 'referrer_host' | 'utm_campaign';

export async function getBreakdown(from: string, to: string, dimension: Dimension, limit = 20): Promise<BreakdownRow[]> {
  const db = await sessionClient();
  const r = rows<BreakdownRow>(await db.rpc('stats_breakdown', { p_from: from, p_to: to, p_dimension: dimension, p_limit: limit }), 'stats_breakdown');
  return r.map((b) => ({ value: b.value, pageviews: num(b.pageviews), visitors: num(b.visitors), share: numOrNull(b.share) }));
}

export async function getAuthors(from: string, to: string): Promise<AuthorRow[]> {
  const db = await sessionClient();
  const r = rows<AuthorRow>(await db.rpc('stats_authors', { p_from: from, p_to: to }), 'stats_authors');
  return r.map((a) => ({ ...a, articles_published: num(a.articles_published), pageviews: num(a.pageviews), avg_views_per_article: numOrNull(a.avg_views_per_article), engaged_avg_seconds: numOrNull(a.engaged_avg_seconds) }));
}

export async function getCategories(from: string, to: string): Promise<CategoryRow[]> {
  const db = await sessionClient();
  const r = rows<CategoryRow>(await db.rpc('stats_categories', { p_from: from, p_to: to }), 'stats_categories');
  return r.map((c) => ({ ...c, pageviews: num(c.pageviews), articles_published: num(c.articles_published), avg_views_per_article: numOrNull(c.avg_views_per_article) }));
}

export async function getRealtime(minutes = 30): Promise<Realtime> {
  const db = await sessionClient();
  const { data, error } = await db.rpc('stats_realtime', { p_minutes: minutes });
  if (error) throw new Error(`stats_realtime: ${error.message}`);
  const r = (data ?? {}) as Realtime;
  return { pageviews: num(r.pageviews), top: (r.top ?? []).map((t) => ({ ...t, pageviews: num(t.pageviews) })) };
}

export async function getSocial(limit = 50): Promise<SocialRow[]> {
  const db = await sessionClient();
  const res = await db
    .from('social_stats')
    .select('id, platform, recorded_for, followers, reach_28d, engagement_28d, note, entered_by, created_at, profiles:entered_by(display_name_ar)')
    .order('recorded_for', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return rows<SocialRow>(res, 'social_stats');
}

/** Country name in the interface language ("TN" → «تونس»); XX = unknown. */
export function countryName(code: string, locale: 'ar' | 'fr', unknown: string): string {
  if (!code || code === 'XX') return unknown;
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
