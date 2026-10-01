-- El Borj — 03 staff profiles, role helpers, auth trigger

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'author',
  is_active boolean not null default true,
  display_name_ar text not null,
  display_name_fr text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_ar text,
  title_fr text,
  bio_ar text,
  bio_fr text,
  avatar_media_id uuid, -- FK added in the media migration
  email_public text,
  social jsonb not null default '{}'::jsonb,
  show_public_page boolean not null default true,
  ui_locale public.content_language not null default 'ar',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role of the calling user (null for anon, unknown or deactivated users).
create or replace function public.current_role_name()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active;
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.current_role_name() is not null; $$;

create or replace function public.is_editor_or_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_role_name() in ('editor', 'admin'), false); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_role_name() = 'admin', false); $$;

-- Unique profile slug from a seed string.
create or replace function public.unique_profile_slug(seed text, exclude_id uuid default null)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base text := nullif(public.slugify(seed), '');
  candidate text;
  n int := 1;
begin
  base := coalesce(base, 'author');
  candidate := base;
  while exists (select 1 from public.profiles where slug = candidate and id is distinct from exclude_id) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;

-- A profile row for every new auth user. Always created as an "author":
-- roles are only ever raised by an admin (team screen) or bootstrap_admin.sql,
-- never from user-supplied metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dname text := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(new.email, '@', 1),
    'كاتب'
  );
begin
  insert into public.profiles (id, display_name_ar, slug)
  values (new.id, dname, public.unique_profile_slug(coalesce(new.raw_user_meta_data ->> 'slug', split_part(new.email, '@', 1), dname)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Guard: only admins (or the server / SQL editor, where auth.uid() is null) may
-- change role or active status; the last active admin can never be removed.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role or new.is_active is distinct from old.is_active
       or new.is_demo is distinct from old.is_demo then
      raise exception 'not_allowed: only an admin can change roles or account status'
        using errcode = '42501';
    end if;
  end if;

  if old.role = 'admin' and old.is_active
     and (new.role <> 'admin' or not new.is_active)
     and not exists (
       select 1 from public.profiles
       where role = 'admin' and is_active and id <> old.id
     ) then
    raise exception 'last_admin: the last active admin cannot be demoted or deactivated'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- Public author data only (anon never reads the profiles table directly).
create view public.public_authors as
  select id, slug, display_name_ar, display_name_fr, title_ar, title_fr, bio_ar, bio_fr,
         avatar_media_id, email_public, social, is_demo
  from public.profiles
  where is_active and show_public_page;

-- Admin-only listing with e-mail and last sign-in (e-mail lives in auth.users).
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, role public.app_role, is_active boolean,
  display_name_ar text, display_name_fr text, slug text,
  last_sign_in_at timestamptz, created_at timestamptz, article_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.role, p.is_active, p.display_name_ar, p.display_name_fr, p.slug,
           u.last_sign_in_at, p.created_at,
           (select count(*) from public.article_authors aa where aa.profile_id = p.id)
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.is_active desc, p.role, p.display_name_ar;
end;
$$;
