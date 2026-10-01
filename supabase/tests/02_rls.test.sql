\ir 00_setup.sql
-- Fixtures (as postgres)
insert into public.articles (id, title, category_id, status, published_at, created_by) values
  ('10000000-0000-4000-8000-000000000001', 'منشور', (select id from public.categories where slug = 'cap-bon'), 'published', now() - interval '1 hour', '00000000-0000-4000-8000-0000000000b1'),
  ('10000000-0000-4000-8000-000000000002', 'مسودة الكاتب الثاني', (select id from public.categories where slug = 'cap-bon'), 'draft', null, '00000000-0000-4000-8000-0000000000b2'),
  ('10000000-0000-4000-8000-000000000003', 'مبرمج للمستقبل', (select id from public.categories where slug = 'cap-bon'), 'published', now() + interval '1 day', '00000000-0000-4000-8000-0000000000e1');
insert into public.article_authors (article_id, profile_id) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000b2');

-- ===== anon =====
select tests.as_anon();
select tests.ok((select count(*) from public.articles) = 1, 'anon sees only published articles whose time has come');
select tests.ok((select count(*) from public.profiles) = 0, 'anon cannot read the profiles table');
select tests.ok((select count(*) from public.public_authors) >= 4, 'anon reads public_authors');
select tests.fails($$update public.public_authors set display_name_ar = 'x'$$, 'anon cannot write through the public_authors view');
select tests.fails($$insert into public.articles (title, category_id) values ('x', (select id from public.categories limit 1))$$, 'anon cannot insert articles');
select tests.ok(tests.affected($$update public.categories set name_ar = 'x'$$) = 0, 'anon cannot update categories');
select tests.ok((select count(*) from public.site_settings where key = 'analytics') = 0, 'anon cannot read private settings');
select tests.ok((select count(*) from public.site_settings where key = 'site_name') = 1, 'anon reads public settings');
select tests.ok((select count(*) from public.pages) = 0, 'anon cannot see draft pages');
select tests.ok((select count(*) from public.categories where slug = 'world') = 0, 'anon cannot see inactive categories');
select tests.fails($$insert into public.contact_messages (name, email, subject, message) values ('a', 'a@b.c', 'other', 'hi')$$, 'anon cannot insert contact messages directly');
select tests.ok((select count(*) from public.ad_campaigns) = 0, 'anon cannot read ad campaigns table');
reset role;

-- ===== author 1 =====
select tests.as_user('00000000-0000-4000-8000-0000000000b1');
select tests.ok((select count(*) from public.articles) = 1, 'author sees own + published, not others drafts');
insert into public.articles (id, title, category_id, status, created_by)
  values ('10000000-0000-4000-8000-000000000010', 'مسودة جديدة', (select id from public.categories where slug = 'culture'), 'draft', '00000000-0000-4000-8000-0000000000b1');
