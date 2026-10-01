# Decisions log

Choices made during the build where the spec was silent, conflicted with reality, or
needed a free-tier alternative. Newest sections are appended at the end of each group.

## Verified facts (Phase 0, 2026-10-01)

| Topic | Spec said | Verified reality | What we did |
|---|---|---|---|
| Next.js / OpenNext | "newest Next.js that `@opennextjs/cloudflare` supports" | `@opennextjs/cloudflare@1.20.7` peer range: `next >=15.5.26 <16 \|\| >=16.3.6`; docs: "all minor and patch versions of Next.js 16" supported | **Next.js 16.3.8**, React 19.3, OpenNext 1.20.7, Wrangler 4.146 |
| Middleware | — | Next 16 renames `middleware.ts` to `proxy.ts` (Node runtime). OpenNext docs: "Node Middleware … not yet supported" | Kept `src/middleware.ts` (deprecated but supported, edge-style). Build warns; it works with OpenNext. Migrate when OpenNext supports `proxy.ts`. |
| Worker size limit | 3 MiB gzip on Free, 10 MiB on Paid | Cloudflare's limits page (fetched 2026-10-01) now says **64 MiB uncompressed on both plans, no compressed limit**. OpenNext docs still quote 3 MiB / 10 MiB compressed. | We keep the stricter **3 MiB gzip** target from the spec and measure every phase with `pnpm bundle:size` (wrangler dry run). |
| Workers Free CPU | — | **10 ms CPU per request**, 50 sub-requests per request, 100k requests/day, 1 s startup | Pages are cached (ISR in R2 + Cache API), so most requests do no rendering. Public pages are built with very few DB calls (`article_cards` view) to stay well under 50 sub-requests. If CPU limits are hit at render time, see "Upgrade path" in README. |
| Durable Objects on Free | — | Available on Free, **SQLite-backed only** (100k req/day, 5 GB) | OpenNext DO queue uses SQLite class (`new_sqlite_classes`). |
| R2 | — | Free tier 10 GB-month, 1M class A / 10M class B ops per month | Used for the OpenNext incremental cache. Cloudflare may ask for a payment method to activate R2 even on the free tier; nothing is charged within the free allowance. Fallback without R2 documented in DEPLOY.md. |
| Supabase keys | anon / service_role | New **publishable** (`sb_publishable_…`) and **secret** (`sb_secret_…`) keys; legacy JWT `anon`/`service_role` are being retired by end of 2026. Secret keys are refused when sent from a browser. | Env var names kept from the spec (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); `.env.example` and APPLY.md say to paste the publishable / secret key (legacy keys also work). Local tests use the new key format. |
| Google Fonts | Aref Ruqaa 700, Markazi Text 600–700, Noto Naskh Arabic 400/500/700, IBM Plex Sans Arabic 400/500/600, IBM Plex Sans 400/500/600, Source Serif 4 400/600 (opsz) | All families and weights exist (css2 API checked). Arabic subsets exist for Aref Ruqaa, Markazi, Noto Naskh, Plex Sans Arabic. | Used exactly as specified, self-hosted with `next/font/google` (downloaded at build time, no runtime request to Google). |
| Supabase local | `supabase start` + `db reset` | Docker works in the build sandbox; Supabase CLI 2.119 with Postgres 17 image | Migrations, seed and SQL tests run against the **real** local Supabase stack (Auth, Storage, PostgREST, pg_cron, pg_net). No shim was needed. |
| TypeScript | strict | TypeScript 7 (native) exists; Next 16 tooling is tested with 5.x | TypeScript **5.9.3**, `strict` + `noUncheckedIndexedAccess`. |
| Playwright | — | Sandbox ships Chromium build 1194 | `@playwright/test` pinned to **1.56.1** (uses build 1194). |

## Design

