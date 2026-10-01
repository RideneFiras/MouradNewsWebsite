import 'server-only';
import { adminClient } from '@/lib/supabase/admin';
import type { ArticleCard, ArticleFull, MediaRef, Tag } from './types';

/** Any article (draft included) for a signed preview link. Service role, server only. */
export async function getArticleForPreview(id: string): Promise<ArticleFull | null> {
  const db = adminClient();
  const [{ data: card }, { data: body }] = await Promise.all([
    db.from('article_cards_all').select('*').eq('id', id).maybeSingle(),
    db.from('articles').select('body_html, body_text, correction_note_ar, correction_note_fr, seo_title, seo_description, canonical_url, og_media_id, updated_at, published_at').eq('id', id).maybeSingle(),
  ]);
  if (!card || !body) return null;
  const c = card as ArticleCard;
  const { data: tags } = c.tag_ids.length ? await db.from('tags').select('*').in('id', c.tag_ids) : { data: [] };
  return { ...c, ...body, published_at: body.published_at ?? new Date().toISOString(), og_media: null as MediaRef | null, tags: (tags ?? []) as Tag[] } as ArticleFull;
}
