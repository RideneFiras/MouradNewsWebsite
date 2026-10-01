-- El Borj — 04 taxonomy: categories (sections), article formats (genres), tags

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ar text not null,
  name_fr text,
  description_ar text,
  description_fr text,
  color text not null default '#A3161C' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position int not null default 0,
  show_in_nav boolean not null default true,
  show_on_home boolean not null default false,
  is_active boolean not null default true,
  seo_title_ar text,
  seo_title_fr text,
  seo_description_ar text,
  seo_description_fr text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index categories_parent_position_idx on public.categories (parent_id, position);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Max depth 2: a category with a parent cannot itself be a parent, and a category
-- that has children cannot be moved under another one.
create or replace function public.categories_depth_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.categories where id = new.parent_id and parent_id is not null) then
      raise exception 'max_depth: sub-sections cannot have their own sub-sections' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and exists (select 1 from public.categories where parent_id = new.id) then
      raise exception 'max_depth: a section with sub-sections cannot become a sub-section' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger categories_depth_guard
  before insert or update of parent_id on public.categories
  for each row execute function public.categories_depth_guard();

create table public.article_formats (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ar text not null,
  name_fr text,
  position int not null default 0,
  is_active boolean not null default true,
  show_as_kicker boolean not null default true,
  is_opinion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger article_formats_set_updated_at
  before update on public.article_formats
  for each row execute function public.set_updated_at();

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  kind public.tag_kind not null default 'topic',
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ar text not null,
  name_fr text,
  description_ar text,
  description_fr text,
  image_media_id uuid, -- FK added in the media migration
  is_featured boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tags_kind_idx on public.tags (kind);
create index tags_name_trgm_idx on public.tags using gin (public.normalize_ar(name_ar) extensions.gin_trgm_ops);

create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();
