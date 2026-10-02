# supabase/: the database

Postgres 17 on Supabase (free plan), with Auth (staff accounts only, no reader accounts),
Storage (bucket `media`), `pg_cron` and `pg_net`. Spec: `docs/04-database.md`. Setup guide
for a new project: `APPLY.md`.

## The live project

| | |
|---|---|
| Name / ref | `alborjnews` / **`knxuskjqpsimptwxqfju`** (eu-central-1, free plan) |
| URL | `https://knxuskjqpsimptwxqfju.supabase.co` |
| Used by | the live site (https://www.elborj.workers.dev) **and** `pnpm dev` (`.env.local`). There is no separate staging database. |
| Admin user | `firasuv@gmail.com` (role `admin`) |
| Content | seed + demo content (32 articles `is_demo = true`, 3 demo authors) |
| `private.app_config` | `revalidate_url` + `revalidate_secret` (instant refresh when a scheduled article publishes) |

## How Claude Code talks to it

- **Supabase MCP** (`.mcp.json`): `mcp__supabase__execute_sql` (reads, and writes after a yes),
  `apply_migration` (schema changes), `get_advisors` (run after every DDL), `list_tables`,
  `list_extensions`, `get_logs`.
- **Supabase CLI**: always `env -u SUPABASE_ACCESS_TOKEN npx supabase … --linked --project-ref knxuskjqpsimptwxqfju`
  (`~/.bashrc` exports a token for another project that the CLI would use instead).
  Useful: `db query -f file.sql`, `db query "select …"`, `db advisors --type all`.
- No `psql` on Firas's machine (needs `sudo apt install postgresql-client-17`).

## Rules for changes

1. **Ask Firas before any write** to this database (it is production). Reads are fine.
2. **Schema change = new migration file.** `migrations/YYYYMMDDHHMMSS_name.sql`, the next
   timestamp after the last file. Never edit an applied file. Then `pnpm db:bundle` (regenerates
   `ALL_MIGRATIONS.sql`; CI fails if it is out of date), then apply with MCP `apply_migration`
   (name = file name without the timestamp), then `get_advisors`.
3. **No migration history on the live project.** Migrations 1–19 were pasted into the SQL editor,
   so `supabase_migrations.schema_migrations` doesn't exist. **Never `supabase db push` /
   `migration up`** (they would re-run everything). `apply_migration` creates the history table and
   records only the new migration; that's expected.
4. **Statistics are write-protected for everyone.** Never insert/update/delete `pageviews_raw`,
   `engagement_raw`, `analytics_daily`, `analytics_daily_article`, `analytics_monthly_uniques`,
   `analytics_salts`, `rollup_runs`, `ad_daily_stats`. Only the tracker (service role through
   `track_*` / `record_ad_*`) and the cron functions write them. Don't loosen this with RLS or grants.
5. **Content** (articles, sections, menus, settings) is edited in the admin. When asked to change
   it with SQL, remember pages are cached: after the write, expire the cache (admin «النظام» →
   regenerate, or `POST /api/revalidate` with header `x-revalidate-secret` and body
   `{"all": true}` or `{"tags": ["articles"]}`).
6. New tables in `public`: enable RLS and add policies in the same migration (Supabase's
   `rls_auto_enable` event trigger also enables RLS on new tables). New functions: `set search_path = ''`,
   `security definer` only when needed, and `revoke execute … from public, anon` unless meant to be public.
7. Keep `seed.sql` / `demo-seed.sql` / `demo-clear.sql` working on a fresh project (they're the
   setup path for a new database).

## Roles

`app_role` enum on `profiles.role`: **admin** (everything), **editor** (all content and statistics;
the Settings, Ads and Team screens are admin-only, and RLS keeps sensitive settings admin-only), **author** (own drafts; can't publish).
The auth trigger `on_auth_user_created` always creates an `author` profile; roles are raised only by
an admin (Team screen) or `bootstrap_admin.sql`. Helpers used by RLS: `current_role_name()`,
`is_staff()`, `is_editor_or_admin()`, `is_admin()`, `is_article_author(id)`, `can_edit_article(id)`,
`is_article_public(id)`.

## Tables (`public`)

| Table | What | Who writes |
|---|---|---|
| `profiles` | Staff accounts (1:1 `auth.users`): role, names AR/FR, bio, avatar, public page flag | self (not role), admin |
| `categories` | Sections, 2 levels (`parent_id`), colour, nav flag, position | editor+ |
| `article_formats` | Genres (خبر، حوار، تحقيق…), shown as kicker or not | editor+ |
| `tags` | Topics/places/people/clubs/competitions/events (`tag_kind`) | editor+, authors insert |
| `media` | Uploaded images: `storage_path`, WebP `variants`, size, focal point, caption/credit/alt | staff |
| `articles` | Title, dek, slug, `public_id` (URL number), body JSON + HTML, status, language, cover, flags (breaking, featured, sponsored), schedule | author (own drafts), editor+ |
| `article_authors`, `article_categories`, `article_tags` | Bylines, secondary sections, tags | as articles |
| `article_revisions` | Snapshots (max 30 per article, pruned nightly) | editor+ (and own) |
| `pages` | Static pages (about, charter, privacy…), AR/FR linked by `translation_group_id` | editor+ |
| `menu_items` | Header/footer menus | editor+ |
| `homepage_sections` | Homepage builder: type (`homepage_section_type`), config JSON, locale, position | editor+ |
| `site_settings` | Key/value JSON: name, tagline, logo, legal masthead, social, media kit, ads, GA4, consent… Sensitive keys (admin only): `adsense, ads_txt, ga4, analytics, consent, in_article_ads, media_kit` | editor+ / admin |
| `redirects` | Old → new paths (filled by `*_slug_redirect` triggers when a slug changes) | triggers, editor+ |
| `ad_slots` | Placements (header, in-article…), mode (`ad_mode`: off/adsense/direct/house), sizes | admin |
| `ad_campaigns` | Sponsor campaigns: creative media, link, dates, weight, target sections/language | admin |
| `ad_daily_stats` | Impressions/clicks per campaign per day | **tracker only** |
| `pageviews_raw`, `engagement_raw` | Raw first-party hits (no IP, monthly-salted visitor hash), pruned after `raw_retention_days` | **tracker only** |
| `analytics_daily`, `analytics_daily_article`, `analytics_monthly_uniques` | Rollups the dashboards and media kit read | **cron only** |
| `analytics_salts`, `rollup_runs` | Monthly hash salt; rollup log | **cron only** |
| `social_stats` | Facebook/Instagram numbers typed in monthly (labelled as manual) | editor+ (own, 24 h) |
| `contact_messages` | Contact form submissions | service role (form), editor+ read |

`private.app_config`: key/value read by `publish_scheduled()` (revalidate URL + secret). Not exposed.

Enums: `article_status` (draft, in_review, scheduled, published, archived), `content_language`
(ar, fr), `tag_kind`, `ad_mode`, `device_type`, `traffic_source`, `homepage_section_type`, `app_role`.

## Views (read model for the public site)

| View | Rows | Why `security definer` (Advisor ERROR, intended) |
|---|---|---|
| `article_cards` | published articles with section, genre, cover, bylines as JSON | shows bylines without giving anon access to `profiles` |
| `article_cards_all` | same, all statuses, `security_invoker` (admin lists) | n/a |
| `public_authors` | active staff with a public page | only public columns of `profiles` |
| `public_ad_slots`, `active_ad_campaigns` | active slots; running campaigns (render fields only) | no click URLs or numbers |

## Functions (RPCs)

- **Public**: `search_articles(q, lang, limit, offset, category, since)`, `public_most_read(...)`,
  `media_kit_public()` (live, rounded-down audience numbers).
- **Admin/stats** (each checks the role first, raises `not_allowed`): `stats_overview`,
  `stats_timeseries`, `stats_top_articles`, `stats_breakdown`, `stats_categories`, `stats_authors`,
  `stats_article_detail`, `stats_realtime`, `my_summary`, `my_article_stats`, `ad_campaign_report`,
  `admin_list_users`, `admin_system_status`, `run_rollup` (admin; recomputes from raw data, can't
  set numbers).
- **Editorial**: `delete_category_with_move`, `reorder_categories`, `reorder_rows`, `merge_tags`,
  `media_usage`, `category_article_counts`.
- **Tracker (service role only)**: `track_pageview`, `track_engagement`, `record_ad_impression`, `record_ad_click`.
- **Cron (service role only)**: `publish_scheduled`, `expire_breaking`, `rollup_hourly`,
  `rollup_nightly`, `rollup_day`, `rollup_month_uniques`, `rotate_salt`, `ensure_salt`.
- **Helpers**: `slugify`, `article_slug`, `normalize_ar` (search), `immutable_unaccent`,
  `estimate_reading_minutes`, `tunis_today`, `tunis_day_start`, `round_down_2sig`, `html_is_safe`, `media_json`.

## Triggers

- `articles`: `articles_derive` (slug from title, excerpt, reading time, search vector, published dates), `articles_author_guard`
  (authors can't publish/schedule/feature), `articles_html_guard` (refuses scripts, event handlers,
  `javascript:`/`data:` URLs, non-allowlisted iframes). `pages`: html guard too.
- `*_slug_redirect` on categories, tags, pages, profiles: a slug change adds a redirect.
- `categories_depth_guard` (max 2 levels), `profiles_guard` (no self-promotion), `site_settings_validate`.
- `auth.users` → `on_auth_user_created` → `handle_new_user()` creates the `author` profile.

## Cron jobs (UTC; Tunisia is UTC+1 all year)

| Job | Schedule | What |
|---|---|---|
| `publish_scheduled` | every minute | publish due scheduled articles, then call `/api/revalidate` via `pg_net` if `app_config` is set |
| `expire_breaking` | `*/5 * * * *` | clear expired breaking flags |
| `rollup_hourly` | `5 * * * *` | roll up today and yesterday |
| `rollup_nightly` | `15 1 * * *` (02:15 Tunis) | full rollup of yesterday, monthly uniques, prune raw rows and revisions |
| `rotate_salt` | `5 0 1 * *` | next month's salt, delete old salts |
| `purge_cron_history` | `30 3 * * *` | keep `cron.job_run_details` small |

## Storage

Bucket `media` (public read, staff write, images only). Paths `YYYY/MM/<uuid>/original.webp`,
`w480.webp`, `w960.webp`, `w1600.webp` (processed in the browser before upload, EXIF dropped).

## Files here

| File | Purpose |
|---|---|
| `migrations/` | 19 numbered migrations (source of truth for the schema) |
| `ALL_MIGRATIONS.sql` | Generated by `pnpm db:bundle`; paste into the SQL editor for a new project |
| `seed.sql` | Base data: sections, genres, places, homepage, ad slots, draft pages, settings, footer menu |
| `demo-seed.sql` / `demo-clear.sql` | Demo content (generated by `pnpm db:demo` from `scripts/demo/content.ts`) / its removal |
| `bootstrap_admin.sql` | Makes a user admin (edit the e-mail twice) |
| `tests/` | SQL tests (`pnpm test:db`, **local database only**: they truncate analytics tables) |
| `APPLY.md` | Step-by-step setup of a new project |
| `config.toml` | Local Supabase CLI config (`npx supabase start`) |

## Known Advisor findings (reviewed 2026-10-01)

Security definer views ×4 (intended, above); SECURITY DEFINER functions callable by anon/
authenticated (role helpers needed by RLS, RPCs that check roles, trigger functions); RLS without
policies on raw analytics/salts/app_config (intended lock); leaked-password protection (paid plan
only). Optional hygiene migration not yet written: revoke anon execute on trigger functions,
`admin_list_users`, `ad_campaign_report`, `unique_profile_slug`; wrap `auth.uid()` in
`(select auth.uid())` in the 8 policies flagged `auth_rls_initplan`. Details: `docs/HANDOFF.md`.
