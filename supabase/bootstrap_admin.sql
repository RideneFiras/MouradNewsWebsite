-- bootstrap_admin.sql — make the first user an admin.
--
-- 1. In the Supabase dashboard: Authentication -> Users -> "Add user" ->
--    "Create new user". Enter your e-mail and a strong password, tick
--    "Auto confirm user".
-- 2. Replace YOUR-EMAIL@example.com below with that e-mail (keep the quotes).
-- 3. Paste this whole file into the SQL editor and press "Run".
-- 4. You should see one row with role = admin. Log in at /ar/admin/login.
--
-- Run it again with another e-mail to add a second admin later (or use the
-- "الفريق / Équipe" screen in the admin, which is easier).

update public.profiles
   set role = 'admin',
       is_active = true,
       display_name_ar = case when display_name_ar = split_part(u.email, '@', 1) then 'مراد ريدان' else display_name_ar end,
       display_name_fr = coalesce(display_name_fr, 'Mourad Ridene'),
       title_ar = coalesce(title_ar, 'رئيس التحرير'),
       title_fr = coalesce(title_fr, 'Rédacteur en chef')
  from auth.users u
 where u.id = public.profiles.id
   and lower(u.email) = lower('YOUR-EMAIL@example.com');

select p.id, u.email, p.role, p.display_name_ar, p.slug
  from public.profiles p join auth.users u on u.id = p.id
 where lower(u.email) = lower('YOUR-EMAIL@example.com');
