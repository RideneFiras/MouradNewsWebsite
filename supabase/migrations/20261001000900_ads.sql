-- El Borj — 09 ad slots, direct sponsor campaigns, ad statistics

create table public.ad_slots (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  label_ar text not null,
  label_fr text,
  mode public.ad_mode not null default 'off',
  adsense_slot_id text check (adsense_slot_id is null or adsense_slot_id ~ '^[0-9]{4,20}$'),
  sizes jsonb not null default '{"desktop":[728,90],"mobile":[300,250]}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ad_slots_set_updated_at
  before update on public.ad_slots
  for each row execute function public.set_updated_at();

create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_name text not null check (length(btrim(sponsor_name)) > 0),
  slot_key text not null references public.ad_slots (key) on delete restrict,
  locale text not null default 'both' check (locale in ('ar', 'fr', 'both')),
  creative_desktop_media_id uuid references public.media (id) on delete restrict,
  creative_mobile_media_id uuid references public.media (id) on delete restrict,
  click_url text not null check (click_url ~ '^https://[^\s]+$'),
  alt_text text not null default '',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  weight int not null default 1 check (weight between 1 and 100),
  category_ids uuid[],
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (creative_desktop_media_id is not null or creative_mobile_media_id is not null)
);
create index ad_campaigns_slot_idx on public.ad_campaigns (slot_key, is_active, starts_at, ends_at);

create trigger ad_campaigns_set_updated_at
  before update on public.ad_campaigns
  for each row execute function public.set_updated_at();

-- Written only by the server (service role) through record_ad_* below. Never editable.
create table public.ad_daily_stats (
  date date not null,
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  impressions int not null default 0,
  clicks int not null default 0,
  primary key (date, campaign_id)
);

-- What the public site needs to render slots (no internal notes).
create view public.public_ad_slots as
  select key, label_ar, label_fr, mode, adsense_slot_id, sizes
  from public.ad_slots
  where is_active;

-- Currently running campaigns with render fields only (no click_url, no notes).
create view public.active_ad_campaigns as
  select c.id, c.sponsor_name, c.slot_key, c.locale, c.alt_text, c.weight, c.category_ids,
         c.starts_at, c.ends_at,
         md.storage_path as desktop_path, md.variants as desktop_variants, md.width as desktop_width, md.height as desktop_height,
         mm.storage_path as mobile_path, mm.variants as mobile_variants, mm.width as mobile_width, mm.height as mobile_height
  from public.ad_campaigns c
  join public.ad_slots s on s.key = c.slot_key and s.is_active
  left join public.media md on md.id = c.creative_desktop_media_id
  left join public.media mm on mm.id = c.creative_mobile_media_id
  where c.is_active and c.starts_at <= now() and (c.ends_at is null or c.ends_at > now());

-- Server-only counters. Only the service role may execute them (grants below).
create or replace function public.record_ad_impression(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ad_daily_stats (date, campaign_id, impressions, clicks)
  select (now() at time zone 'Africa/Tunis')::date, c.id, 1, 0
  from public.ad_campaigns c where c.id = p_campaign_id
  on conflict (date, campaign_id) do update set impressions = public.ad_daily_stats.impressions + 1;
end;
$$;

create or replace function public.record_ad_click(p_campaign_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target text;
begin
  select click_url into target from public.ad_campaigns where id = p_campaign_id;
  if target is null then
    return null;
  end if;
  insert into public.ad_daily_stats (date, campaign_id, impressions, clicks)
  values ((now() at time zone 'Africa/Tunis')::date, p_campaign_id, 0, 1)
  on conflict (date, campaign_id) do update set clicks = public.ad_daily_stats.clicks + 1;
  return target;
end;
$$;

revoke all on function public.record_ad_impression(uuid) from public, anon, authenticated;
revoke all on function public.record_ad_click(uuid) from public, anon, authenticated;
grant execute on function public.record_ad_impression(uuid) to service_role;
grant execute on function public.record_ad_click(uuid) to service_role;

-- Sponsor report (editor/admin), read-only.
create or replace function public.ad_campaign_report(p_campaign_id uuid)
returns table (date date, impressions int, clicks int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_editor_or_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select s.date, s.impressions, s.clicks from public.ad_daily_stats s
    where s.campaign_id = p_campaign_id order by s.date;
end;
$$;
