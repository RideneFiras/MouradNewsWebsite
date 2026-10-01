-- El Borj — 08 site settings, contact messages

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.site_settings_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger site_settings_touch
  before insert or update on public.site_settings
  for each row execute function public.site_settings_touch();

-- Keys an editor must not change (integrations, ads, analytics, money).
create or replace function public.is_sensitive_setting(k text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select k in ('adsense', 'ads_txt', 'ga4', 'analytics', 'consent', 'in_article_ads', 'media_kit');
$$;

-- Raw analytics retention can never drop below 35 days (monthly uniques need a full month).
create or replace function public.site_settings_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.key = 'analytics' then
    new.value := jsonb_set(
      new.value, '{raw_retention_days}',
      to_jsonb(least(180, greatest(35, coalesce((new.value ->> 'raw_retention_days')::int, 60)))));
    new.value := jsonb_set(new.value, '{exclude_staff}', 'true'::jsonb);
    new.is_public := false;
  end if;
  return new;
end;
$$;

create trigger site_settings_validate
  before insert or update on public.site_settings
  for each row execute function public.site_settings_validate();

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  email text not null check (length(email) between 3 and 320),
  subject text not null check (subject in ('news_tip', 'advertising', 'correction', 'other')),
  message text not null check (length(message) between 1 and 8000),
  locale public.content_language not null default 'ar',
  status text not null default 'new' check (status in ('new', 'read', 'handled')),
  handled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);