- **`--ink-3` darkened from `#7A7264` to `#6E6658`.** The spec requires ≥ 4.5:1 for small text; `#7A7264` measures 4.22:1 on `--paper` (3.82:1 on `--paper-2`). `#6E6658` gives 5.03:1 on paper and 4.56:1 on paper-2, and keeps the same warm grey.
- **Font stacks put the Latin face first** (`Source Serif 4, Noto Naskh Arabic`; `IBM Plex Sans, IBM Plex Sans Arabic`). Browsers pick per glyph, so Arabic text uses the Arabic face and embedded Latin words, club names and digits use the Latin face in both interfaces. Headlines use Markazi Text, which covers both scripts.
- **Kicker colour** uses the category colour via a CSS variable (`--kicker`), defaulting to `--accent`. Section notches use `--notch`. Never used as a background.

## Database

- **Extra columns** not in the spec, added because the UI needs them: `articles.cover_alt` (alt text override for the cover in the article's language), `profiles.ui_locale` (admin interface language), `pages.translation_group_id`, `pages.updated_by`, `ad_campaigns.created_by`, `analytics_daily_article.referrer_breakdown` (article detail shows top referrer hosts), `menu_items.created_at/updated_at`.
- **Extra settings keys:** `home_text_block` (the homepage `text_block` section stores its text in its own config, this key is a site-wide fallback).
- **`article_cards` read model** (migration 17): one row per published article with section, genre, cover and bylines as JSON. The public site builds each page with 1–5 queries, which matters on the Workers free plan (50 sub-requests per request). It is a view owned by the database owner so it can show bylines without giving anon access to `profiles`; it applies the same filter as the RLS policy (`status = 'published' and published_at <= now()`). `article_cards_all` is the same view with `security_invoker` for staff.
- **The visitor hash is computed inside Postgres** (`track_pageview`, SECURITY DEFINER, executable by the service role only). The Worker passes IP + user agent, the database hashes them with the month's salt and stores only the hash. The salt never leaves the database (the spec suggested caching it in the isolate; this is simpler and safer).
- **Profiles are always created as `author`** by the auth trigger. Roles are raised only by an admin (team screen) or `bootstrap_admin.sql`, never from user-supplied metadata — so even if sign-ups were accidentally re-enabled, nobody could self-promote.
- **Rollups never delete.** `rollup_day` only upserts; re-running a day whose raw rows were already pruned keeps the stored numbers. `rollup_month_uniques` does nothing when no raw rows exist for that month (frozen months stay frozen).
- **Media kit rounding** is "round down to two significant digits" (12,345 → 12,000; 19,999 → 19,000), shown as «أكثر من 12 ألف». It can never round up (tested).
- **Search**: `simple` text search on `normalize_ar()` + prefix matching (`word:*`) + trigram similarity on the title. Punctuation is stripped before building the tsquery so user input can't break it.
- **SVG uploads** are allowed in the media bucket (for logos). Uploads are staff-only and files are served from the Supabase domain, not ours.
- **Cron in UTC:** Tunisia is UTC+1 all year (no DST), so "02:15 Africa/Tunis" is `15 1 * * *`.
- **Optional pg_net revalidation**: `publish_scheduled()` calls `/api/revalidate` only if the owner stores the URL and secret in `private.app_config` (APPLY.md step 8). Otherwise time-based revalidation (60 s) applies.

## Caching

- OpenNext config: **R2 incremental cache wrapped in the regional (Cache API) cache**, **D1 tag cache**, **SQLite Durable Object queue** — the setup the OpenNext docs recommend for ISR + `revalidateTag`, all within Cloudflare free allowances.
- Data functions use `unstable_cache` with tags (`articles`, `taxonomy`, `settings`, …) and `revalidate: 60`. Admin mutations call `revalidateTag`. `unstable_cache` is still supported in Next 16 (the newer `use cache` directive needs `cacheComponents`, which OpenNext supports less maturely).

## Security

- **CSP** allows `'unsafe-inline'` scripts: pages are statically cached, so a per-request nonce isn't possible, and AdSense/GA4 inject inline scripts. Script/frame/connect sources are limited to self, Supabase and Google ad/analytics hosts (+ YouTube/Facebook frames for embeds). Full policy in `src/lib/security/headers.ts`.
