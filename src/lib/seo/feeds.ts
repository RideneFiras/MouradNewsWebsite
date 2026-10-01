import 'server-only';
import { publicClient } from '@/lib/supabase/public';
import { cached, TAGS } from '@/lib/data/cache';
import type { ArticleCard } from '@/lib/data/types';

// Read-only data for sitemaps and feeds. PostgREST returns at most 1000 rows per request,
// so whole-site lists are paged.

async function all<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export interface ArticleStub { public_id: number; slug: string; language: 'ar' | 'fr'; published_at: string; content_updated_at: string | null; translation_group_id: string | null; tag_ids: string[] | null }

/** Every published article (light columns), newest first. */
export const allArticleStubs = cached(
  () => all<ArticleStub>((f, t) => publicClient().from('article_cards').select('public_id, slug, language, published_at, content_updated_at, translation_group_id, tag_ids').order('published_at', { ascending: false }).range(f, t)),
  'feeds-article-stubs',
  [TAGS.articles],
  600,
);

export const recentCards = cached(
  async (language: 'ar' | 'fr', categoryIds: string[] | null, limit: number): Promise<ArticleCard[]> => {
    let q = publicClient().from('article_cards').select('*').eq('language', language).order('published_at', { ascending: false }).limit(limit);
    if (categoryIds) q = q.in('category_id', categoryIds);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as ArticleCard[];
  },
  'feeds-recent-cards',
  [TAGS.articles],
  300,
);

export const sinceCards = cached(
  async (sinceIso: string): Promise<ArticleCard[]> => {
    const { data, error } = await publicClient().from('article_cards').select('*').gte('first_published_at', sinceIso).order('published_at', { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []) as ArticleCard[];
  },
  'feeds-since-cards',
  [TAGS.articles],
  300,
);

export const allTags = cached(
  async () => {
    const { data } = await publicClient().from('tags').select('id, slug, updated_at').limit(5000);
    return (data ?? []) as { id: string; slug: string; updated_at: string }[];
  },
  'feeds-tags',
  [TAGS.taxonomy],
  600,
);

export const allAuthors = cached(
  async () => {
    const { data } = await publicClient().from('public_authors').select('slug').limit(1000);
    return (data ?? []) as { slug: string }[];
  },
  'feeds-authors',
  [TAGS.authors],
  600,
);
