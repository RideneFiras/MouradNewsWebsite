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

## Phase 1 — public site

- **Webpack instead of Turbopack for production builds** (`next build --webpack`). Same app, measured with `pnpm bundle:size`: Turbopack server output gave a **2.22 MiB gzip** Worker, webpack **1.51 MiB**. `next dev` still uses Turbopack.
- **ISR for dynamic routes needs `generateStaticParams`** in Next 16: every public route exports `generateStaticParams() { return [] }` so pages render on first request and are then cached (`x-nextjs-cache: HIT`). Nothing is prerendered at build time, so building needs no database.
- **`?page=N` is rewritten to `/page/N` by the middleware.** Public URLs keep the spec's `?page=2`; internally the page renders from a path segment, which keeps listing pages statically cacheable (reading `searchParams` would force a render on every request — CPU matters on the Workers free plan).
- **Inline CSS** (`experimental.inlineCss`): removes the render-blocking stylesheet request (CLS went from 0.05 to 0 in Lighthouse).
- **Font weights 500 dropped** (Noto Naskh Arabic, IBM Plex Sans/Arabic): the CSS never uses them.
- **Breaking bar lives in the masthead on every page.** The homepage `breaking_ticker` section type is kept (so the builder can list it) but renders nothing, to avoid two identical red bars on the homepage.
- **`latest_list` is not deduplicated** against the lead: it is the chronological "latest" column next to the lead. "Most read" is a ranking and isn't deduplicated either. All other blocks are.
- **Language switch** goes to the same path in the other interface; article and static pages declare their switch target (`data-lang-switch`: linked translation or the other homepage), read when the link is clicked, so the pages stay cacheable.
- **Wrong-locale article URLs** 301 to the linked translation if one exists in the requested interface, else to the article's own locale (spec, `03-architecture.md`).
- **Desktop sticky bar without JavaScript:** the nav row is `position: sticky`; a small nameplate fades into it with a CSS scroll-driven animation (Chromium today; other browsers simply show the sticky nav without the mini nameplate).
- **Desktop search** opens with a `<details>` element (no JavaScript); mobile search links to `/search`.
- **Footer menu links to unpublished static pages are hidden** (the seeded footer menu points to pages that start as drafts).
- **HTML is sanitized twice**: when saved (Phase 2) and again when rendered, so an editor writing through the API can't inject markup.
- **Demo photos**: six CC-licensed photos of Kélibia and Hammamet from Wikimedia Commons, credited in the caption and loaded directly from `upload.wikimedia.org` (removed with the demo). Wikimedia only serves standard thumbnail widths, so demo variants are 500/960/1280 px; our own uploads use 480/960/1600. Clubs, festivals, people and scores in the demo are invented.
- **Cloudflare Turnstile on the contact form: not added.** Honeypot field + minimum time-to-submit + per-IP rate limit instead (no extra account/keys needed). Turnstile is free and can be added later.
- **Screenshots in the sandbox**: Playwright's Chromium doesn't trust the sandbox's HTTPS proxy, so tests fetch remote demo images through Node (which does) instead of disabling certificate checks (`tests/support/route-images.mjs`).

## Phase 2 — admin and CMS

