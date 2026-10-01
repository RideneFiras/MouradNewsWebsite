-- El Borj — 17 read models for the public site
-- One row per article with everything a story unit needs (section, genre, cover,
-- bylines), so a page is built with very few database round trips (the Workers
-- free plan allows 50 sub-requests per request).

create or replace function public.media_json(m public.media)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when m.id is null then null else jsonb_build_object(
    'id', m.id, 'path', m.storage_path, 'variants', m.variants, 'width', m.width, 'height', m.height,
    'focal_x', m.focal_x, 'focal_y', m.focal_y, 'alt_ar', m.alt_ar, 'alt_fr', m.alt_fr,
    'caption_ar', m.caption_ar, 'caption_fr', m.caption_fr, 'credit', m.credit, 'mime_type', m.mime_type) end;
$$;

-- One definition, two views:
-- * article_cards_all: SECURITY INVOKER, no status filter (staff, RLS applies).
-- * article_cards: published articles whose time has come; runs with the view
--   owner's rights so bylines show without exposing the profiles table to anon.
do $do$
declare
  q text := $q$
select
  a.id, a.public_id, a.language, a.translation_group_id, a.status, a.kicker_override, a.title, a.subtitle,
  a.slug, a.excerpt, a.category_id, a.format_id, a.location, a.byline_override,
  a.is_breaking, a.breaking_until, a.is_featured, a.is_sponsored, a.sponsor_name, a.allow_ads,
  a.reading_minutes, a.published_at, a.first_published_at, a.content_updated_at, a.is_demo,
  a.cover_caption, a.cover_credit, a.cover_alt,
  c.slug as category_slug, c.name_ar as category_name_ar, c.name_fr as category_name_fr,
  c.color as category_color, c.parent_id as category_parent_id,
  f.slug as format_slug, f.name_ar as format_name_ar, f.name_fr as format_name_fr,
  coalesce(f.show_as_kicker, false) as format_show_as_kicker, coalesce(f.is_opinion, false) as format_is_opinion,
  (select public.media_json(m) from public.media m where m.id = a.cover_media_id) as cover,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'slug', p.slug, 'name_ar', p.display_name_ar, 'name_fr', p.display_name_fr,
      'title_ar', p.title_ar, 'title_fr', p.title_fr,
      'linkable', p.is_active and p.show_public_page,
      'avatar', (select public.media_json(m) from public.media m where m.id = p.avatar_media_id)
    ) order by aa.position, p.display_name_ar)
    from public.article_authors aa join public.profiles p on p.id = aa.profile_id
    where aa.article_id = a.id), '[]'::jsonb) as authors,
  coalesce((select array_agg(t.tag_id) from public.article_tags t where t.article_id = a.id), '{}'::uuid[]) as tag_ids,
  coalesce((select array_agg(x.category_id) from public.article_categories x where x.article_id = a.id), '{}'::uuid[]) as extra_category_ids
from public.articles a
join public.categories c on c.id = a.category_id
left join public.article_formats f on f.id = a.format_id
$q$;
begin
  execute 'create view public.article_cards_all with (security_invoker = true) as ' || q;
  execute 'create view public.article_cards as ' || q
       || ' where a.status = ''published'' and a.published_at <= now()';
end
$do$;

-- Author page data with the portrait.
create or replace view public.public_authors as
  select p.id, p.slug, p.display_name_ar, p.display_name_fr, p.title_ar, p.title_fr, p.bio_ar, p.bio_fr,
         p.avatar_media_id, p.email_public, p.social, p.is_demo,
         (select public.media_json(m) from public.media m where m.id = p.avatar_media_id) as avatar
  from public.profiles p
  where p.is_active and p.show_public_page;

revoke all on public.article_cards, public.article_cards_all, public.public_authors from anon, authenticated;
grant select on public.article_cards, public.public_authors to anon, authenticated;
grant select on public.article_cards_all to authenticated;
