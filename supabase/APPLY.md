# Setting up the database (Supabase) — step by step

This guide is for someone who has never used Supabase. It takes about 20 minutes.
Everything here is on the **free plan**. You will paste a few files into the
Supabase "SQL editor" and copy three values into the website settings.

Files used (all in this `supabase/` folder):

| File | What it does | When |
|---|---|---|
| `ALL_MIGRATIONS.sql` | Creates every table, rule and scheduled job | Once, on a new project |
| `seed.sql` | Sections, genres, places, homepage layout, ad slots, draft static pages, settings | Once, right after |
| `demo-seed.sql` | ~30 demo articles marked «[تجريبي]» and 3 demo authors (optional) | Optional, to try the site |
| `demo-clear.sql` | Removes everything created by `demo-seed.sql` | Before launch |
| `bootstrap_admin.sql` | Makes your user the first admin | Once, after creating your user |

> Never edit a file in `migrations/` after it has been applied. Changes always come
> as a new numbered file (and a regenerated `ALL_MIGRATIONS.sql`).

---

## 1. إنشاء المشروع — Create the project

1. Go to <https://supabase.com>, sign up (free), then **New project**.
2. Name: `el-borj` (any name works). Database password: click **Generate**, then save
   the password in a safe place (a password manager). You need it only for backups.
3. Region: pick the one closest to Tunisia, e.g. **Central EU (Frankfurt)** or
   **West EU (Paris)** if offered.
4. Plan: **Free**. Click **Create new project** and wait 1–2 minutes.

## 2. إعدادات الدخول — Auth settings

In the left menu: **Authentication**.

1. **Sign In / Providers → Email**: keep Email enabled. Turn **off**
   "Allow new users to sign up" (only you invite staff; readers have no accounts).
   Keep "Confirm email" on.
2. **URL Configuration**:
   - Site URL: your domain, e.g. `https://elborj.tn` (until you have it, use the
     Cloudflare address, e.g. `https://el-borj.<your-account>.workers.dev`).
   - Redirect URLs: add
     - `https://elborj.tn/**`
     - `https://www.elborj.workers.dev/**`
     - `http://localhost:3000/**`
3. (Optional) **Emails → Templates**: you can translate the "Invite user" and
   "Reset password" e-mails into Arabic.

## 3. تشغيل الجداول — Run the migrations

1. Left menu: **SQL Editor** → **New query**.
2. Open `supabase/ALL_MIGRATIONS.sql` in a text editor, select all, copy, paste into
   the SQL editor, click **Run**. It takes a few seconds and ends with
   "Success. No rows returned" (or one row from `rotate_salt`).
   - If you see `extension "pg_cron" is not available` or similar: go to
     **Database → Extensions**, enable **pg_cron** and **pg_net**, then run the file again
     on a **new** project (or ask for help: the file is meant to run once).

   *Alternative for developers:* `npx supabase link --project-ref <ref>` then
   `npx supabase db push` applies the numbered files in `migrations/`.
   *Alternative with the Supabase MCP server (Claude Code):* apply each file in
   `migrations/` in order with the `apply_migration` tool (name = file name without
   the timestamp, query = file content), then run `seed.sql` with `execute_sql`.

## 4. البيانات الأساسية — Base data

New query → paste the whole of `seed.sql` → **Run**.
It is safe to run only once (running it twice does not duplicate anything).

## 5. محتوى تجريبي (اختياري) — Demo content (optional)

New query → paste `demo-seed.sql` → **Run**. Every demo article title starts with
«[تجريبي]» or «[Démo]». Remove all of it before launch with `demo-clear.sql`
(New query → paste → Run). Real content is never touched by `demo-clear.sql`.

## 6. حسابك — Your admin account

1. **Authentication → Users → Add user → Create new user**: your e-mail, a strong
   password, tick **Auto confirm user** → **Create user**.
2. **SQL Editor** → New query → paste `bootstrap_admin.sql`, replace
   `YOUR-EMAIL@example.com` (twice) with your e-mail → **Run**.
   The result shows one line with `role = admin`.
3. Later, invite other staff from the admin (**الفريق / Équipe**): they receive an
   e-mail to set their password.

## 7. المفاتيح — Keys for the website

Left menu: **Project Settings → API Keys** (and **Data API** for the URL).

| Value in Supabase | Environment variable | Secret? |
|---|---|---|
| Project URL (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` | no |
| **Publishable key** (`sb_publishable_...`) — or the legacy `anon` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no |
| **Secret key** (`sb_secret_...`) — or the legacy `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **YES — never share, never put in the browser** |

How to set them on Cloudflare is in `docs/DEPLOY.md`. For local development put them
in `.env.local` (copy `.env.example`).

## 8. (اختياري) تحديث فوري للمقالات المبرمجة — Instant refresh for scheduled articles (optional)

Scheduled articles are published by the database every minute and appear on the
site within 60 seconds anyway. To make them appear instantly, tell the database how
to call the site (replace both values; the secret is your `REVALIDATE_SECRET`):

```sql
insert into private.app_config (key, value) values
  ('revalidate_url', 'https://elborj.tn/api/revalidate'),
  ('revalidate_secret', 'PASTE-REVALIDATE_SECRET-HERE')
on conflict (key) do update set value = excluded.value;
```

## 9. التحقق — Check that everything worked

Run these in the SQL editor. Expected results are in the comments.

```sql
select count(*) from public.categories;            -- 19
select count(*) from public.article_formats;       -- 11
select count(*) from public.tags where kind = 'place'; -- 8
select count(*) from public.homepage_sections;     -- 13
select count(*) from public.pages;                 -- 12 (all drafts)
select count(*) from public.ad_slots;              -- 9 (all "off")
select key from public.site_settings order by key; -- 19 keys incl. site_name, media_kit
select jobname, schedule from cron.job order by jobname;
-- expire_breaking */5 * * * *, publish_scheduled * * * * *, purge_cron_history,
-- rollup_hourly 5 * * * *, rollup_nightly 15 1 * * *, rotate_salt 5 0 1 * *
select count(*) from public.analytics_salts;       -- 2
select id, public from storage.buckets;            -- media | true
select role, display_name_ar from public.profiles; -- your line with role = admin
-- Statistics are protected: this must FAIL with "permission denied" when run as a
-- logged-in user (the SQL editor runs as the database owner, so it would succeed there;
-- the automated tests in supabase/tests/03_analytics.test.sql check it properly).
```

Also open the website: the homepage shows the paper's name and sections (empty
until you publish or load demo content), and `/ar/admin/login` lets you log in.

## 10. حدود الخطة المجانية — Free plan limits to know

- Database 500 MB, storage 1 GB, 50,000 monthly active users (we only have staff).
- A free project with **no activity for 7 days is paused**. A live site with readers
  and the scheduled jobs counts as activity; if it ever pauses, click **Restore** in
  the dashboard. The admin **النظام / Système** page shows the database and storage
  size against the limits.
- No automatic downloadable backups on the free plan: use `scripts/backup.sh`
  weekly (see `docs/DEPLOY.md`).
