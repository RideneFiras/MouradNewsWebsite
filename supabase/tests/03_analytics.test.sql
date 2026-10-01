\ir 00_setup.sql
insert into public.articles (id, title, body_text, category_id, status, published_at, created_by) values
  ('20000000-0000-4000-8000-000000000001', 'مقال للقياس', 'نص', (select id from public.categories where slug = 'volleyball'), 'published', now() - interval '2 hours', '00000000-0000-4000-8000-0000000000b1');
insert into public.article_authors (article_id, profile_id) values ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1');
with m as (insert into public.media (storage_path) values ('test/ad.webp') returning id)
insert into public.ad_campaigns (id, sponsor_name, slot_key, click_url, creative_desktop_media_id)
select '30000000-0000-4000-8000-000000000001', 'راع', 'sidebar_top', 'https://example.com/', m.id from m;

-- ===== No human can write statistics, admin included =====
select tests.as_user('00000000-0000-4000-8000-0000000000a1');
select tests.fails($$insert into public.pageviews_raw (pv_id, path, locale, visitor_hash) values (gen_random_uuid(), '/ar', 'ar', '\x00')$$, 'admin cannot insert raw page views');
select tests.fails($$select count(*) from public.pageviews_raw$$, 'admin cannot even read raw page views');
select tests.fails($$insert into public.analytics_daily (date, dimension, dimension_value, pageviews) values (current_date, 'site', 'all', 999999)$$, 'admin cannot insert rollups');
select tests.fails($$update public.analytics_daily set pageviews = 999999$$, 'admin cannot update rollups');
select tests.fails($$delete from public.analytics_daily$$, 'admin cannot delete rollups');
select tests.fails($$update public.analytics_daily_article set pageviews = 999999$$, 'admin cannot update article rollups');
select tests.fails($$update public.analytics_monthly_uniques set visitors = 999999$$, 'admin cannot update monthly uniques');
select tests.fails($$insert into public.ad_daily_stats (date, campaign_id, impressions) values (current_date, '30000000-0000-4000-8000-000000000001', 1000)$$, 'admin cannot insert ad stats');
select tests.fails($$update public.ad_daily_stats set clicks = 1000$$, 'admin cannot update ad stats');
select tests.fails($$select public.track_pageview(gen_random_uuid(), '/ar', null, null, 'ar', 'direct', null, null, null, null, 'TN', 'mobile', '1.2.3.4', 'ua')$$, 'admin cannot call the tracker function');
select tests.fails($$select public.record_ad_impression('30000000-0000-4000-8000-000000000001')$$, 'admin cannot call the ad counter');
select tests.fails($$select public.rollup_day(current_date)$$, 'admin cannot call internal rollup functions');
select tests.fails($$select * from public.analytics_salts$$, 'admin cannot read salts');
select tests.fails($$insert into public.rollup_runs (job) values ('fake')$$, 'admin cannot fake rollup runs');
reset role;

select tests.as_user('00000000-0000-4000-8000-0000000000e1');
select tests.fails($$update public.analytics_daily set pageviews = 1$$, 'editor cannot update rollups');
reset role;

select tests.as_anon();
select tests.fails($$select public.stats_overview(current_date, current_date)$$, 'anon cannot call dashboard stats');
select tests.fails($$insert into public.pageviews_raw (pv_id, path, locale, visitor_hash) values (gen_random_uuid(), '/ar', 'ar', '\x00')$$, 'anon cannot insert raw page views');
select tests.ok(public.media_kit_public() ? 'period', 'anon can read the media kit numbers');
reset role;

-- Authors cannot read site-wide stats.
select tests.as_user('00000000-0000-4000-8000-0000000000b2');
select tests.fails($$select public.stats_overview(current_date, current_date)$$, 'author cannot read site-wide stats');
select tests.fails($$select public.stats_article_detail('20000000-0000-4000-8000-000000000001', current_date, current_date)$$, 'author cannot read stats of someone else''s article');
reset role;

-- ===== Ingestion through the service role =====
set local role service_role;
select public.track_pageview('40000000-0000-4000-8000-000000000001', '/ar/article/x', (select public_id from public.articles where id = '20000000-0000-4000-8000-000000000001'), null, 'ar', 'facebook', 'm.facebook.com', null, null, null, 'TN', 'mobile', '1.2.3.4', 'UA-1');
select public.track_pageview('40000000-0000-4000-8000-000000000002', '/ar/article/x', (select public_id from public.articles where id = '20000000-0000-4000-8000-000000000001'), null, 'ar', 'whatsapp', null, 'whatsapp', 'share', null, 'FR', 'mobile', '5.6.7.8', 'UA-2');
select public.track_pageview('40000000-0000-4000-8000-000000000003', '/ar', null, null, 'ar', 'direct', null, null, null, null, 'TN', 'desktop', '1.2.3.4', 'UA-1');
-- Same pv_id twice: counted once.
select public.track_pageview('40000000-0000-4000-8000-000000000003', '/ar', null, null, 'ar', 'direct', null, null, null, null, 'TN', 'desktop', '1.2.3.4', 'UA-1');
-- Unpublished / unknown article: dropped.
select public.track_pageview('40000000-0000-4000-8000-000000000004', '/ar/article/999999', 999999, null, 'ar', 'direct', null, null, null, null, 'TN', 'desktop', '9.9.9.9', 'UA-9');
select public.track_engagement('40000000-0000-4000-8000-000000000001', 40, 90);
select public.track_engagement('40000000-0000-4000-8000-000000000001', 20, 50); -- lower values never overwrite
select public.track_engagement('40000000-0000-4000-8000-000000000002', 5000, 10); -- capped at 1800
select public.record_ad_impression('30000000-0000-4000-8000-000000000001');
select public.record_ad_impression('30000000-0000-4000-8000-000000000001');
select tests.ok(public.record_ad_click('30000000-0000-4000-8000-000000000001') = 'https://example.com/', 'ad click returns the target URL');
select public.rollup_day(public.tunis_today());
select public.rollup_month_uniques(public.tunis_today());
reset role;

