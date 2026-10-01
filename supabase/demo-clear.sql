-- demo-clear.sql — removes everything created by demo-seed.sql (is_demo = true).
-- Real content is never touched. Safe to run several times.
begin;

-- Statistics rows that point to demo articles go with them (FK cascade / set null).
delete from public.articles where is_demo;
delete from public.tags where is_demo and not exists (select 1 from public.article_tags t where t.tag_id = tags.id);
delete from public.ad_campaigns where creative_desktop_media_id in (select id from public.media where is_demo)
   or creative_mobile_media_id in (select id from public.media where is_demo);
update public.profiles set avatar_media_id = null where avatar_media_id in (select id from public.media where is_demo);
delete from public.media where is_demo;
-- Demo authors: their auth users (profiles cascade). Their articles were removed above.
delete from auth.users where id in (select id from public.profiles where is_demo);

commit;

select 'demo content removed' as result,
       (select count(*) from public.articles where is_demo) as demo_articles_left,
       (select count(*) from public.profiles where is_demo) as demo_authors_left;
