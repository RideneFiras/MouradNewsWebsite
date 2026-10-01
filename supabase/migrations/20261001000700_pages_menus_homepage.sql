-- El Borj — 07 static pages, menus, homepage builder, redirects

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  language public.content_language not null default 'ar',
  title text not null,
  body_json jsonb,
  body_html text,
  status public.article_status not null default 'draft' check (status in ('draft', 'published')),
  show_in_footer boolean not null default false,
  position int not null default 0,
  page_kind text not null default 'standard'
    check (page_kind in ('standard', 'media_kit', 'contact', 'charter', 'privacy', 'about', 'legal')),
  seo_title text,
  seo_description text,
  translation_group_id uuid,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (language, slug)
);

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu text not null check (menu in ('header_extra', 'footer', 'utility')),
  label_ar text not null,
  label_fr text,
  target_type text not null check (target_type in ('url', 'category', 'page', 'tag')),
  url text check (url is null or url ~ '^(https://|/)'),
  category_id uuid references public.categories (id) on delete cascade,
  page_id uuid references public.pages (id) on delete cascade,
  tag_id uuid references public.tags (id) on delete cascade,
  parent_id uuid references public.menu_items (id) on delete cascade,
  position int not null default 0,
  is_active boolean not null default true,
  open_in_new_tab boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_type = 'url' and url is not null)
    or (target_type = 'category' and category_id is not null)
    or (target_type = 'page' and page_id is not null)
    or (target_type = 'tag' and tag_id is not null)
  )
);
create index menu_items_menu_position_idx on public.menu_items (menu, position);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  locale text not null default 'both' check (locale in ('ar', 'fr', 'both')),
  type public.homepage_section_type not null,
  title_ar text,
  title_fr text,
  config jsonb not null default '{}'::jsonb,
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index homepage_sections_locale_position_idx on public.homepage_sections (locale, position);

create trigger homepage_sections_set_updated_at
  before update on public.homepage_sections
  for each row execute function public.set_updated_at();

create table public.redirects (
  from_path text primary key check (from_path ~ '^/'),
  to_path text not null check (to_path ~ '^/'),
  created_at timestamptz not null default now()
);

-- Keep old URLs alive when a slug changes (categories, tags, authors, pages).
create or replace function public.slug_redirect()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prefix text := tg_argv[0];
  loc text;
begin
  if new.slug is distinct from old.slug then
    foreach loc in array (case when tg_table_name = 'pages' then array[to_jsonb(old) ->> 'language'] else array['ar', 'fr'] end) loop
      -- Point any redirect that targeted the old URL to the new one (no chains).
      update public.redirects set to_path = '/' || loc || prefix || new.slug
        where to_path = '/' || loc || prefix || old.slug;
      insert into public.redirects (from_path, to_path)
        values ('/' || loc || prefix || old.slug, '/' || loc || prefix || new.slug)
        on conflict (from_path) do update set to_path = excluded.to_path;
      delete from public.redirects where from_path = '/' || loc || prefix || new.slug;
    end loop;
  end if;
  return new;
end;
$$;

create trigger categories_slug_redirect after update of slug on public.categories
  for each row execute function public.slug_redirect('/section/');
create trigger tags_slug_redirect after update of slug on public.tags
  for each row execute function public.slug_redirect('/topic/');
create trigger profiles_slug_redirect after update of slug on public.profiles
  for each row execute function public.slug_redirect('/author/');
create trigger pages_slug_redirect after update of slug on public.pages
  for each row execute function public.slug_redirect('/p/');