select tests.ok((select count(*) from public.pageviews_raw) = 3, 'three page views stored (duplicate and unknown article dropped)');
select tests.ok(not exists (select 1 from information_schema.columns where table_name = 'pageviews_raw' and column_name in ('ip', 'user_agent')), 'no IP or user agent column exists');
select tests.ok((select engaged_seconds = 40 and max_scroll_pct = 90 from public.engagement_raw where pv_id = '40000000-0000-4000-8000-000000000001'), 'engagement keeps the max');
select tests.ok((select engaged_seconds = 1800 from public.engagement_raw where pv_id = '40000000-0000-4000-8000-000000000002'), 'engaged time capped at 1800');
select tests.ok((select pageviews = 3 and visitors = 2 and reads = 1 and article_views = 2 from public.analytics_daily where date = public.tunis_today() and dimension = 'site'), 'site rollup: 3 views, 2 visitors, 1 read');
select tests.ok((select pageviews = 2 and (source_breakdown ->> 'facebook')::int = 1 and (source_breakdown ->> 'whatsapp')::int = 1 from public.analytics_daily_article where article_id = '20000000-0000-4000-8000-000000000001'), 'article rollup with source breakdown');
select tests.ok((select visitors = 2 from public.analytics_monthly_uniques where dimension = 'site'), 'monthly uniques');
select tests.ok((select visitors = 2 from public.analytics_monthly_uniques where dimension = 'author' and dimension_value = '00000000-0000-4000-8000-0000000000b1'), 'author monthly uniques');
select tests.ok((select impressions = 2 and clicks = 1 from public.ad_daily_stats where campaign_id = '30000000-0000-4000-8000-000000000001'), 'ad counters');
-- Rollups are idempotent.
select public.rollup_day(public.tunis_today());
select tests.ok((select pageviews = 3 from public.analytics_daily where date = public.tunis_today() and dimension = 'site'), 'rollup is idempotent');

-- Editors read stats; authors read their own.
select tests.as_user('00000000-0000-4000-8000-0000000000e1');
select tests.ok((public.stats_overview(public.tunis_today(), public.tunis_today()) ->> 'pageviews')::int = 3, 'editor overview (live today)');
select tests.ok((select count(*) from public.stats_top_articles(public.tunis_today() - 7, public.tunis_today())) = 1, 'editor top articles');
select tests.ok((public.stats_realtime(30) ->> 'pageviews')::int = 3, 'realtime from raw');
select tests.ok((select count(*) from public.stats_breakdown(public.tunis_today(), public.tunis_today(), 'source')) = 3, 'sources breakdown');
reset role;
select tests.as_user('00000000-0000-4000-8000-0000000000b1');
select tests.ok((public.my_summary(public.tunis_today(), public.tunis_today()) ->> 'pageviews')::int = 2, 'author sees own article stats');
select tests.ok((public.stats_article_detail('20000000-0000-4000-8000-000000000001', public.tunis_today(), public.tunis_today()) ->> 'pageviews')::int = 2, 'author reads own article detail');
select tests.ok((select count(*) from public.stats_authors(public.tunis_today(), public.tunis_today())) = 1, 'author sees only self in author stats');
reset role;

-- Social stats: human data, editors insert, labeled manual in the media kit.
select tests.as_user('00000000-0000-4000-8000-0000000000e1');
insert into public.social_stats (platform, recorded_for, followers) values ('facebook', current_date, 12345);
reset role;
update public.site_settings set value = jsonb_set(value, '{period}', '"last_30_days"') where key = 'media_kit';
select tests.ok((public.media_kit_public() -> 'facebook' ->> 'followers')::int = 12000 and (public.media_kit_public() -> 'facebook' ->> 'manual')::boolean, 'media kit: facebook rounded down and flagged manual');
update public.site_settings set value = jsonb_set(value, '{metrics,monthly_pageviews}', 'false') where key = 'media_kit';
select tests.ok(not (public.media_kit_public() ? 'monthly_pageviews'), 'media kit hides disabled metrics');
