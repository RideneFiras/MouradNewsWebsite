import 'server-only';
import { notFound } from 'next/navigation';
import { sessionClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import { siteUrl } from '@/lib/env';
import type { Staff } from '@/lib/auth/staff';
import type { EditorArticle, EditorOptions } from '@/components/admin/editor/types';

export async function loadEditor(staff: Staff, locale: 'ar' | 'fr', id: string | null): Promise<{ article: EditorArticle; options: EditorOptions }> {
  const db = await sessionClient();
  const settings = await getSettings();
  const [cats, formats, tags, people] = await Promise.all([
    db.from('categories').select('id, parent_id, name_ar, name_fr, is_active, position').order('position'),
    db.from('article_formats').select('id, name_ar, name_fr').eq('is_active', true).order('position'),
    db.from('tags').select('id, name_ar, name_fr, kind, slug').order('name_ar'),
    db.from('profiles').select('id, display_name_ar, display_name_fr').eq('is_active', true).order('display_name_ar'),
  ]);
  const categories = (cats.data ?? []) as EditorOptions['categories'];
  const firstTop = categories.find((c) => !c.parent_id && c.is_active);

  let article: EditorArticle;
  let translations: EditorOptions['translations'] = [];
  if (id) {
    const { data: a } = await db.from('articles').select('*').eq('id', id).maybeSingle();
    if (!a) notFound();
    const [au, tg, ec, cover] = await Promise.all([
      db.from('article_authors').select('profile_id, position').eq('article_id', id).order('position'),
      db.from('article_tags').select('tag_id').eq('article_id', id),
      db.from('article_categories').select('category_id').eq('article_id', id),
      a.cover_media_id ? db.from('media').select('*').eq('id', a.cover_media_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (a.translation_group_id) {
      const { data: tr } = await db.from('articles').select('id, language, title, status').eq('translation_group_id', a.translation_group_id).neq('id', id);
      translations = (tr ?? []) as EditorOptions['translations'];
    }
    const hours = a.breaking_until ? Math.max(1, Math.round((Date.parse(a.breaking_until) - Date.now()) / 3600000)) : settings.breaking.default_hours;
    article = {
      id: a.id, public_id: a.public_id, status: a.status, language: a.language, kicker_override: a.kicker_override ?? '', title: a.title ?? '',
      subtitle: a.subtitle ?? '', body_json: a.body_json, location: a.location ?? '', category_id: a.category_id,
      extra_category_ids: (ec.data ?? []).map((x) => x.category_id), format_id: a.format_id ?? '', tag_ids: (tg.data ?? []).map((x) => x.tag_id),
      author_ids: (au.data ?? []).map((x) => x.profile_id), byline_override: a.byline_override ?? '', cover_media_id: a.cover_media_id,
      cover: cover.data ? { ...cover.data, focal_x: Number(cover.data.focal_x), focal_y: Number(cover.data.focal_y) } : null,
      cover_caption: a.cover_caption ?? '', cover_credit: a.cover_credit ?? '', cover_alt: a.cover_alt ?? '', excerpt: a.excerpt ?? '',
      is_featured: a.is_featured, is_breaking: a.is_breaking, breaking_hours: Math.min(72, hours), is_sponsored: a.is_sponsored,
      sponsor_name: a.sponsor_name ?? '', allow_ads: a.allow_ads, seo_title: a.seo_title ?? '', seo_description: a.seo_description ?? '',
      correction_note_ar: a.correction_note_ar ?? '', correction_note_fr: a.correction_note_fr ?? '', significant_update: false,
      translation_group_id: a.translation_group_id, review_note: a.review_note, scheduled_for: a.scheduled_for, slug: a.slug,
      updated_at: a.updated_at, created_by: a.created_by,
    };
  } else {
    article = {
      id: null, public_id: null, status: 'draft', language: locale, kicker_override: '', title: '', subtitle: '', body_json: null, location: '',
      category_id: firstTop?.id ?? '', extra_category_ids: [], format_id: '', tag_ids: [], author_ids: [staff.id], byline_override: '',
      cover_media_id: null, cover: null, cover_caption: '', cover_credit: '', cover_alt: '', excerpt: '', is_featured: false, is_breaking: false,
      breaking_hours: settings.breaking.default_hours, is_sponsored: false, sponsor_name: '', allow_ads: true, seo_title: '', seo_description: '',
      correction_note_ar: '', correction_note_fr: '', significant_update: false, translation_group_id: null, review_note: null, scheduled_for: null,
      slug: null, updated_at: null, created_by: staff.id,
    };
  }
  const placeTags = ((tags.data ?? []) as { name_ar: string; name_fr: string | null; kind: string }[]).filter((x) => x.kind === 'place');
  return {
    article,
    options: {
      categories, formats: (formats.data ?? []) as EditorOptions['formats'], tags: (tags.data ?? []) as EditorOptions['tags'],
      people: ((people.data ?? []) as { id: string; display_name_ar: string; display_name_fr: string | null }[]).map((p) => ({ id: p.id, name: (locale === 'fr' ? p.display_name_fr : null) || p.display_name_ar })),
      places: placeTags.flatMap((p) => [p.name_ar, p.name_fr].filter(Boolean) as string[]),
      translations, breakingHours: settings.breaking.default_hours, siteUrl: siteUrl(), siteName: pick(settings.site_name, locale),
    },
  };
}
