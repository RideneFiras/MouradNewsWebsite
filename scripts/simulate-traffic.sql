-- LOCAL ONLY (see simulate-traffic.sh). Deterministic pseudo-traffic for 45 days.
\o /dev/null
select setseed(0.42);

truncate public.engagement_raw, public.pageviews_raw, public.analytics_daily,
  public.analytics_daily_article, public.analytics_monthly_uniques, public.rollup_runs;

create temp table sim_articles as
  select a.id, a.category_id, a.language, a.published_at,
         row_number() over (order by a.published_at desc) as rn
  from public.articles a where a.status = 'published';

create temp table sim_cats as select id, row_number() over (order by position) rn from public.categories where is_active and parent_id is null;

do $$
declare
  d int;
  day_start timestamptz;
  n int;
  arts uuid[];
  cats uuid[] := array(select id from sim_cats order by rn);
begin
  for d in reverse 44..0 loop
    day_start := public.tunis_day_start(public.tunis_today() - d);
    arts := array(select id from sim_articles where published_at <= day_start + interval '20 hours' order by published_at desc);
    if coalesce(array_length(arts, 1), 0) = 0 then
      arts := array(select id from sim_articles order by published_at);
    end if;
    -- Base audience with weekly rhythm and a slow upward trend; today is partial.
    n := (420 + (44 - d) * 6 + 90 * sin(d / 1.1) + case when extract(isodow from day_start) in (6, 7) then 110 else 0 end)::int;
    if d = 0 then
      n := (n * least(1, extract(epoch from now() - day_start) / 86400))::int;
    end if;
    insert into public.pageviews_raw (pv_id, occurred_at, path, article_id, category_id, locale, source, referrer_host,
                                      utm_source, utm_medium, utm_campaign, country, device, visitor_hash)
    select gen_random_uuid(),
           least(now() - interval '1 minute', day_start + make_interval(secs => (86400 * power(r.r_t, 0.7))::int)),
           case when art.id is not null then '/' || art.language || '/article/sim' else '/ar' end,
           art.id, coalesce(art.category_id, case when r.r_k < 0.5 then cats[1 + floor(r.r_k * 2 * array_length(cats, 1))::int] end),
           coalesce(art.language, case when r.r_l < 0.12 then 'fr' else 'ar' end::public.content_language),
           src.s::public.traffic_source,
           case src.s when 'facebook' then 'facebook.com' when 'google' then 'google.com' when 'x' then 't.co'
                      when 'referral' then (array['kapitalis.com','tunisienumerique.com','espace-manager.com'])[1 + floor(r.r_l * 3)::int] end,
           case when src.s = 'facebook' and r.r_u < 0.5 then 'facebook' end,
           case when src.s = 'facebook' and r.r_u < 0.5 then 'social' end,
           case when src.s = 'facebook' and r.r_u < 0.3 then 'page-post' end,
           (case when r.r_c < 0.78 then 'TN' when r.r_c < 0.86 then 'FR' when r.r_c < 0.89 then 'DZ' when r.r_c < 0.91 then 'LY'
                 when r.r_c < 0.93 then 'DE' when r.r_c < 0.95 then 'IT' when r.r_c < 0.97 then 'CA' else 'XX' end),
           (case when r.r_d < 0.79 then 'mobile' when r.r_d < 0.96 then 'desktop' else 'tablet' end)::public.device_type,
           extensions.digest('sim-visitor-' || floor(power(r.r_v, 1.6) * (n * 7))::text, 'sha256')
    from generate_series(1, n) g
    cross join lateral (select random() + g * 0 r_a, random() + g * 0 r_s, random() + g * 0 r_c, random() + g * 0 r_d,
                               random() + g * 0 r_k, random() + g * 0 r_i, random() + g * 0 r_t, random() + g * 0 r_l,
                               random() + g * 0 r_u, random() + g * 0 r_v) r
    left join sim_articles art
      on r.r_a < 0.82 and art.id = arts[1 + floor(power(r.r_i, 2.2) * array_length(arts, 1))::int]
    cross join lateral (select case
        when r.r_s < 0.44 then 'facebook' when r.r_s < 0.60 then 'google' when r.r_s < 0.74 then 'direct'
        when r.r_s < 0.84 then 'whatsapp' when r.r_s < 0.92 then 'internal' when r.r_s < 0.95 then 'referral'
        when r.r_s < 0.97 then 'instagram' when r.r_s < 0.98 then 'x' else 'other_search' end as s) src;
  end loop;
end $$;

insert into public.engagement_raw (pv_id, engaged_seconds, max_scroll_pct)
select pv_id,
       case when article_id is not null then 15 + floor(power(random(), 1.4) * 240)::int else 3 + floor(random() * 40)::int end,
       case when article_id is not null then least(100, 10 + floor(random() * 100)::int) else floor(random() * 60)::int end
from public.pageviews_raw where random() < 0.72;

select public.rollup_day(public.tunis_today() - g) from generate_series(0, 44) g;
select public.rollup_month_uniques(public.tunis_today());
select public.rollup_month_uniques((date_trunc('month', public.tunis_today()) - interval '1 day')::date);
select public.rollup_month_uniques((date_trunc('month', public.tunis_today()) - interval '1 month' - interval '1 day')::date);
insert into public.rollup_runs (job, finished_at, status, detail) values ('simulate_traffic (local)', now(), 'ok', 'local simulated data');

insert into public.social_stats (platform, recorded_for, followers, reach_28d, engagement_28d, note, entered_by)
select 'facebook', public.tunis_today() - 3, 48200, 312000, 21400, 'مثال محلي', (select id from public.profiles where role = 'admin' limit 1)
where not exists (select 1 from public.social_stats);

\o
select count(*) as raw_pageviews from public.pageviews_raw;
