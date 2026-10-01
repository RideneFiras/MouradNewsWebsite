# 09 — Build plan

Work through the phases in order. Each phase ends with its checks passing and an entry in `docs/PROGRESS.md`. Create `docs/DECISIONS.md` at the start and keep it updated.

## Phase 0 — Foundations

1. Verify current versions and constraints: Next.js version supported by `@opennextjs/cloudflare`; Workers free-plan limits (script size, CPU); Supabase key types; Google Fonts availability of Aref Ruqaa, Markazi Text, Noto Naskh Arabic, IBM Plex Sans Arabic, IBM Plex Sans, Source Serif 4. Log findings in `DECISIONS.md`.
2. Scaffold Next.js + TypeScript strict + Tailwind + next-intl + OpenNext Cloudflare config + Wrangler config. pnpm scripts: `dev`, `build`, `build:cf`, `preview:cf`, `deploy`, `lint`, `typecheck`, `test`, `test:e2e`, `db:bundle`.
3. Tokens (`styles/tokens.css`), fonts via `next/font`, base layout with `lang/dir` per locale.
4. Write all migrations, `seed.sql`, `demo-seed.sql`, `demo-clear.sql`, `bootstrap_admin.sql`, `ALL_MIGRATIONS.sql` (generated), `APPLY.md`. Test locally with the Supabase CLI (`supabase start` + `supabase db reset`) including RLS checks (a SQL test file that impersonates anon/author/editor/admin with `set local role` and `request.jwt.claims` and asserts allowed/denied operations).
5. Supabase client helpers (server, browser, admin/service-role isolated with `server-only`).
6. Unit tests: `formatDate` (Tunisian months, Hijri, relative), traffic-source classifier, slug generator, `normalize_ar` (SQL test).

**Stop point A:** report to the owner: migrations are ready, here is `APPLY.md`. Ask him to create the Supabase project and apply them, and to provide (or set in `.env.local`) the URL and keys. Continue with local Supabase meanwhile; don't block on this.

Checks: lint, typecheck, unit tests, `supabase db reset` clean, RLS tests pass.

## Phase 1 — Public site (read-only)

1. Demo content: `demo-seed.sql` with ~30 realistic demo articles (Arabic mostly, ~6 French) across all seeded sections, formats and place tags, 3 demo authors, several with no images, some with very long headlines, one sponsored, one breaking, one with a correction, one interview, two opinion pieces. Use royalty-free photos you can legitimately include, or no images (text-only is a valid state). Titles prefixed «[تجريبي]» / «[Démo]» and `is_demo = true`. Write plausible neutral news (municipal events, cultural festivals, volleyball league matchdays with fictional scores), clearly fictional, never about real living people.
2. Masthead, nav (desktop + mobile strip + sheet), footer, breaking bar.
3. Homepage renderer for all section types, deduplication.
4. Category, sub-category, article, author, tag, format, latest, search, static pages, 404/500.
5. `formatDate`, ICU plurals, `<bdi>` handling, print stylesheet.
6. Dev-only components page.

Checks: Playwright e2e (home renders in AR and FR; article page has JSON-LD, correct `dir`, Tunisian month name; category pagination; search finds a demo article with and without diacritics; 404). Screenshots at 375 and 1280px for AR/FR saved to `docs/screenshots/phase1/`. Review against the banned list in the design system and fix before moving on. Lighthouse mobile on home and article (record scores). OpenNext build size recorded.

## Phase 2 — Admin and CMS

1. Auth: login, forgot password, middleware protection, role helpers, invites, deactivation.
2. Article editor (Tiptap with all blocks, paste cleaning, autosave, revisions, preview tokens, publish/schedule/review workflow, translation linking), server-side HTML rendering and sanitizing.
3. Media library with client-side processing, focal point, usage check.
4. Categories (tree, drag/arrow reorder, nesting, delete-with-move dialog, deactivate, slug redirects), tags (merge), formats.
5. Homepage builder with preview, menus, static pages, settings, team, profile, messages (contact form + `contact_messages` table), system page.
6. Cache revalidation on every relevant mutation.

Checks: e2e: author creates draft → submits → editor sends back with note → author edits → editor schedules → cron publishes (simulate by calling the function) → article visible publicly. Category delete with move. Homepage reorder reflected publicly. RLS: author cannot publish via direct API call (test with the Supabase client using an author session). Mobile screenshots of the editor at 375px. Bundle size recorded.

**Stop point B:** short report + a list of things the owner should try in the admin on staging. Continue to Phase 3 unless he answers with changes.

## Phase 3 — Analytics

1. Tracker client, `/api/t` endpoint with HMAC token, bot filter, staff exclusion, rate limit, salts.
2. Raw tables writes, rollup functions, cron jobs, `run_rollup` recovery RPC.
3. Stats RPCs and all stats screens (overview, articles, article detail, sections, authors, sources, audience, social manual entries, export CSV, printable monthly report).
4. Author "my stats" views.
5. GA4 integration with consent defaults.

Checks: unit tests for classifier and engagement timer logic; integration test that posts beacons and runs the rollup and asserts numbers (including staff exclusion and bot drop); test that **no role can insert/update/delete analytics tables through the API** (attempt as admin and assert failure); dashboard screenshots.

## Phase 4 — Monetization

1. Ad slots + campaigns admin, client-side campaign selection, impression/click endpoints, `ad_daily_stats`, sponsor report.
2. AdSense loader, unfilled collapse, ads.txt route, consent handling.
3. Media kit settings + public `/advertise` page with `media_kit_public()`.
4. Admin `?show_slots=1` outline mode.

Checks: e2e: create campaign → appears in slot → impression and click counted once per view (not inflated by reloads within the bot/rate rules) → sponsor report shows them. Media kit shows only enabled metrics, rounding never rounds up. CLS check on article pages with ads enabled.

## Phase 5 — SEO, polish, launch prep

1. Metadata, hreflang, JSON-LD, sitemaps, news sitemap, robots, RSS.
2. Security headers/CSP, rate limits on contact.
3. Accessibility audit (axe in Playwright on main pages), keyboard navigation, focus states.
4. Performance pass to hit targets; fonts subsetting; image `srcset` correctness.
5. `docs/DEPLOY.md`, `docs/LAUNCH.md`, README updates, backup script.
6. Final review of all screenshots against the design system.

Checks: Lighthouse mobile ≥ 90/95/100 (perf/a11y/SEO) on home and article; no axe violations of serious/critical level; validate JSON-LD with a schema validator (or Google's Rich Results test noted for the owner); sitemaps valid XML.

**Stop point C:** hand over: staging URL, admin login instructions, the launch checklist, and known limitations.

## Phase 6 — Optional, only if asked

- Newsletter (double opt-in, subscribers table, simple sending via a free-tier provider; or export CSV for manual sending)
- Reader tips inbox with photo upload («راسلنا بخبر»)
- Volleyball module: competitions, matchdays, results with sets, standings table editable in admin, widgets for home/club tag pages
- PWA (installable, offline reading of last viewed articles)

## Definition of done (whole project)

- Everything in docs 01–08 implemented or explicitly deferred with a reason in `DECISIONS.md`.
- The owner can, from the admin and without code: rename the paper, change the logo, add/remove/edit/reorder categories, rebuild the homepage, edit every static page and the media kit text, manage users, run ads.
- No statistic can be changed by any human through any interface.
- Migrations apply cleanly from zero using `APPLY.md`.