insert into public.article_authors (article_id, profile_id) values ('10000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-0000000000b1');
select tests.ok((select count(*) from public.articles) = 2, 'author created a draft');
select tests.fails($$insert into public.articles (title, category_id, status, created_by) values ('x', (select id from public.categories where slug = 'culture'), 'published', '00000000-0000-4000-8000-0000000000b1')$$, 'author cannot insert a published article');
select tests.fails($$insert into public.articles (title, category_id, status, created_by) values ('x', (select id from public.categories where slug = 'culture'), 'draft', '00000000-0000-4000-8000-0000000000b2')$$, 'author cannot create an article for someone else');
select tests.ok(tests.affected($$update public.articles set title = 'عنوان معدل' where id = '10000000-0000-4000-8000-000000000010'$$) = 1, 'author edits own draft');
select tests.ok(tests.affected($$update public.articles set status = 'in_review' where id = '10000000-0000-4000-8000-000000000010'$$) = 1, 'author submits own draft for review');
select tests.fails($$update public.articles set status = 'published' where id = '10000000-0000-4000-8000-000000000010'$$, 'author cannot publish');
select tests.fails($$update public.articles set status = 'scheduled', scheduled_for = now() + interval '1 hour' where id = '10000000-0000-4000-8000-000000000010'$$, 'author cannot schedule');
select tests.fails($$update public.articles set is_featured = true where id = '10000000-0000-4000-8000-000000000010'$$, 'author cannot feature');
select tests.ok(tests.affected($$update public.articles set title = 'x' where id = '10000000-0000-4000-8000-000000000002'$$) = 0, 'author cannot edit another author''s draft');
select tests.ok(tests.affected($$update public.articles set title = 'x' where id = '10000000-0000-4000-8000-000000000001'$$) = 0, 'author cannot edit own published article');
select tests.ok(tests.affected($$delete from public.articles where id = '10000000-0000-4000-8000-000000000010'$$) = 0, 'author cannot delete');
select tests.fails($$update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000b1'$$, 'author cannot promote self');
select tests.ok(tests.affected($$update public.profiles set bio_ar = 'سيرة' where id = '00000000-0000-4000-8000-0000000000b1'$$) = 1, 'author updates own bio');
select tests.ok(tests.affected($$update public.profiles set bio_ar = 'x' where id = '00000000-0000-4000-8000-0000000000b2'$$) = 0, 'author cannot edit another profile');
select tests.fails($$insert into public.article_authors (article_id, profile_id) values ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000b1')$$, 'author cannot attach self to another article');
select tests.ok(tests.affected($$update public.site_settings set value = '{"ar":"x"}' where key = 'site_name'$$) = 0, 'author cannot change settings');
select tests.ok(tests.affected($$update public.categories set name_ar = 'x'$$) = 0, 'author cannot change categories');
select tests.ok((select count(*) from public.contact_messages) = 0, 'author cannot read messages');
reset role;

-- ===== editor =====
select tests.as_user('00000000-0000-4000-8000-0000000000e1');
select tests.ok((select count(*) from public.articles) = 4, 'editor sees every article');
select tests.ok(tests.affected($$update public.articles set status = 'published' where id = '10000000-0000-4000-8000-000000000010'$$) = 1, 'editor publishes');
select tests.ok((select published_at is not null and first_published_at is not null from public.articles where id = '10000000-0000-4000-8000-000000000010'), 'publish sets published_at and first_published_at');
select tests.ok(tests.affected($$delete from public.articles where id = '10000000-0000-4000-8000-000000000001'$$) = 0, 'editor cannot delete a published article');
select tests.ok(tests.affected($$delete from public.articles where id = '10000000-0000-4000-8000-000000000002'$$) = 1, 'editor deletes a draft');
select tests.ok(tests.affected($$update public.site_settings set value = '{"ar":"شعار","fr":"Devise"}' where key = 'tagline'$$) = 1, 'editor edits a non-sensitive setting');
select tests.ok(tests.affected($$update public.site_settings set value = '{"client_id":"ca-pub-1","enabled":true}' where key = 'adsense'$$) = 0, 'editor cannot edit AdSense settings');
select tests.fails($$update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000e1'$$, 'editor cannot change roles');
select tests.ok(tests.affected($$update public.ad_slots set mode = 'adsense'$$) = 0, 'editor cannot change ad slots');
insert into public.categories (slug, name_ar) values ('test-cat', 'قسم تجريبي');
select tests.ok((select count(*) from public.categories where slug = 'test-cat') = 1, 'editor creates a category');
update public.categories set slug = 'test-cat-2' where slug = 'test-cat';
select tests.ok((select to_path from public.redirects where from_path = '/ar/section/test-cat') = '/ar/section/test-cat-2', 'slug change creates a redirect');
select public.delete_category_with_move((select id from public.categories where slug = 'cap-bon'), (select id from public.categories where slug = 'national'));
select tests.ok((select count(*) from public.articles a join public.categories c on c.id = a.category_id where c.slug = 'national') >= 2, 'delete with move moved the articles');
select tests.ok((select count(*) from public.categories where slug = 'cap-bon') = 0, 'delete with move deleted the category');
select tests.ok((select config ->> 'category_id' from public.homepage_sections where position = 5) = (select id::text from public.categories where slug = 'national'), 'homepage block follows the moved category');
select tests.fails($$insert into public.categories (slug, name_ar, parent_id) values ('deep', 'عميق', (select id from public.categories where slug = 'football'))$$, 'categories cannot nest deeper than two levels');
select tests.fails($$delete from public.categories where slug = 'sport'$$, 'a section with sub-sections cannot be deleted');
reset role;

-- ===== admin =====
select tests.as_user('00000000-0000-4000-8000-0000000000a1');
select tests.ok(tests.affected($$update public.profiles set role = 'editor' where id = '00000000-0000-4000-8000-0000000000b2'$$) = 1, 'admin changes a role');
select tests.fails($$update public.profiles set role = 'author' where id = '00000000-0000-4000-8000-0000000000a1'$$, 'the last admin cannot be demoted');
select tests.fails($$update public.profiles set is_active = false where id = '00000000-0000-4000-8000-0000000000a1'$$, 'the last admin cannot be deactivated');
select tests.ok(tests.affected($$update public.site_settings set value = '{"client_id":"ca-pub-123","enabled":false}' where key = 'adsense'$$) = 1, 'admin edits AdSense settings');
select tests.ok((select count(*) from public.admin_list_users()) = 4, 'admin lists users with e-mails');
update public.site_settings set value = '{"raw_retention_days": 5, "exclude_staff": false}' where key = 'analytics';
select tests.ok((select (value ->> 'raw_retention_days')::int = 35 and (value ->> 'exclude_staff')::boolean from public.site_settings where key = 'analytics'), 'retention min 35 days and staff exclusion always on');
reset role;

-- Deactivated users lose every right.
update public.profiles set is_active = false where id = '00000000-0000-4000-8000-0000000000b1';
select tests.as_user('00000000-0000-4000-8000-0000000000b1');
select tests.fails($$insert into public.articles (title, category_id, created_by) values ('x', (select id from public.categories where slug = 'culture'), '00000000-0000-4000-8000-0000000000b1')$$, 'deactivated author cannot write');
reset role;