- **No shadcn/ui.** The admin uses a small set of hand-written primitives (`.a-panel`, `.a-btn`, `.a-input`, native `<dialog>`) styled with the tokens (white panels, 4px radius, 1px borders, no shadows). Same look the spec asks for, far less code in the Worker and the browser.
- **No drag-and-drop library.** Reordering (sections, formats, homepage, menus) uses native HTML5 drag-and-drop plus ▲/▼ buttons for keyboard and phones.
- **Tiptap is client-only** (`next/dynamic`, `ssr: false`), never in the Worker bundle. Custom nodes: pull quote, figure (caption/credit/alt edited inline), gallery, embed (allow-listed hosts), "read also". Word/Facebook paste is cleaned (styles, classes, Office tags dropped).
- **Paragraph direction**: instead of `dir="auto"` (which turns an Arabic paragraph that starts with a Latin club name LTR), the renderer gives a paragraph an explicit `dir` only when most of its letters are in the other script. In the editor, paragraphs use `unicode-bidi: plaintext` while typing.
- **No Supabase JS in the browser.** Images are processed in the browser (WebP 480/960/1600 + original ≤ 2400 px, EXIF dropped by re-encoding) and uploaded with **signed upload URLs** created by a server action (plain `PUT`). Password reset/invite completion is a server action. This removed a full copy of supabase-js from the Worker's SSR layer.
- **HTML is sanitized once, when saved** (server action: render from editor JSON, then `sanitize-html` allow-list), and a **database trigger** (`html_is_safe`, migration 19) refuses scripts, event handlers, `javascript:`/`data:` URLs and non-allow-listed iframes from any writer. Public pages print stored HTML without re-sanitizing (saves a second copy of sanitize-html + postcss in the Worker).
- **Invites**: `inviteUserByEmail` (service role); the auth trigger always creates an `author` profile and the action then sets the chosen role. Deactivation sets `is_active = false` and bans the auth user (`ban_duration`), so existing sessions stop working.
- **Preview links** are HMAC-signed (`TRACKER_HMAC_SECRET`), valid 7 days, `noindex`, rendered with the service role — shareable with someone without an account.
- **Autosave** every 15 s and when the tab is hidden; editor blur also saves. A revision is stored on every explicit save and at most every 5 minutes for autosaves (pruned to 30 per article nightly). Local backup in `localStorage`, offered back on reopen if newer than the server copy.
- **Scheduling** uses `datetime-local` read as Africa/Tunis time (UTC+1, no DST).
- **Homepage builder**: one composition per interface tab; sections marked "both" appear in both tabs, and their position is the one from the tab saved last. Preview renders the unsaved composition through the real homepage components (`/[locale]/preview/home`, editors only).
- **Admin links don't prefetch** (`prefetch={false}`): with ~20 sidebar links, prefetching rendered ~20 pages per admin page view — wasted Worker requests on the free plan.
- **Wrangler `minify: true`**: the OpenNext output isn't fully minified; minifying at deploy took the Worker from 2.16 to **1.92 MiB gzip**. Verified the minified Worker runs in local workerd (public pages, admin login and every admin page).
- **RLS fix (migration 18)**: `INSERT … RETURNING` by an author was refused because the SELECT policy checked authorship through a function that can't see the row being inserted. The policy now checks `created_by = auth.uid()` first. Found by the e2e test, covered by an SQL test.
- **Demo/test auth users**: rows inserted directly into `auth.users` must have `''` (not NULL) in the token columns, otherwise Supabase Auth can't list users (dashboard and admin API). Fixed in `demo-seed.sql` and the SQL tests.

## Phase 3 — analytics

