-- El Borj — 10 first-party analytics: raw tables, salts, ingestion, rollups
--
-- Guarantee: no human can write these tables. anon/authenticated (every logged-in
-- role, admin included) get no INSERT/UPDATE/DELETE privilege and no write policy.
-- Only the service role (server routes) and SECURITY DEFINER cron functions write.

create table public.analytics_salts (
  month date primary key,
  salt bytea not null default extensions.gen_random_bytes(32)
);

create table public.pageviews_raw (
  pv_id uuid primary key,
  occurred_at timestamptz not null default now(),
  path text not null,
  article_id uuid references public.articles (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  locale public.content_language not null,
  source public.traffic_source not null default 'direct',
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country char(2) not null default 'XX',
  device public.device_type not null default 'other',
  visitor_hash bytea not null
);
create index pageviews_raw_occurred_idx on public.pageviews_raw (occurred_at);
create index pageviews_raw_article_idx on public.pageviews_raw (article_id, occurred_at);

create table public.engagement_raw (
  pv_id uuid primary key references public.pageviews_raw (pv_id) on delete cascade,
  engaged_seconds int not null default 0 check (engaged_seconds between 0 and 1800),
  max_scroll_pct smallint not null default 0 check (max_scroll_pct between 0 and 100),
  updated_at timestamptz not null default now()
);

create table public.analytics_daily (
  date date not null,
  dimension text not null check (dimension in ('site', 'locale', 'source', 'country', 'device', 'category', 'referrer_host', 'utm_campaign')),
  dimension_value text not null,
  pageviews int not null default 0,
  visitors int not null default 0,
  engaged_seconds_sum bigint not null default 0,
  engaged_count int not null default 0,
  reads int not null default 0,
  article_views int not null default 0,
  primary key (date, dimension, dimension_value)
);

create table public.analytics_daily_article (
  date date not null,
  article_id uuid not null references public.articles (id) on delete cascade,
  pageviews int not null default 0,
  visitors int not null default 0,
  engaged_seconds_sum bigint not null default 0,
  engaged_count int not null default 0,
  reads int not null default 0,
  source_breakdown jsonb not null default '{}'::jsonb,
  country_breakdown jsonb not null default '{}'::jsonb,
  device_breakdown jsonb not null default '{}'::jsonb,
  referrer_breakdown jsonb not null default '{}'::jsonb,
  primary key (date, article_id)
);
create index analytics_daily_article_article_idx on public.analytics_daily_article (article_id, date);

create table public.analytics_monthly_uniques (
  month date not null,
  dimension text not null check (dimension in ('site', 'category', 'author', 'locale')),
  dimension_value text not null,
  visitors int not null default 0,
  pageviews int not null default 0,
  primary key (month, dimension, dimension_value)
);

create table public.rollup_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'error')),
  detail text
);

