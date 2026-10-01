\ir 00_setup.sql
insert into public.articles (id, title, subtitle, body_text, category_id, status, scheduled_for, created_by) values
  ('50000000-0000-4000-8000-000000000001', 'مُبارَاة الكُرَة الطّائِرة في قليبية', 'النادي يفوز', 'نص المقال عن المباراة', (select id from public.categories where slug = 'volleyball'), 'scheduled', now() - interval '1 minute', '00000000-0000-4000-8000-0000000000e1'),
  ('50000000-0000-4000-8000-000000000002', 'Festival de Kélibia', null, 'Le festival du film amateur', (select id from public.categories where slug = 'culture'), 'scheduled', now() + interval '1 day', '00000000-0000-4000-8000-0000000000e1');
update public.articles set language = 'fr' where id = '50000000-0000-4000-8000-000000000002';

select tests.ok(public.publish_scheduled() = 1, 'publish_scheduled publishes the due article only');
select tests.ok((select status = 'published' and published_at is not null and first_published_at = published_at and scheduled_for is null from public.articles where id = '50000000-0000-4000-8000-000000000001'), 'scheduled article published with dates');
select tests.ok((select status = 'scheduled' from public.articles where id = '50000000-0000-4000-8000-000000000002'), 'future article still scheduled');

update public.articles set is_breaking = true, breaking_until = now() - interval '1 minute' where id = '50000000-0000-4000-8000-000000000001';
select tests.ok(public.expire_breaking() = 1, 'expired breaking flag removed');

update public.articles set is_breaking = true, breaking_until = null where id = '50000000-0000-4000-8000-000000000001';
select tests.ok((select breaking_until > now() + interval '5 hours' from public.articles where id = '50000000-0000-4000-8000-000000000001'), 'breaking gets the default duration');

select tests.as_anon();
select tests.ok((select count(*) from public.search_articles('مباراة الكرة الطائرة')) = 1, 'search without diacritics finds the article');
select tests.ok((select count(*) from public.search_articles('مُبارَاة')) = 1, 'search with diacritics finds the article');
select tests.ok((select count(*) from public.search_articles('الطايره')) = 1, 'search with different hamza/ta marbuta spelling');
select tests.ok((select count(*) from public.search_articles('festival')) = 0, 'unpublished articles are not searchable');
select tests.ok((select count(*) from public.search_articles('')) = 0, 'empty query returns nothing');
select tests.ok((select count(*) from public.search_articles($$'"&|!():*$$)) = 0, 'punctuation-only query is safe');
reset role;

update public.articles set status = 'published' where id = '50000000-0000-4000-8000-000000000002';
select tests.as_anon();
select tests.ok((select count(*) from public.search_articles('kelibia')) = 1, 'French search ignores accents');
select tests.ok((select count(*) from public.search_articles('kelibia', 'ar')) = 0, 'language filter');
reset role;

-- Article derived fields
select tests.ok((select slug = 'مباراة-الكرة-الطائرة-في-قليبية' from public.articles where id = '50000000-0000-4000-8000-000000000001'), 'article slug generated without diacritics');
select tests.ok((select excerpt = 'نص المقال عن المباراة' from public.articles where id = '50000000-0000-4000-8000-000000000001'), 'excerpt auto-filled from body');
select tests.fails($$insert into public.articles (title, category_id, is_sponsored) values ('x', (select id from public.categories limit 1), true)$$, 'sponsored needs a sponsor name');
insert into public.articles (id, title, category_id, is_sponsored, sponsor_name) values ('50000000-0000-4000-8000-000000000009', 'x', (select id from public.categories limit 1), true, 'راع');
select tests.ok((select not allow_ads from public.articles where id = '50000000-0000-4000-8000-000000000009'), 'sponsored articles default to no ads');
