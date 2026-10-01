'use server';
import { z } from 'zod';
import { renderDoc, docToText, type PMNode } from '@/lib/content/render';
import { sanitizeArticleHtml } from '@/lib/content/sanitize';
import { mediaUrl } from '@/lib/env';
import { sessionClient } from '@/lib/supabase/server';
import { ActionError, assertStaff, check, isEditor, one, run, type ActionResult } from '@/lib/auth/staff';
import { expireTags } from '@/lib/cache/revalidate';
import { articleHref } from '@/lib/public/links';
import { slugify } from '@/lib/slug';
import { previewToken } from './preview-token';
import { ArticleInput, type ArticleInputT } from './article-schema';

const uuid = z.string().uuid();

export type Intent = 'autosave' | 'save' | 'submit' | 'publish' | 'schedule' | 'send_back' | 'unpublish' | 'archive';
const EDITOR_INTENTS: Intent[] = ['publish', 'schedule', 'send_back', 'unpublish', 'archive'];

export interface SaveResult {
  id: string;
  public_id: number;
  status: string;
  slug: string | null;
  savedAt: string;
  url: string;
  previewUrl: string;
}

function validateForPublish(d: z.output<typeof ArticleInput>) {
  if (!d.title) throw new ActionError('err_title', 'title');
  if (!d.category_id) throw new ActionError('err_category', 'category_id');
  if (!d.author_ids.length && !d.byline_override) throw new ActionError('err_authors', 'author_ids');
  if (d.cover_media_id && !d.cover_alt) throw new ActionError('err_alt', 'cover_alt');
  if (d.is_sponsored && !d.sponsor_name) throw new ActionError('err_sponsor', 'sponsor_name');
}