- **Page token accepted for 24 h, not 10 min.** The HMAC token is computed per 10-minute bucket, but public pages are ISR-cached (and later served from the Cloudflare cache), so a page can legitimately be served hours after it was rendered. `/api/t` accepts tokens up to 144 buckets old (and one bucket in the future for clock skew). It still stops scripts that post to the endpoint without ever loading a page; it is not, and can't be on cached pages, a per-visit nonce. The token is path-agnostic because the shared layout that renders it doesn't know the path.
- **Staff exclusion by cookie, no DB call.** A beacon is dropped when the request carries a Supabase auth cookie (`sb-*-auth-token`). Logged-in staff browsing the public site are therefore never counted, at zero cost. A reader can't fake their way *into* the numbers this way, only out of them.
- **Writes after the response.** `/api/t` answers 204 at once and calls `track_pageview` / `track_engagement` inside `after()` (Next 16; OpenNext maps it to `ctx.waitUntil`). Invalid beacons get 400 (malformed) or a silent 204 (bot, staff, bad token, rate-limited) so probing reveals nothing.
- **Path sent decoded, max 300 chars.** `usePathname()` returns the percent-encoded Arabic slug, which can exceed 300 characters; the tracker decodes it before sending (readable in the dashboard) and the server accepts up to 1200 and stores 300.
- **Dev mode counts twice.** React Strict Mode runs effects twice in `next dev`, so a page view is sent twice locally (the UTM parameters only on the first). Production is unaffected; the analytics e2e tests run against `next start`.
- **Engagement can't arrive before its page view in practice** (it is sent when the tab is hidden or left, seconds later). If it ever did, `track_engagement` ignores it (no row to attach to) rather than failing.
- **Time axis runs right-to-left in Arabic.** Charts are mirrored in the Arabic admin (oldest day on the right), like the text and like Arabic-language analytics tools; French runs left-to-right. The SVG is laid out with `direction: ltr` and physical anchors; Arabic tick labels are embedded RTL so «16 سبتمبر» reads correctly.
- **Number grouping uses U+202F** (narrow no-break space). U+2009 (thin space), used before, is a bidi "whitespace" and let digit groups swap places inside Arabic text («17 175» displayed as «175 17»). U+202F is a "common separator", so the number stays whole. Applies everywhere `formatInt` is used, the media kit included.
- **Comparison series**: page views and visitors are two charts (one axis each), each with the previous period as a dashed `--ink-3` line. The dashed stroke is the secondary encoding the dataviz validator asked for (comparison gray vs. press red is low-chroma by design, docs/02). Legend above, end labels for both series, crosshair + tooltip on hover and keyboard (arrows), table view under every chart.
- **Visitors tile wording** follows docs/06: «الزوار» for one day, «الزوار الشهريون» for a calendar month (distinct visitors from raw rows / `analytics_monthly_uniques`), otherwise «مجموع الزوار اليوميين».
- **Metric definitions** open from the metric name (Popover API, no JS) instead of hover-only `title` tooltips, so they also work on phones.
- **Manual social numbers**: editors add entries and may correct their own for 24 h (RLS from migration 14); only admins can delete (no UI for it: corrections are new entries). They are always labelled «أرقام مدخلة يدويا…».
- **CSV export** is a route handler under `/[locale]/admin/stats/export` using the user's session (RPCs re-check roles). UTF-8 BOM for Excel; cells starting with `= + - @` are prefixed with `'` (CSV injection).
- **Local simulated traffic** (`pnpm dev:traffic`) writes raw rows as the Postgres superuser for screenshots and UI work. It refuses any non-local database URL and is never part of the seeds. `pnpm dev:traffic --clear` empties the analytics tables. SQL tests now truncate the analytics tables in their setup so they don't depend on local traffic.

## Phase 4 — monetization

- **Campaigns embedded, not fetched.** Each `AdSlot` server component embeds the running campaigns for its slot/language/section (from the cached `active_ad_campaigns` view, tag `ads`) and the browser picks one (weighted) after hydration. No `/api/ads/active` endpoint: one request fewer per page and nothing extra on the Worker. The browser also re-checks start/end dates because a cached page can outlive a campaign.
- **Section targeting includes the parent section**: a campaign targeting «رياضة» also shows on «كرة القدم» articles.
- **Slot modes** (DB enum `ad_mode`): `off`; `adsense` (campaigns first, then the AdSense unit); `direct` (campaigns only); `house` (campaigns, else «أعلن معنا» linking to the media kit). A slot with nothing to show renders nothing and reserves nothing (docs/02); a slot that will show something reserves its height (`--ad-h-m` / `--ad-h-d` from the slot's sizes) before the pick, so the pick causes no layout shift.
- **Impressions**: ≥ 50 % visible for ≥ 1 s (IntersectionObserver), once per mount (= page view), sent to `/api/ads/i` with the same page token, bot filter, staff-cookie exclusion as `/api/t`, plus rate limits (120/min per IP, 10/min per IP per campaign). Reloading is a new page view and counts, within those limits.
- **Clicks** go through `/api/ads/c/{id}` → `record_ad_click` → 302 to the stored https URL (`rel="sponsored noopener"`, new tab). Bots, staff and floods (5/min per IP per campaign) are redirected without counting.
- **Campaigns with numbers can't be deleted** (the FK cascade would erase their statistics); they are paused instead. Only never-shown campaigns can be deleted.
- **Campaign dates are entered in Tunis time** and converted with a fixed +01:00 offset (Tunisia has had no daylight saving time since 2009).
- **AdSense settings moved** from الإعدادات to الإشهار (docs/06 puts them there), with the ads.txt editor and a hint when the file lacks the publisher line. The AdSense script loads once, lazily, on first interaction or idle (max ~4 s), after the Consent Mode defaults, which are now emitted when either GA4 or AdSense is on. Unfilled units collapse (`data-ad-status="unfilled"`).
- **Header and footer slots** (`header_leaderboard`, `footer`) are placed in the public layout; home slots stay homepage sections; in-article, article-end, sidebar and section slots were already placed in Phase 1.
- **CLS**: measured at 375 px on an article with four slots on: 0.062. The article page without ads measures ~0.12, caused by the web-font swap re-wrapping text (not by ads); fixing it is part of the Phase 5 font/performance pass.
- **Playwright cannot route redirect targets**, so the click e2e test asserts the 302 and its `Location` rather than the sponsor page.

## Phase 5 — SEO, performance, launch

- **Sitemaps and feeds are route handlers** (not `app/sitemap.ts`) so the index can point to one sitemap per month of articles with `lastmod`, tag sitemaps can keep only tags with ≥ 3 articles, and article entries carry `xhtml:link` hreflang alternates for linked translations. Arabic slugs are percent-encoded in `<loc>`. `/sitemap.xml`, `/news-sitemap.xml` and `/ads.txt` render on request (their data is cached by tag) so a build never needs the database; per-month sitemaps and RSS are ISR (`generateStaticParams` returns nothing).
- **RSS**: `/ar/rss.xml`, `/fr/rss.xml` (respecting the content-mixing setting) and `/{locale}/section/{slug}/rss.xml` (section + sub-sections), last 30 articles, `media:content` cover, `dc:creator`. The guid is the stable `public_id`, so a slug change doesn't duplicate items in readers.
- **Fonts, measured.** Every page downloaded 8 font files / 359 KB, and `font-display: swap` re-wrapped headlines when the fonts arrived (CLS ~0.12 on articles at 375 px; LCP re-recorded at the swap). Changes:
  1. The four Arabic faces are self-hosted subsets (`src/app/fonts/`, built by `scripts/fonts/subset-arabic-fonts.sh` from Google Fonts' own files): basic Arabic block only, every OpenType feature kept — rendering compared side by side, identical. Noto Naskh 91 → 43 KB, Plex Arabic −30 %. Same families and weights as docs/02.
  2. They declare an Arabic `unicode-range`, and the headline stack lists the Arabic subset before Google's Markazi (next/font includes *all* Google subsets in CSS regardless of `subsets`, which only controls preloading — so Google's own Arabic Markazi face was being used and ours preloaded for nothing).
  3. Arabic text faces use `display: optional` (no late swap → no layout shift; the font is cached for the next page). Latin faces and the nameplate keep `swap`: next/font gives Latin faces a size-adjusted fallback so their swap barely moves text, and the nameplate box has a fixed height.
  4. Only the two Arabic faces that paint the LCP are preloaded (Markazi Arabic, Naskh Arabic).
  5. The Arabic local faces have **no fallback entries** and come **first** in every stack. next/font appends a metric "Fallback" face (local Times New Roman / Arial, no unicode-range) after each family in its CSS variable: with the Latin face first, Arabic text could be captured by that fallback on Windows/macOS (whose Times/Arial contain Arabic) before reaching Naskh/Plex Arabic; with an Arabic face carrying its own fallback first, Latin headlines were captured by Times. Found on the French screenshots and fixed.
  Result: 7 files / 272 KB per page (Arabic page), CLS 0.000–0.024 on the e2e checks (was 0.062–0.12).
- **No `experimental.inlineCss`**: it put the 58 KB stylesheet into every HTML page *and* again as a string in the RSC payload (≈115 KB per page, never cached). A normal stylesheet is cached across pages.
- **No link prefetching on the public site** (`prefetch={false}`): Next prefetched the RSC payload of every visible link (dozens per page) — CPU on phones, and each prefetch is a Worker request counted against the free plan's 100k/day. Navigation is still client-side on click. (The admin already had it off.)
- **Lighthouse in this sandbox** is noisy (slow shared CPU; demo photos from Wikimedia fail TLS through the sandbox proxy, which also costs best-practices points). Medians of 5 runs (simulated mobile): home 94 / 100 / 96 / 100, article 80 / 100 / 96 / 100 (perf / a11y / best practices / SEO); between batches the same build scored 78–94 (home) and 79–95 (article). Observed (unthrottled) FCP is ~0.27 s; the simulated FCP swings 1.1–2.9 s with machine load. Accessibility 100 and SEO 100 are stable; best practices loses only on the sandbox's TLS errors for the Wikimedia demo photos. Re-run on the real domain (LAUNCH.md); the Cloudflare edge cache and real images will change the numbers.
- **Accessibility**: axe (WCAG 2.1 A/AA) has no serious/critical violations on home AR/FR, article, section, latest, author, search, contact and 404 at 375 and 1280 px, nor on the admin login, dashboard, articles, editor, statistics, ads and settings. The only finding (the editor's content area had no accessible name) was fixed.
- **CI** (`.github/workflows/ci.yml`): lint, types, unit tests, migrations-bundle drift check, production build with placeholder public values (no secrets needed). Deploying from GitHub is prepared but commented out until the owner adds Cloudflare secrets.
- **Backups**: `scripts/backup.sh` dumps the `public`, `private` and `auth` schemas with `pg_dump` (portable, no owners/privileges); media via the dashboard or `supabase storage cp`. Could not be run against a real project here (no credentials) — listed in HANDOFF "Checks to run on Firas's machine".

## Owner to verify (not decided by the software)

These are legal questions; the site provides the fields and pages, the answers must come from a professional:

1. **Declaration / registration** of an online news publication in Tunisia (Décret-loi n° 2011-115 on the press, and any later rules for electronic media): whether a declaration is required, to whom, and what it requires. Ask the **SNJT** (Syndicat national des journalistes tunisiens) or a lawyer.
2. **Legal masthead**: which mentions are mandatory (director of publication, editor-in-chief, address, registration number…). The footer fields in الإعدادات → البيانات القانونية exist for this.
3. **Personal data**: obligations under **Loi organique n° 2004-63** and whether a declaration to the **INPDP** is needed for the contact form and staff accounts; final wording of the privacy policy (the seeded AR/FR texts are factual drafts, marked as drafts).
4. **Sponsored content and advertising** rules (labelling «محتوى برعاية» is built in; check any additional requirement).
5. **Image rights**: demo photos are Wikimedia Commons (credited) and are removed with `demo-clear.sql`; real photos need their own rights.