-- Manual social numbers: the only human-entered statistics, always labeled as such.
create table public.social_stats (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook', 'instagram', 'youtube', 'tiktok')),
  recorded_for date not null,
  followers int check (followers >= 0),
  reach_28d int check (reach_28d >= 0),
  engagement_28d int check (engagement_28d >= 0),
  note text,
  entered_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index social_stats_platform_idx on public.social_stats (platform, recorded_for desc);

-- ---------------------------------------------------------------------------
-- Salts (monthly, deleted after the next month so hashes can't be linked or reversed)

create or replace function public.ensure_salt(p_month date)
returns bytea
language plpgsql
security definer
set search_path = ''
as $$
declare
  m date := date_trunc('month', p_month)::date;
  s bytea;
begin
  select salt into s from public.analytics_salts where month = m;
  if s is null then
    insert into public.analytics_salts (month) values (m) on conflict (month) do nothing;
    select salt into s from public.analytics_salts where month = m;
  end if;
  return s;
end;
$$;

create or replace function public.rotate_salt()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  this_month date := date_trunc('month', now() at time zone 'Africa/Tunis')::date;
begin
  perform public.ensure_salt(this_month);
  perform public.ensure_salt((this_month + interval '1 month')::date);
  delete from public.analytics_salts where month < (this_month - interval '1 month')::date;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ingestion (called by /api/t with the service role only). IP and user agent are
-- hashed together with the month's salt inside the database and never stored.

create or replace function public.track_pageview(
  p_pv_id uuid,
  p_path text,
  p_article_public_id bigint,
  p_category_slug text,
  p_locale public.content_language,
  p_source public.traffic_source,
  p_referrer_host text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_country text,
  p_device public.device_type,
  p_ip text,
  p_ua text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_salt bytea := public.ensure_salt((now() at time zone 'Africa/Tunis')::date);
  v_article uuid;
  v_category uuid;
begin
  if p_article_public_id is not null then
    select a.id, a.category_id into v_article, v_category
    from public.articles a
    where a.public_id = p_article_public_id and a.status = 'published' and a.published_at <= now();
    if v_article is null then
      return; -- unknown or unpublished article: don't count
    end if;
  elsif p_category_slug is not null then
    select c.id into v_category from public.categories c where c.slug = p_category_slug;
  end if;

  insert into public.pageviews_raw (
    pv_id, path, article_id, category_id, locale, source, referrer_host,
    utm_source, utm_medium, utm_campaign, country, device, visitor_hash
  ) values (
    p_pv_id, left(p_path, 300), v_article, v_category, p_locale, p_source, left(lower(p_referrer_host), 120),
    left(p_utm_source, 80), left(p_utm_medium, 80), left(p_utm_campaign, 120),
    upper(coalesce(nullif(left(p_country, 2), ''), 'XX')), p_device,
    extensions.digest(v_salt || convert_to(coalesce(p_ip, '') || '|' || coalesce(p_ua, '') || '|el-borj', 'UTF8'), 'sha256')
  )
  on conflict (pv_id) do nothing;
end;
$$;

create or replace function public.track_engagement(p_pv_id uuid, p_engaged_seconds int, p_max_scroll_pct int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only for page views from the last 3 hours (no late tampering).
  if not exists (select 1 from public.pageviews_raw where pv_id = p_pv_id and occurred_at > now() - interval '3 hours') then
    return;
  end if;
  insert into public.engagement_raw (pv_id, engaged_seconds, max_scroll_pct)
  values (p_pv_id, least(1800, greatest(0, p_engaged_seconds)), least(100, greatest(0, p_max_scroll_pct)))
  on conflict (pv_id) do update set
    engaged_seconds = greatest(public.engagement_raw.engaged_seconds, excluded.engaged_seconds),
    max_scroll_pct = greatest(public.engagement_raw.max_scroll_pct, excluded.max_scroll_pct),
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Aggregation (shared by rollups and by live "today" numbers)

create or replace function public.tunis_day_start(d date)
returns timestamptz language sql immutable set search_path = ''
as $$ select (d::timestamp at time zone 'Africa/Tunis'); $$;

create or replace function public.tunis_today()
returns date language sql stable set search_path = ''
as $$ select (now() at time zone 'Africa/Tunis')::date; $$;

create or replace function public.analytics_aggregate(p_from timestamptz, p_to timestamptz)
returns table (
  dimension text, dimension_value text, pageviews bigint, visitors bigint,
  engaged_seconds_sum bigint, engaged_count bigint, reads bigint, article_views bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select p.*, e.engaged_seconds, e.max_scroll_pct
    from public.pageviews_raw p
    left join public.engagement_raw e on e.pv_id = p.pv_id
    where p.occurred_at >= p_from and p.occurred_at < p_to
  )
  select x.dim, x.val,
         count(*), count(distinct b.visitor_hash),
         coalesce(sum(b.engaged_seconds), 0)::bigint,
         count(b.engaged_seconds),
         count(*) filter (where b.article_id is not null and b.max_scroll_pct >= 75),
         count(*) filter (where b.article_id is not null)
  from base b
  cross join lateral (values
    ('site', 'all'),
    ('locale', b.locale::text),
    ('source', b.source::text),
    ('country', b.country::text),
    ('device', b.device::text),
    ('category', b.category_id::text),
    ('referrer_host', b.referrer_host),
    ('utm_campaign', b.utm_campaign)
  ) as x(dim, val)
  where x.val is not null
  group by x.dim, x.val;
$$;

create or replace function public.analytics_aggregate_articles(p_from timestamptz, p_to timestamptz)
returns table (
  article_id uuid, pageviews bigint, visitors bigint, engaged_seconds_sum bigint, engaged_count bigint,
  reads bigint, source_breakdown jsonb, country_breakdown jsonb, device_breakdown jsonb, referrer_breakdown jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select p.*, e.engaged_seconds, e.max_scroll_pct
    from public.pageviews_raw p
    left join public.engagement_raw e on e.pv_id = p.pv_id
    where p.occurred_at >= p_from and p.occurred_at < p_to and p.article_id is not null
  )
  select b.article_id,
         count(*), count(distinct b.visitor_hash),
         coalesce(sum(b.engaged_seconds), 0)::bigint, count(b.engaged_seconds),
         count(*) filter (where b.max_scroll_pct >= 75),
         (select coalesce(jsonb_object_agg(s.source, s.n), '{}') from (select source::text as source, count(*) n from base b2 where b2.article_id = b.article_id group by 1) s),
         (select coalesce(jsonb_object_agg(s.country, s.n), '{}') from (select country::text as country, count(*) n from base b2 where b2.article_id = b.article_id group by 1 order by 2 desc limit 10) s),
         (select coalesce(jsonb_object_agg(s.device, s.n), '{}') from (select device::text as device, count(*) n from base b2 where b2.article_id = b.article_id group by 1) s),
         (select coalesce(jsonb_object_agg(s.host, s.n), '{}') from (select referrer_host as host, count(*) n from base b2 where b2.article_id = b.article_id and referrer_host is not null group by 1 order by 2 desc limit 10) s)
  from base b
  group by b.article_id;
$$;

-- Idempotent upsert of one Africa/Tunis day. Never deletes: once raw rows are pruned,
-- re-running an old day leaves the stored rollup untouched.
create or replace function public.rollup_day(p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t0 timestamptz := public.tunis_day_start(p_day);
  t1 timestamptz := public.tunis_day_start(p_day + 1);
begin
  insert into public.analytics_daily as d (date, dimension, dimension_value, pageviews, visitors, engaged_seconds_sum, engaged_count, reads, article_views)
  select p_day, a.dimension, a.dimension_value, a.pageviews, a.visitors, a.engaged_seconds_sum, a.engaged_count, a.reads, a.article_views
  from public.analytics_aggregate(t0, t1) a
  on conflict (date, dimension, dimension_value) do update set
    pageviews = excluded.pageviews, visitors = excluded.visitors,
    engaged_seconds_sum = excluded.engaged_seconds_sum, engaged_count = excluded.engaged_count,
    reads = excluded.reads, article_views = excluded.article_views;

  insert into public.analytics_daily_article as d (date, article_id, pageviews, visitors, engaged_seconds_sum, engaged_count, reads,
                                                   source_breakdown, country_breakdown, device_breakdown, referrer_breakdown)
  select p_day, a.article_id, a.pageviews, a.visitors, a.engaged_seconds_sum, a.engaged_count, a.reads,
         a.source_breakdown, a.country_breakdown, a.device_breakdown, a.referrer_breakdown
  from public.analytics_aggregate_articles(t0, t1) a
  where exists (select 1 from public.articles x where x.id = a.article_id)
  on conflict (date, article_id) do update set
    pageviews = excluded.pageviews, visitors = excluded.visitors,
    engaged_seconds_sum = excluded.engaged_seconds_sum, engaged_count = excluded.engaged_count,
    reads = excluded.reads, source_breakdown = excluded.source_breakdown,
    country_breakdown = excluded.country_breakdown, device_breakdown = excluded.device_breakdown,
    referrer_breakdown = excluded.referrer_breakdown;
end;
$$;

-- Monthly unique visitors (site, category, author, locale) from raw rows.
create or replace function public.rollup_month_uniques(p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m date := date_trunc('month', p_month)::date;
  t0 timestamptz := public.tunis_day_start(m);
  t1 timestamptz := public.tunis_day_start((m + interval '1 month')::date);
begin
  if not exists (select 1 from public.pageviews_raw where occurred_at >= t0 and occurred_at < t1) then
    return; -- nothing (left) to compute: keep any frozen numbers
  end if;
  insert into public.analytics_monthly_uniques as u (month, dimension, dimension_value, visitors, pageviews)
  select m, x.dim, x.val, count(distinct p.visitor_hash), count(*)
  from public.pageviews_raw p
  cross join lateral (values ('site', 'all'), ('locale', p.locale::text), ('category', p.category_id::text)) as x(dim, val)
  where p.occurred_at >= t0 and p.occurred_at < t1 and x.val is not null
  group by x.dim, x.val
  on conflict (month, dimension, dimension_value) do update set visitors = excluded.visitors, pageviews = excluded.pageviews;

  insert into public.analytics_monthly_uniques as u (month, dimension, dimension_value, visitors, pageviews)
  select m, 'author', aa.profile_id::text, count(distinct p.visitor_hash), count(*)
  from public.pageviews_raw p
  join public.article_authors aa on aa.article_id = p.article_id
  where p.occurred_at >= t0 and p.occurred_at < t1
  group by aa.profile_id
  on conflict (month, dimension, dimension_value) do update set visitors = excluded.visitors, pageviews = excluded.pageviews;
end;
$$;

create or replace function public.rollup_hourly()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id bigint;
begin
  insert into public.rollup_runs (job) values ('rollup_hourly') returning id into run_id;
  perform public.rollup_day(public.tunis_today() - 1);
  perform public.rollup_day(public.tunis_today());
  update public.rollup_runs set finished_at = now(), status = 'ok' where id = run_id;
exception when others then
  update public.rollup_runs set finished_at = now(), status = 'error', detail = sqlerrm where id = run_id;
end;
$$;

create or replace function public.rollup_nightly()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id bigint;
  retention int := coalesce((select (value ->> 'raw_retention_days')::int from public.site_settings where key = 'analytics'), 60);
  yesterday date := public.tunis_today() - 1;
  pruned bigint;
begin
  insert into public.rollup_runs (job) values ('rollup_nightly') returning id into run_id;
  retention := greatest(35, least(180, retention));
  perform public.rollup_day(yesterday);
  perform public.rollup_month_uniques(public.tunis_today());
  -- Freeze the previous month one last time on the first day of a new month.
  if date_trunc('month', yesterday) <> date_trunc('month', public.tunis_today()) then
    perform public.rollup_month_uniques(yesterday);
  end if;
  delete from public.pageviews_raw where occurred_at < now() - make_interval(days => retention);
  get diagnostics pruned = row_count;
  -- Keep the latest 30 revisions per article.
  delete from public.article_revisions r
  using (
    select id from (
      select id, row_number() over (partition by article_id order by created_at desc) rn
      from public.article_revisions
    ) x where x.rn > 30
  ) old
  where r.id = old.id;
  -- Handled contact messages older than 12 months.
  delete from public.contact_messages where status = 'handled' and created_at < now() - interval '12 months';
  update public.rollup_runs set finished_at = now(), status = 'ok', detail = 'pruned_raw=' || pruned where id = run_id;
  delete from public.rollup_runs where started_at < now() - interval '90 days';
exception when others then
  update public.rollup_runs set finished_at = now(), status = 'error', detail = sqlerrm where id = run_id;
end;
$$;

-- Admin recovery: re-run rollups for a date range (max 400 days).
create or replace function public.run_rollup(from_date date, to_date date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  d date;
  n int := 0;
  run_id bigint;
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if to_date < from_date or to_date - from_date > 400 then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  insert into public.rollup_runs (job, detail) values ('run_rollup', from_date || '..' || to_date) returning id into run_id;
  d := from_date;
  while d <= to_date loop
    perform public.rollup_day(d);
    n := n + 1;
    d := d + 1;
  end loop;
  perform public.rollup_month_uniques(from_date);
  if date_trunc('month', to_date) <> date_trunc('month', from_date) then
    perform public.rollup_month_uniques(to_date);
  end if;
  update public.rollup_runs set finished_at = now(), status = 'ok' where id = run_id;
  return n;
end;
$$;

-- Lock down: ingestion and rollup internals are not callable by API users.
revoke all on function public.track_pageview(uuid, text, bigint, text, public.content_language, public.traffic_source, text, text, text, text, text, public.device_type, text, text) from public, anon, authenticated;
revoke all on function public.track_engagement(uuid, int, int) from public, anon, authenticated;
grant execute on function public.track_pageview(uuid, text, bigint, text, public.content_language, public.traffic_source, text, text, text, text, text, public.device_type, text, text) to service_role;
grant execute on function public.track_engagement(uuid, int, int) to service_role;
revoke all on function public.ensure_salt(date) from public, anon, authenticated;
revoke all on function public.rotate_salt() from public, anon, authenticated;
revoke all on function public.analytics_aggregate(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.analytics_aggregate_articles(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.rollup_day(date) from public, anon, authenticated;
revoke all on function public.rollup_month_uniques(date) from public, anon, authenticated;
revoke all on function public.rollup_hourly() from public, anon, authenticated;
revoke all on function public.rollup_nightly() from public, anon, authenticated;
grant execute on function public.ensure_salt(date), public.rotate_salt(), public.rollup_day(date),
  public.rollup_month_uniques(date), public.rollup_hourly(), public.rollup_nightly() to service_role;
revoke all on function public.run_rollup(date, date) from public, anon;
grant execute on function public.run_rollup(date, date) to authenticated;
