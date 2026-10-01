-- El Borj — 11 read-only statistics RPCs (dashboard, author stats, media kit)
-- Every function is SECURITY DEFINER and checks the caller's role itself.
-- "Today" is computed live from raw rows; earlier days come from rollups.

create or replace function public._stats_daily(p_from date, p_to date, p_dimension text)
returns table (
  date date, dimension_value text, pageviews bigint, visitors bigint,
  engaged_seconds_sum bigint, engaged_count bigint, reads bigint, article_views bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.date, d.dimension_value, d.pageviews::bigint, d.visitors::bigint, d.engaged_seconds_sum,
         d.engaged_count::bigint, d.reads::bigint, d.article_views::bigint
  from public.analytics_daily d
  where d.dimension = p_dimension and d.date between p_from and least(p_to, public.tunis_today() - 1)
  union all
  select public.tunis_today(), a.dimension_value, a.pageviews, a.visitors, a.engaged_seconds_sum,
         a.engaged_count, a.reads, a.article_views
  from public.analytics_aggregate(public.tunis_day_start(public.tunis_today()), public.tunis_day_start(public.tunis_today() + 1)) a
  where a.dimension = p_dimension and public.tunis_today() between p_from and p_to;
$$;

create or replace function public._stats_daily_article(p_from date, p_to date)
returns table (
  date date, article_id uuid, pageviews bigint, visitors bigint, engaged_seconds_sum bigint,
  engaged_count bigint, reads bigint, source_breakdown jsonb, country_breakdown jsonb,
  device_breakdown jsonb, referrer_breakdown jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.date, d.article_id, d.pageviews::bigint, d.visitors::bigint, d.engaged_seconds_sum, d.engaged_count::bigint,
         d.reads::bigint, d.source_breakdown, d.country_breakdown, d.device_breakdown, d.referrer_breakdown
  from public.analytics_daily_article d
  where d.date between p_from and least(p_to, public.tunis_today() - 1)
  union all
  select public.tunis_today(), a.article_id, a.pageviews, a.visitors, a.engaged_seconds_sum, a.engaged_count, a.reads,
         a.source_breakdown, a.country_breakdown, a.device_breakdown, a.referrer_breakdown
  from public.analytics_aggregate_articles(public.tunis_day_start(public.tunis_today()), public.tunis_day_start(public.tunis_today() + 1)) a
  where public.tunis_today() between p_from and p_to;
$$;

-- Sum jsonb {key: n} objects.
create or replace function public._jsonb_sum(items jsonb[])
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
  from (
    select e.key as k, sum((e.value)::bigint) as n
    from unnest(items) as j(obj), jsonb_each_text(j.obj) as e
    group by e.key
    order by 2 desc
  ) s;
$$;

revoke all on function public._stats_daily(date, date, text) from public, anon, authenticated;
revoke all on function public._stats_daily_article(date, date) from public, anon, authenticated;

create or replace function public._require_editor()
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_editor_or_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end;
$$;

create or replace function public._require_staff()
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------

create or replace function public.stats_overview(p_from date, p_to date, p_locale text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  dim text := case when p_locale is null then 'site' else 'locale' end;
  val text := coalesce(p_locale, 'all');
  r record;
  monthly int;
  is_month boolean := p_from = date_trunc('month', p_from)::date
                      and p_to = (date_trunc('month', p_from) + interval '1 month - 1 day')::date;
  published int;
begin
  perform public._require_editor();
  select coalesce(sum(s.pageviews), 0) pv, coalesce(sum(s.visitors), 0) vis,
         coalesce(sum(s.engaged_seconds_sum), 0) es, coalesce(sum(s.engaged_count), 0) ec,
         coalesce(sum(s.reads), 0) rd, coalesce(sum(s.article_views), 0) av
    into r
  from public._stats_daily(p_from, p_to, dim) s
  where s.dimension_value = val;

  if is_month then
    if date_trunc('month', p_from) = date_trunc('month', public.tunis_today()::timestamp) then
      select count(distinct p.visitor_hash) into monthly from public.pageviews_raw p
      where p.occurred_at >= public.tunis_day_start(p_from) and p.occurred_at < public.tunis_day_start(p_to + 1)
        and (p_locale is null or p.locale::text = p_locale);
    else
      select u.visitors into monthly from public.analytics_monthly_uniques u
      where u.month = p_from and u.dimension = dim and u.dimension_value = val;
    end if;
  end if;

  select count(*) into published from public.articles a
  where a.first_published_at >= public.tunis_day_start(p_from) and a.first_published_at < public.tunis_day_start(p_to + 1)
    and a.status = 'published' and (p_locale is null or a.language::text = p_locale);

  return jsonb_build_object(
    'pageviews', r.pv,
    'visitors_daily_sum', r.vis,
    'visitors_monthly', monthly,
    'single_day', p_from = p_to,
    'engaged_avg_seconds', case when r.ec > 0 then round(r.es::numeric / r.ec) else null end,
    'read_rate', case when r.av > 0 then round(r.rd::numeric / r.av, 4) else null end,
    'articles_published', published
  );
end;
$$;

create or replace function public.stats_timeseries(p_from date, p_to date, p_metric text default 'pageviews', p_granularity text default 'day')
returns table (bucket date, pageviews bigint, visitors bigint, engaged_avg_seconds numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public._require_editor();
  if p_granularity not in ('day', 'week', 'month') then
    raise exception 'invalid_granularity' using errcode = '22023';
  end if;
  return query
    with days as (select generate_series(p_from, p_to, interval '1 day')::date as d),
    s as (select * from public._stats_daily(p_from, p_to, 'site'))
    select date_trunc(p_granularity, days.d)::date,
           coalesce(sum(s.pageviews), 0)::bigint, coalesce(sum(s.visitors), 0)::bigint,
           case when sum(s.engaged_count) > 0 then round(sum(s.engaged_seconds_sum)::numeric / sum(s.engaged_count)) end
    from days left join s on s.date = days.d
    group by 1 order by 1;
end;
$$;

create or replace function public.stats_top_articles(
  p_from date, p_to date, p_limit int default 10, p_category_id uuid default null, p_author_id uuid default null
)
returns table (
  article_id uuid, public_id bigint, title text, language public.content_language, published_at timestamptz,
  category_id uuid, author_names text, pageviews bigint, visitors bigint, engaged_avg_seconds numeric,
  read_rate numeric, main_source text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public._require_staff();
  if public.current_role_name() = 'author' then
    p_author_id := auth.uid();
  end if;
  return query
    with s as (
      select x.article_id, sum(x.pageviews) pv, sum(x.visitors) vis, sum(x.engaged_seconds_sum) es,
             sum(x.engaged_count) ec, sum(x.reads) rd, public._jsonb_sum(array_agg(x.source_breakdown)) src
      from public._stats_daily_article(p_from, p_to) x
      group by x.article_id
    )
    select a.id, a.public_id, a.title, a.language, a.published_at, a.category_id,
           (select string_agg(p.display_name_ar, '، ' order by aa.position) from public.article_authors aa
              join public.profiles p on p.id = aa.profile_id where aa.article_id = a.id),
           s.pv::bigint, s.vis::bigint,
           case when s.ec > 0 then round(s.es::numeric / s.ec) end,
           case when s.pv > 0 then round(s.rd::numeric / s.pv, 4) end,
           (select k from jsonb_each_text(s.src) as e(k, v) order by v::bigint desc limit 1)
    from s
    join public.articles a on a.id = s.article_id
    where (p_category_id is null or a.category_id = p_category_id
           or a.category_id in (select c.id from public.categories c where c.parent_id = p_category_id))
      and (p_author_id is null or exists (select 1 from public.article_authors aa where aa.article_id = a.id and aa.profile_id = p_author_id))
    order by s.pv desc
    limit least(greatest(p_limit, 1), 500);
end;
$$;

create or replace function public.stats_article_detail(p_article_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public._require_staff();
  if not public.is_editor_or_admin() and not exists (
    select 1 from public.article_authors aa where aa.article_id = p_article_id and aa.profile_id = auth.uid()
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  with s as (select * from public._stats_daily_article(p_from, p_to) x where x.article_id = p_article_id)
  select jsonb_build_object(
    'daily', coalesce((select jsonb_agg(jsonb_build_object('date', d.d, 'pageviews', coalesce(s2.pageviews, 0), 'visitors', coalesce(s2.visitors, 0)) order by d.d)
                       from generate_series(p_from, p_to, interval '1 day') as d(d)
                       left join s s2 on s2.date = d.d::date), '[]'::jsonb),
    'pageviews', coalesce((select sum(pageviews) from s), 0),
    'visitors_daily_sum', coalesce((select sum(visitors) from s), 0),
    'engaged_avg_seconds', (select case when sum(engaged_count) > 0 then round(sum(engaged_seconds_sum)::numeric / sum(engaged_count)) end from s),
    'read_rate', (select case when sum(pageviews) > 0 then round(sum(reads)::numeric / sum(pageviews), 4) end from s),
    'sources', (select public._jsonb_sum(array_agg(source_breakdown)) from s),
    'countries', (select public._jsonb_sum(array_agg(country_breakdown)) from s),
    'devices', (select public._jsonb_sum(array_agg(device_breakdown)) from s),
    'referrers', (select public._jsonb_sum(array_agg(referrer_breakdown)) from s)
  ) into result;
  return result;
end;
$$;

create or replace function public.stats_breakdown(p_from date, p_to date, p_dimension text, p_limit int default 20)
returns table (value text, pageviews bigint, visitors bigint, share numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public._require_editor();
  if p_dimension not in ('locale', 'source', 'country', 'device', 'category', 'referrer_host', 'utm_campaign') then
    raise exception 'invalid_dimension' using errcode = '22023';
  end if;
  return query
    with s as (
      select x.dimension_value v, sum(x.pageviews) pv, sum(x.visitors) vis
      from public._stats_daily(p_from, p_to, p_dimension) x group by 1
    ), total as (
      select coalesce(sum(x.pageviews), 0) t from public._stats_daily(p_from, p_to, 'site') x
    )
    select s.v, s.pv::bigint, s.vis::bigint, case when total.t > 0 then round(s.pv::numeric / total.t, 4) end
    from s, total
    order by s.pv desc
    limit least(greatest(p_limit, 1), 200);
end;
$$;

create or replace function public.stats_authors(p_from date, p_to date)
returns table (
  profile_id uuid, display_name_ar text, display_name_fr text, articles_published bigint,
  pageviews bigint, avg_views_per_article numeric, engaged_avg_seconds numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  only_me uuid := case when public.current_role_name() = 'author' then auth.uid() end;
begin
  perform public._require_staff();
  return query
    with s as (
      select aa.profile_id pid, sum(x.pageviews) pv, sum(x.engaged_seconds_sum) es, sum(x.engaged_count) ec,
             count(distinct x.article_id) n_viewed
      from public._stats_daily_article(p_from, p_to) x
      join public.article_authors aa on aa.article_id = x.article_id
      group by aa.profile_id
    ), pub as (
      select aa.profile_id pid, count(*) n
      from public.articles a join public.article_authors aa on aa.article_id = a.id
      where a.status = 'published' and a.first_published_at >= public.tunis_day_start(p_from)
        and a.first_published_at < public.tunis_day_start(p_to + 1)
      group by aa.profile_id
    )
    select p.id, p.display_name_ar, p.display_name_fr, coalesce(pub.n, 0)::bigint, coalesce(s.pv, 0)::bigint,
           case when coalesce(s.n_viewed, 0) > 0 then round(s.pv::numeric / s.n_viewed, 1) end,
           case when coalesce(s.ec, 0) > 0 then round(s.es::numeric / s.ec) end
    from public.profiles p
    left join s on s.pid = p.id
    left join pub on pub.pid = p.id
    where (only_me is null or p.id = only_me) and (s.pid is not null or pub.pid is not null or p.id = only_me)
    order by coalesce(s.pv, 0) desc;
end;
$$;

create or replace function public.stats_categories(p_from date, p_to date)
returns table (
  category_id uuid, parent_id uuid, name_ar text, name_fr text, pageviews bigint,
  articles_published bigint, avg_views_per_article numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public._require_editor();
  return query
    with s as (
      select x.dimension_value::uuid cid, sum(x.pageviews) pv
      from public._stats_daily(p_from, p_to, 'category') x group by 1
    ), pub as (
      select a.category_id cid, count(*) n from public.articles a
      where a.status = 'published' and a.first_published_at >= public.tunis_day_start(p_from)
        and a.first_published_at < public.tunis_day_start(p_to + 1)
      group by 1
    ), viewed as (
      select a.category_id cid, count(distinct x.article_id) n
      from public._stats_daily_article(p_from, p_to) x join public.articles a on a.id = x.article_id group by 1
    )
    select c.id, c.parent_id, c.name_ar, c.name_fr, coalesce(s.pv, 0)::bigint, coalesce(pub.n, 0)::bigint,
           case when coalesce(viewed.n, 0) > 0 then round(s.pv::numeric / viewed.n, 1) end
    from public.categories c
    left join s on s.cid = c.id
    left join pub on pub.cid = c.id
    left join viewed on viewed.cid = c.id
    order by coalesce(s.pv, 0) desc, c.position;
end;
$$;

create or replace function public.stats_realtime(p_minutes int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(mins => least(greatest(p_minutes, 1), 1440));
begin
  perform public._require_editor();
  return jsonb_build_object(
    'pageviews', (select count(*) from public.pageviews_raw where occurred_at >= since),
    'top', coalesce((
      select jsonb_agg(t) from (
        select a.id as article_id, a.public_id, a.title, a.language, count(*) as pageviews
        from public.pageviews_raw p join public.articles a on a.id = p.article_id
        where p.occurred_at >= since
        group by a.id order by count(*) desc limit 5
      ) t), '[]'::jsonb)
  );
end;
$$;

-- Author self-service ("my stats").
create or replace function public.my_summary(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
begin
  perform public._require_staff();
  select coalesce(sum(x.pageviews), 0) pv, coalesce(sum(x.visitors), 0) vis,
         coalesce(sum(x.engaged_seconds_sum), 0) es, coalesce(sum(x.engaged_count), 0) ec,
         coalesce(sum(x.reads), 0) rd
    into r
  from public._stats_daily_article(p_from, p_to) x
  where exists (select 1 from public.article_authors aa where aa.article_id = x.article_id and aa.profile_id = auth.uid());
  return jsonb_build_object(
    'pageviews', r.pv, 'visitors_daily_sum', r.vis,
    'engaged_avg_seconds', case when r.ec > 0 then round(r.es::numeric / r.ec) end,
    'read_rate', case when r.pv > 0 then round(r.rd::numeric / r.pv, 4) end,
    'articles_published', (select count(*) from public.articles a join public.article_authors aa on aa.article_id = a.id
                           where aa.profile_id = auth.uid() and a.status = 'published'
                             and a.first_published_at >= public.tunis_day_start(p_from)
                             and a.first_published_at < public.tunis_day_start(p_to + 1))
  );
end;
$$;

create or replace function public.my_article_stats(p_from date, p_to date)
returns table (
  article_id uuid, public_id bigint, title text, language public.content_language, published_at timestamptz,
  category_id uuid, author_names text, pageviews bigint, visitors bigint, engaged_avg_seconds numeric,
  read_rate numeric, main_source text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public._require_staff();
  return query select * from public.stats_top_articles(p_from, p_to, 500, null, auth.uid());
end;
$$;

-- Public "most read" ranking (ids only, no numbers). Falls back to nothing when
-- there is no data yet; the site then shows the latest articles.
create or replace function public.public_most_read(
  p_window_days int default 7, p_limit int default 5, p_category_id uuid default null, p_language public.content_language default null
)
returns table (article_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select x.article_id
  from public._stats_daily_article(public.tunis_today() - least(greatest(p_window_days, 1), 90), public.tunis_today()) x
  join public.articles a on a.id = x.article_id
  where a.status = 'published' and a.published_at <= now()
    and (p_language is null or a.language = p_language)
    and (p_category_id is null or a.category_id = p_category_id
         or a.category_id in (select c.id from public.categories c where c.parent_id = p_category_id))
  group by x.article_id
  order by sum(x.pageviews) desc
  limit least(greatest(p_limit, 1), 20);
$$;

-- Round DOWN to two significant digits (12,345 -> 12,000). Never rounds up.
create or replace function public.round_down_2sig(n numeric)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select (case
    when n is null then null
    when n < 100 then floor(n)
    else floor(n / power(10::numeric, floor(log(n)) - 1)) * power(10::numeric, floor(log(n)) - 1)
  end)::bigint;
$$;

-- The only public statistics function. Returns only the metrics enabled in
-- site_settings.media_kit, for the configured period, rounded down if configured.
create or replace function public.media_kit_public()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cfg jsonb := coalesce((select value from public.site_settings where key = 'media_kit'), '{}'::jsonb);
  metrics jsonb := coalesce(cfg -> 'metrics', '{}'::jsonb);
  period text := coalesce(cfg ->> 'period', 'last_full_month');
  rnd boolean := coalesce(cfg ->> 'rounding', 'exact') = 'round_down';
  today date := public.tunis_today();
  p_from date;
  p_to date;
  months int := 1;
  pv numeric;
  vis numeric;
  es numeric;
  ec numeric;
  total numeric;
  out jsonb := '{}'::jsonb;
  fb record;
begin
  if period = 'last_30_days' then
    p_from := today - 30; p_to := today - 1;
  elsif period = 'last_3_months_avg' then
    p_from := (date_trunc('month', today) - interval '3 months')::date;
    p_to := (date_trunc('month', today) - interval '1 day')::date;
    months := 3;
  else
    period := 'last_full_month';
    p_from := (date_trunc('month', today) - interval '1 month')::date;
    p_to := (date_trunc('month', today) - interval '1 day')::date;
  end if;

  select coalesce(sum(d.pageviews), 0), coalesce(sum(d.engaged_seconds_sum), 0), coalesce(sum(d.engaged_count), 0)
    into pv, es, ec
  from public.analytics_daily d where d.dimension = 'site' and d.date between p_from and p_to;
  total := pv;

  if period = 'last_30_days' then
    select count(distinct p.visitor_hash) into vis from public.pageviews_raw p
    where p.occurred_at >= public.tunis_day_start(p_from) and p.occurred_at < public.tunis_day_start(p_to + 1);
  else
    select coalesce(avg(u.visitors), 0) into vis from public.analytics_monthly_uniques u
    where u.dimension = 'site' and u.month between p_from and p_to;
  end if;

  out := jsonb_build_object('period', period, 'from', p_from, 'to', p_to, 'rounded', rnd);

  if coalesce((metrics ->> 'monthly_pageviews')::boolean, false) then
    out := out || jsonb_build_object('monthly_pageviews',
      case when rnd then public.round_down_2sig(floor(pv / months)) else floor(pv / months)::bigint end);
  end if;
  if coalesce((metrics ->> 'monthly_visitors')::boolean, false) then
    out := out || jsonb_build_object('monthly_visitors',
      case when rnd then public.round_down_2sig(floor(vis)) else floor(vis)::bigint end);
  end if;
  if coalesce((metrics ->> 'engaged_time')::boolean, false) then
    out := out || jsonb_build_object('engaged_avg_seconds', case when ec > 0 then floor(es / ec) end);
  end if;
  if coalesce((metrics ->> 'mobile_share')::boolean, false) then
    out := out || jsonb_build_object('mobile_share', (
      select case when total > 0 then floor(coalesce(sum(d.pageviews), 0) * 100 / total) end
      from public.analytics_daily d
      where d.dimension = 'device' and d.dimension_value = 'mobile' and d.date between p_from and p_to));
  end if;
  if coalesce((metrics ->> 'geo')::boolean, false) then
    out := out || jsonb_build_object('geo', (
      select jsonb_build_object(
        'tunisia_share', case when total > 0 then floor(coalesce(sum(t.pv) filter (where t.c = 'TN'), 0) * 100 / total) end,
        'abroad_share', case when total > 0 then floor(coalesce(sum(t.pv) filter (where t.c <> 'TN'), 0) * 100 / total) end,
        'top_countries', coalesce((
          select jsonb_agg(jsonb_build_object('country', x.c, 'share', floor(x.pv * 100 / total)) order by x.pv desc)
          from (select d.dimension_value c, sum(d.pageviews) pv from public.analytics_daily d
                where d.dimension = 'country' and d.date between p_from and p_to and d.dimension_value not in ('XX')
                group by 1 order by 2 desc limit 3) x
          where total > 0), '[]'::jsonb))
      from (select d.dimension_value c, sum(d.pageviews) pv from public.analytics_daily d
            where d.dimension = 'country' and d.date between p_from and p_to group by 1) t));
  end if;
  if coalesce((metrics ->> 'top_sections')::boolean, false) then
    out := out || jsonb_build_object('top_sections', coalesce((
      select jsonb_agg(jsonb_build_object('slug', c.slug, 'name_ar', c.name_ar, 'name_fr', c.name_fr) order by x.pv desc)
      from (select d.dimension_value::uuid cid, sum(d.pageviews) pv from public.analytics_daily d
            where d.dimension = 'category' and d.date between p_from and p_to group by 1 order by 2 desc limit 5) x
      join public.categories c on c.id = x.cid and c.is_active), '[]'::jsonb));
  end if;
  if coalesce((metrics ->> 'articles_per_month')::boolean, false) then
    out := out || jsonb_build_object('articles_per_month', (
      select floor(count(*)::numeric / months) from public.articles a
      where a.status = 'published' and a.first_published_at >= public.tunis_day_start(p_from)
        and a.first_published_at < public.tunis_day_start(p_to + 1)));
  end if;
  if coalesce((metrics ->> 'facebook_followers')::boolean, false) then
    select s.followers, s.reach_28d, s.recorded_for into fb from public.social_stats s
    where s.platform = 'facebook' and s.followers is not null order by s.recorded_for desc, s.created_at desc limit 1;
    if found then
      out := out || jsonb_build_object('facebook', jsonb_build_object(
        'followers', case when rnd then public.round_down_2sig(fb.followers) else fb.followers end,
        'reach_28d', case when rnd then public.round_down_2sig(fb.reach_28d) else fb.reach_28d end,
        'recorded_for', fb.recorded_for, 'manual', true));
    end if;
  end if;
  return out;
end;
$$;

-- Admin "system" page.
create or replace function public.admin_system_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'storage_bytes', (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects),
    'raw_pageviews', (select count(*) from public.pageviews_raw),
    'raw_engagement', (select count(*) from public.engagement_raw),
    'last_rollups', coalesce((select jsonb_agg(r order by r.started_at desc) from (
        select job, started_at, finished_at, status, detail from public.rollup_runs order by started_at desc limit 10) r), '[]'::jsonb),
    'cron_jobs', coalesce((select jsonb_agg(jsonb_build_object('name', j.jobname, 'schedule', j.schedule, 'active', j.active))
                           from cron.job j), '[]'::jsonb)
  );
end;
$$;

revoke all on function public._jsonb_sum(jsonb[]) from anon;
revoke all on function public.stats_overview(date, date, text) from public, anon;
revoke all on function public.stats_timeseries(date, date, text, text) from public, anon;
revoke all on function public.stats_top_articles(date, date, int, uuid, uuid) from public, anon;
revoke all on function public.stats_article_detail(uuid, date, date) from public, anon;
revoke all on function public.stats_breakdown(date, date, text, int) from public, anon;
revoke all on function public.stats_authors(date, date) from public, anon;
revoke all on function public.stats_categories(date, date) from public, anon;
revoke all on function public.stats_realtime(int) from public, anon;
revoke all on function public.my_summary(date, date) from public, anon;
revoke all on function public.my_article_stats(date, date) from public, anon;
revoke all on function public.admin_system_status() from public, anon;
grant execute on function public.stats_overview(date, date, text), public.stats_timeseries(date, date, text, text),
  public.stats_top_articles(date, date, int, uuid, uuid), public.stats_article_detail(uuid, date, date),
  public.stats_breakdown(date, date, text, int), public.stats_authors(date, date), public.stats_categories(date, date),
  public.stats_realtime(int), public.my_summary(date, date), public.my_article_stats(date, date),
  public.admin_system_status() to authenticated;
grant execute on function public.public_most_read(int, int, uuid, public.content_language), public.media_kit_public() to anon, authenticated;
