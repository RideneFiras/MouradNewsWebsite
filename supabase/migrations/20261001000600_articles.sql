-- El Borj — 06 articles, authors, secondary sections, tags, revisions

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  public_id bigint generated always as identity unique,
  language public.content_language not null default 'ar',
  translation_group_id uuid,
  status public.article_status not null default 'draft',
  kicker_override text,
  title text not null check (length(btrim(title)) > 0),
  subtitle text,
  slug text,
  excerpt text,
  body_json jsonb,
  body_html text,
  body_text text,
  category_id uuid not null references public.categories (id) on delete restrict,
  format_id uuid references public.article_formats (id) on delete set null,
  location text,
  byline_override text,
  cover_media_id uuid references public.media (id) on delete restrict,
  cover_caption text,
  cover_credit text,
  cover_alt text,
  is_breaking boolean not null default false,
  breaking_until timestamptz,
  is_featured boolean not null default false,
  is_sponsored boolean not null default false,
  sponsor_name text,
  allow_ads boolean not null default true,
  reading_minutes int not null default 1,
  published_at timestamptz,
  scheduled_for timestamptz,
  first_published_at timestamptz,
  content_updated_at timestamptz,
  correction_note_ar text,
  correction_note_fr text,
  seo_title text,
  seo_description text,
  og_media_id uuid references public.media (id) on delete restrict,
  canonical_url text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  last_edited_by uuid references public.profiles (id) on delete set null,
  review_note text,
  search_vector tsvector,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_scheduled_needs_date check (status <> 'scheduled' or scheduled_for is not null),
  constraint articles_published_needs_date check (status <> 'published' or published_at is not null),
  constraint articles_sponsor_needs_name check (not is_sponsored or nullif(btrim(sponsor_name), '') is not null),
  constraint articles_canonical_https check (canonical_url is null or canonical_url ~ '^https://')
);

create index articles_status_published_idx on public.articles (status, published_at desc);
create index articles_category_status_published_idx on public.articles (category_id, status, published_at desc);
create index articles_language_status_published_idx on public.articles (language, status, published_at desc);
create index articles_breaking_idx on public.articles (is_breaking) where is_breaking;
create index articles_translation_group_idx on public.articles (translation_group_id);
create index articles_format_idx on public.articles (format_id, status, published_at desc);
create index articles_created_by_idx on public.articles (created_by);
create index articles_search_idx on public.articles using gin (search_vector);
create index articles_title_trgm_idx on public.articles using gin (public.normalize_ar(title) extensions.gin_trgm_ops);

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- Derived fields, kept consistent whatever client writes the row.
create or replace function public.articles_derive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.title := btrim(new.title);
  if new.slug is null or btrim(new.slug) = '' or (tg_op = 'UPDATE' and new.title is distinct from old.title and new.slug = old.slug and new.status <> 'published') then
    new.slug := nullif(public.article_slug(new.title), '');
  end if;
  if new.excerpt is null or btrim(new.excerpt) = '' then
    new.excerpt := nullif(left(btrim(split_part(coalesce(new.body_text, ''), E'\n', 1)), 220), '');
  end if;
  new.reading_minutes := public.estimate_reading_minutes(new.body_text);
  new.search_vector :=
       setweight(to_tsvector('simple', public.normalize_ar(new.title)), 'A')
    || setweight(to_tsvector('simple', public.normalize_ar(coalesce(new.subtitle, ''))), 'B')
    || setweight(to_tsvector('simple', public.normalize_ar(coalesce(new.body_text, ''))), 'C');
  if new.is_sponsored and tg_op = 'INSERT' then
    new.allow_ads := false;
  end if;
  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
    new.first_published_at := coalesce(new.first_published_at, new.published_at);
    new.scheduled_for := null;
  end if;
  if new.is_breaking and new.breaking_until is null then
    new.breaking_until := now() + make_interval(hours => coalesce(
      (select (value ->> 'default_hours')::int from public.site_settings where key = 'breaking'), 6));
  end if;
  if not new.is_breaking then
    new.breaking_until := null;
  end if;
  if auth.uid() is not null then
    new.last_edited_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger articles_derive
  before insert or update on public.articles
  for each row execute function public.articles_derive();

create table public.article_authors (
  article_id uuid not null references public.articles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position smallint not null default 0,
  primary key (article_id, profile_id)
);
create index article_authors_profile_idx on public.article_authors (profile_id);

create table public.article_categories (
  article_id uuid not null references public.articles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  primary key (article_id, category_id)
);
create index article_categories_category_idx on public.article_categories (category_id);

create table public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (article_id, tag_id)
);
create index article_tags_tag_idx on public.article_tags (tag_id);

create table public.article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  title text not null,
  subtitle text,
  body_json jsonb,
  edited_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index article_revisions_article_idx on public.article_revisions (article_id, created_at desc);

-- Helpers used by RLS policies. SECURITY DEFINER so policies on articles and on the
-- join tables don't recurse into each other.
create or replace function public.is_article_author(a_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.articles a
    where a.id = a_id
      and (a.created_by = auth.uid()
           or exists (select 1 from public.article_authors aa where aa.article_id = a.id and aa.profile_id = auth.uid()))
  );
$$;

create or replace function public.is_article_public(a_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.articles a
    where a.id = a_id and a.status = 'published' and a.published_at <= now()
  );
$$;

-- Authors may edit their own drafts but never publish, schedule, archive, feature,
-- flag breaking/sponsored or change dates. RLS can't compare OLD/NEW, this trigger does.
create or replace function public.articles_author_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_role_name() is distinct from 'author' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'in_review') or new.published_at is not null or new.scheduled_for is not null
       or new.is_featured or new.is_breaking or new.is_sponsored or new.first_published_at is not null then
      raise exception 'author_not_allowed: authors can only create drafts or submit for review' using errcode = '42501';
    end if;
    if new.created_by is distinct from auth.uid() then
      raise exception 'author_not_allowed: created_by must be yourself' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.status not in ('draft', 'in_review')
     or new.published_at is distinct from old.published_at
     or new.scheduled_for is distinct from old.scheduled_for
     or new.first_published_at is distinct from old.first_published_at
     or new.is_featured is distinct from old.is_featured
     or new.is_breaking is distinct from old.is_breaking
     or new.is_sponsored is distinct from old.is_sponsored
     or new.sponsor_name is distinct from old.sponsor_name
     or new.created_by is distinct from old.created_by
     or new.content_updated_at is distinct from old.content_updated_at
     or new.is_demo is distinct from old.is_demo then
    raise exception 'author_not_allowed: this change needs an editor' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger articles_author_guard
  before insert or update on public.articles
  for each row execute function public.articles_author_guard();

-- Authors can only attach/detach authors, tags and sections on articles they may edit.
create or replace function public.can_edit_article(a_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_editor_or_admin()
      or (public.current_role_name() = 'author'
          and public.is_article_author(a_id)
          and exists (select 1 from public.articles a where a.id = a_id and a.status in ('draft', 'in_review')));
$$;