export async function saveArticle(raw: ArticleInputT, intent: Intent, opts: { scheduledFor?: string; reviewNote?: string } = {}): Promise<ActionResult<SaveResult>> {
  return run(async () => {
    const staff = await assertStaff();
    if (EDITOR_INTENTS.includes(intent) && !isEditor(staff)) throw new ActionError('not_allowed');
    const d = ArticleInput.parse(raw);
    const db = await sessionClient();

    const existing = d.id
      ? check(await db.from('articles').select('id, status, published_at, title, body_json, created_by').eq('id', d.id).maybeSingle())
      : null;
    if (d.id && !existing) throw new ActionError('not_allowed');

    if (['publish', 'schedule', 'submit'].includes(intent)) validateForPublish(d);
    if (!d.title && intent !== 'autosave') throw new ActionError('err_title', 'title');
    if (!d.category_id && intent !== 'autosave') throw new ActionError('err_category', 'category_id');

    const doc = (d.body_json ?? { type: 'doc', content: [] }) as PMNode;
    const body_html = sanitizeArticleHtml(renderDoc(doc, { mediaUrl: (p) => mediaUrl(p), locale: d.language }));
    const body_text = docToText(doc);

    let status = existing?.status ?? 'draft';
    const now = new Date();
    const patch: Record<string, unknown> = {
      language: d.language, kicker_override: d.kicker_override, title: d.title || (existing?.title ?? '…'), subtitle: d.subtitle,
      body_json: doc, body_html, body_text, location: d.location, format_id: d.format_id ?? null,
      byline_override: d.byline_override, cover_media_id: d.cover_media_id ?? null, cover_caption: d.cover_caption,
      cover_credit: d.cover_credit, cover_alt: d.cover_alt, excerpt: d.excerpt, seo_title: d.seo_title,
      seo_description: d.seo_description, correction_note_ar: d.correction_note_ar, correction_note_fr: d.correction_note_fr,
      allow_ads: d.is_sponsored ? false : d.allow_ads,
    };
    if (d.category_id) patch.category_id = d.category_id;
    if (d.translation_group_id) patch.translation_group_id = d.translation_group_id;
    if (isEditor(staff)) {
      Object.assign(patch, {
        is_featured: d.is_featured,
        is_breaking: d.is_breaking,
        breaking_until: d.is_breaking ? new Date(now.getTime() + d.breaking_hours * 3600000).toISOString() : null,
        is_sponsored: d.is_sponsored,
        sponsor_name: d.is_sponsored ? d.sponsor_name : null,
      });
      if (d.significant_update && existing?.status === 'published') patch.content_updated_at = now.toISOString();
    }

    switch (intent) {
      case 'submit':
        status = 'in_review';
        patch.review_note = null;
        break;
      case 'publish':
        status = 'published';
        patch.published_at = existing?.status === 'published' ? existing.published_at : now.toISOString();
        patch.scheduled_for = null;
        break;
      case 'schedule': {
        const at = opts.scheduledFor ? new Date(opts.scheduledFor) : null;
        if (!at || Number.isNaN(at.getTime()) || at.getTime() < now.getTime() + 60000) throw new ActionError('err_schedule', 'scheduled_for');
        status = 'scheduled';
        patch.scheduled_for = at.toISOString();
        patch.published_at = null;
        break;
      }
      case 'send_back':
        if (!opts.reviewNote?.trim()) throw new ActionError('err_note', 'review_note');
        status = 'draft';
        patch.review_note = opts.reviewNote.trim().slice(0, 2000);
        break;
      case 'unpublish':
        status = 'draft';
        patch.published_at = null;
        break;
      case 'archive':
        status = 'archived';
        break;
      default:
        break;
    }
    patch.status = status;

    let row: { id: string; public_id: number; status: string; slug: string | null; language: 'ar' | 'fr'; updated_at: string };
    if (existing) {
      row = one(await db.from('articles').update(patch).eq('id', existing.id).select('id, public_id, status, slug, language, updated_at').single());
    } else {
      row = one(await db.from('articles').insert({ ...patch, created_by: staff.id, category_id: d.category_id }).select('id, public_id, status, slug, language, updated_at').single());
    }

    // Join tables (replace).
    const authors = d.author_ids.length ? d.author_ids : d.byline_override ? [] : [staff.id];
    check(await db.from('article_authors').delete().eq('article_id', row.id));
    if (authors.length) check(await db.from('article_authors').insert(authors.map((profile_id, position) => ({ article_id: row.id, profile_id, position }))));
    check(await db.from('article_tags').delete().eq('article_id', row.id));
    if (d.tag_ids.length) check(await db.from('article_tags').insert(d.tag_ids.map((tag_id) => ({ article_id: row.id, tag_id }))));
    if (isEditor(staff) || !existing || ['draft', 'in_review'].includes(existing.status)) {
      check(await db.from('article_categories').delete().eq('article_id', row.id));
      const extra = d.extra_category_ids.filter((c) => c !== d.category_id);
      if (extra.length) check(await db.from('article_categories').insert(extra.map((category_id) => ({ article_id: row.id, category_id }))));
    }

    // Revision: every explicit save; autosaves at most every 5 minutes.
    let addRevision = intent !== 'autosave';
    if (!addRevision) {
      const { data: last } = await db.from('article_revisions').select('created_at').eq('article_id', row.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      addRevision = !last || Date.now() - Date.parse(last.created_at) > 5 * 60000;
    }
    if (addRevision) await db.from('article_revisions').insert({ article_id: row.id, title: patch.title as string, subtitle: d.subtitle, body_json: doc, edited_by: staff.id });

    if (status === 'published' || existing?.status === 'published' || status === 'scheduled') expireTags(['articles', 'authors', 'stats']);

    const tok = await previewToken('article', row.id);
    return {
      id: row.id, public_id: row.public_id, status: row.status, slug: row.slug, savedAt: row.updated_at,
      url: articleHref({ public_id: row.public_id, slug: row.slug, language: row.language }),
      previewUrl: `/${row.language}/preview/article/${row.id}?t=${tok.t}&e=${tok.e}`,
    };
  });
}

export async function deleteDraft(id: string): Promise<ActionResult> {
  return run(async () => {
    await assertStaff(['editor', 'admin']);
    const db = await sessionClient();
    const res = check(await db.from('articles').delete().eq('id', id).select('id')) ?? [];
    if (!res.length) throw new ActionError('not_allowed');
  });
}

export async function listRevisions(articleId: string) {
  return run(async () => {
    await assertStaff();
    const db = await sessionClient();
    return check(
      await db.from('article_revisions').select('id, title, created_at, edited_by, profiles:edited_by(display_name_ar, display_name_fr)')
        .eq('article_id', articleId).order('created_at', { ascending: false }).limit(30),
    ) as unknown as { id: string; title: string; created_at: string; profiles: { display_name_ar: string; display_name_fr: string | null } | null }[];
  });
}

export async function getRevision(id: string) {
  return run(async () => {
    await assertStaff();
    const db = await sessionClient();
    return one(await db.from('article_revisions').select('id, title, subtitle, body_json').eq('id', id).single());
  });
}

/** Copy as a new draft (same language) or as a linked translation draft in the other language. */
export async function copyArticle(id: string, mode: 'duplicate' | 'translate'): Promise<ActionResult<{ id: string; language: string }>> {
  return run(async () => {
    const staff = await assertStaff();
    const db = await sessionClient();
    const a = one(await db.from('articles').select('*').eq('id', id).single());
    let group = a.translation_group_id as string | null;
    if (mode === 'translate' && !group) {
      group = crypto.randomUUID();
      if (isEditor(staff) || a.created_by === staff.id) await db.from('articles').update({ translation_group_id: group }).eq('id', id);
    }
    const language = mode === 'translate' ? (a.language === 'ar' ? 'fr' : 'ar') : a.language;
    const copy = one(
      await db.from('articles').insert({
        language, translation_group_id: mode === 'translate' ? group : null, status: 'draft',
        title: a.title, subtitle: mode === 'translate' ? null : a.subtitle,
        body_json: mode === 'translate' ? null : a.body_json, body_html: mode === 'translate' ? null : a.body_html, body_text: mode === 'translate' ? null : a.body_text,
        category_id: a.category_id, format_id: a.format_id, location: a.location, cover_media_id: a.cover_media_id,
        cover_credit: a.cover_credit, created_by: staff.id,
      }).select('id, language').single(),
    );
    const [{ data: tags }, { data: cats }] = await Promise.all([
      db.from('article_tags').select('tag_id').eq('article_id', id),
      db.from('article_categories').select('category_id').eq('article_id', id),
    ]);
    if (tags?.length) await db.from('article_tags').insert(tags.map((t) => ({ article_id: copy.id, tag_id: t.tag_id })));
    if (cats?.length) await db.from('article_categories').insert(cats.map((c) => ({ article_id: copy.id, category_id: c.category_id })));
    await db.from('article_authors').insert({ article_id: copy.id, profile_id: staff.id, position: 0 });
    return copy as { id: string; language: string };
  });
}

export async function bulkArticles(ids: string[], action: 'move' | 'archive' | 'tag', value?: string): Promise<ActionResult<number>> {
  return run(async () => {
    await assertStaff(['editor', 'admin']);
    const list = z.array(uuid).min(1).max(200).parse(ids);
    const db = await sessionClient();
    if (action === 'move') {
      const cat = uuid.parse(value);
      check(await db.from('articles').update({ category_id: cat }).in('id', list));
    } else if (action === 'archive') {
      check(await db.from('articles').update({ status: 'archived' }).in('id', list));
    } else {
      const tag = uuid.parse(value);
      check(await db.from('article_tags').upsert(list.map((article_id) => ({ article_id, tag_id: tag })), { ignoreDuplicates: true }));
    }
    expireTags(['articles']);
    return list.length;
  });
}

export async function createTag(name: string, kind: string): Promise<ActionResult<{ id: string; name_ar: string; name_fr: string | null; kind: string; slug: string }>> {
  return run(async () => {
    await assertStaff();
    const n = z.string().trim().min(1).max(120).parse(name);
    const k = z.enum(['topic', 'place', 'person', 'club', 'competition', 'event']).parse(kind);
    const db = await sessionClient();
    const base = slugify(n) || `tag-${Date.now().toString(36)}`;
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data } = await db.from('tags').select('id').eq('slug', slug).maybeSingle();
      if (!data) break;
      slug = `${base}-${i}`;
    }
    const isLatin = /^[\x20-\x7EÀ-ÿ’']+$/.test(n);
    const row = one(await db.from('tags').insert({ name_ar: n, name_fr: isLatin ? n : null, kind: k, slug }).select('id, name_ar, name_fr, kind, slug').single());
    expireTags(['taxonomy']);
    return row;
  });
}

export async function searchArticlesForLink(q: string) {
  return run(async () => {
    await assertStaff();
    const db = await sessionClient();
    const term = z.string().trim().max(100).parse(q);
    let query = db.from('articles').select('id, public_id, title, language, slug').eq('status', 'published').order('published_at', { ascending: false }).limit(8);
    if (term) query = /^\d+$/.test(term) ? query.eq('public_id', Number(term)) : query.ilike('title', `%${term.replace(/[%_]/g, '')}%`);
    return check(await query) as { id: string; public_id: number; title: string; language: 'ar' | 'fr'; slug: string | null }[];
  });
}
