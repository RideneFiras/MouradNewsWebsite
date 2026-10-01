-- El Borj — 02 enums and helper functions

create type public.app_role as enum ('admin', 'editor', 'author');
create type public.content_language as enum ('ar', 'fr');
create type public.article_status as enum ('draft', 'in_review', 'scheduled', 'published', 'archived');
create type public.tag_kind as enum ('topic', 'place', 'person', 'club', 'competition', 'event');
create type public.ad_mode as enum ('off', 'adsense', 'direct', 'house');
create type public.homepage_section_type as enum (
  'lead', 'breaking_ticker', 'latest_list', 'category_block', 'editor_picks',
  'most_read', 'opinion', 'format_block', 'tag_block', 'ad_slot', 'text_block'
);
create type public.traffic_source as enum (
  'direct', 'facebook', 'instagram', 'whatsapp', 'x', 'google', 'other_search',
  'newsletter', 'internal', 'referral', 'other_social'
);
create type public.device_type as enum ('mobile', 'tablet', 'desktop', 'other');

-- Shared updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- unaccent() is only STABLE (it depends on a dictionary lookup). Wrapping it with an
-- explicit dictionary makes it safe to mark IMMUTABLE so it can be used in indexes.
create or replace function public.immutable_unaccent(t text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, t);
$$;

-- Arabic/French search normalisation:
-- lowercase, unaccent, strip tashkeel (U+064B–U+0652), superscript alef (U+0670),
-- tatweel (U+0640), unify alef forms, ة→ه, ى→ي, ؤ→و, ئ→ي.
create or replace function public.normalize_ar(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select translate(
    regexp_replace(lower(public.immutable_unaccent(coalesce(t, ''))), '[ً-ْٰـ]', '', 'g'),
    'أإآٱةىؤئ',
    'ااااهيوي'
  );
$$;

-- Words / 200, rounded up, minimum 1.
create or replace function public.estimate_reading_minutes(t text)
returns int
language sql
immutable
parallel safe
set search_path = ''
as $$
  select greatest(
    1,
    ceil(coalesce(array_length(regexp_split_to_array(nullif(btrim(coalesce(t, '')), ''), '\s+'), 1), 0) / 200.0)
  )::int;
$$;

-- ASCII slug: lowercase, unaccented, [a-z0-9-]. Returns '' when nothing is left
-- (e.g. a purely Arabic string); callers provide a fallback.
create or replace function public.slugify(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(public.immutable_unaccent(coalesce(t, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

-- Article URL slug (cosmetic): Arabic letters allowed, spaces → '-', max 80 chars.
create or replace function public.article_slug(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select trim(both '-' from left(
    trim(both '-' from regexp_replace(
      regexp_replace(lower(coalesce(t, '')), '[ً-ْٰـ]', '', 'g'),
      '[^a-z0-9ء-ي٠-٩À-ÿ]+', '-', 'g')),
    80));
$$;
