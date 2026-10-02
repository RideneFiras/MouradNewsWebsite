# Scaling review: free plans, images on a VPS, capacity, portability

Written 2026-10-02 against the live site (https://www.elborj.workers.dev, Worker `www`,
Supabase project `knxuskjqpsimptwxqfju`) and the code at commit `d419a0c`. No application code
was changed for this review. Every number is either **measured** (command/query shown) or an
**estimate** (assumptions stated). Limits were re-checked in the providers' docs on 2026-10-02.

## Summary

| | Limit (free) | Today | Hit at roughly | Evidence |
|---|---|---|---|---|
| **Supabase cached egress (images)** | 5 GB / month | ~0 | **~700–1,100 page views/day** | §2.3 |
| Supabase file storage | 1 GB | 0.72 MB (1 article) | **~400–1,400 articles** (photos vs posters), traffic-independent | §2.2 |
| Workers CPU per request | 10 ms "with some flexibility" | p50 **59 ms**, p99 **970 ms**, 0 errors | uncertain: already above the nominal limit, tolerated so far | §1.3 |
| Workers requests | 100,000 / day | 639 in 2 days | ~30,000–45,000 page views/day | §1.2 |
| Supabase database | 500 MB | 14 MB | ~18,000 page views/day (60-day raw retention) | §2.1 |
| Worker size | 3 MiB gzip (our target) | 1.61 MiB | far | §1.1 |

1. **Images are the problem, not the database or the Worker.** They're served from
   `knxuskjqpsimptwxqfju.supabase.co` through Supabase's CDN, which counts against a 5 GB/month
   *cached egress* quota. At ~200 KB of images per page view, that's used up at about 800 page views a day.
   Past the quota and a grace period, Supabase's fair-use policy can restrict the project, up to
   **answering every API request with HTTP 402**, which would take the whole site down, not just images.
   **Fix before real traffic arrives:** serve images from our own domain behind Cloudflare (VPS or R2, §3).
2. **Storage fills by volume of articles**, not traffic: a phone photo becomes ~1–1.4 MB of WebP
   files. About 45 % of that is the 2400 px "original", which the public site never shows (§2.2).
3. **The Worker runs above the nominal 10 ms CPU limit on almost every request** (cached pages
   included), and Cloudflare has accepted all of them so far (0 errors out of 639). It's the main
   reason to keep `docs/WORKERS-PAID.md` in mind, but it isn't urgent.
4. The database is comfortable until ~18,000 page views a day.

---

## 1. Cloudflare Workers free plan

### 1.1 Bundle size

```
$ pnpm build:cf && pnpm bundle:size
Worker: 6.49 MiB raw, 1.61 MiB gzip (54% of the 3 MiB free-plan limit)
```

Cloudflare's limits page (fetched 2026-10-02) now says **64 MiB uncompressed, no compressed
limit** on both plans. We keep the stricter 3 MiB gzip target from the spec (DECISIONS.md, "Verified facts").

### 1.2 Free-plan limits (Cloudflare docs, `developers.cloudflare.com/workers/platform/limits/`)

| Limit | Free plan |
|---|---|
| Requests | **100,000 / day** |
| CPU time | **10 ms per HTTP request**, "each isolate has some built-in flexibility to allow for cases where your Worker infrequently runs over the configured limit" |
| Subrequests | **50 / request** (Cache API, R2, D1 and `fetch` all count), cannot be raised on Free |
| Memory | 128 MB |
| Startup time | 1 s |
| Static assets | "Requests to static assets are free and unlimited" (we don't use `run_worker_first`) |

**Requests per page view** (from `src/components/public/Tracker.tsx`): 1 HTML request + 1 `/api/t`
(page view) + usually 1 more `/api/t` (engaged time, sent on `visibilitychange`/`pagehide`) = **2–3
Worker requests**, plus `/api/ads/i` for each sponsor ad seen once ads are on. JS/CSS/fonts are
static assets (free). With bots and crawlers on top, 100k requests/day ≈ **30,000–45,000 page views/day**.

### 1.3 Cached or rendered? CPU measured on the live site

All public pages use ISR: `export const revalidate = 60` and `generateStaticParams() { return [] }`
(`src/app/[locale]/(public)/**/page.tsx`), served by OpenNext's cache interception from the
Cache API / R2 (`open-next.config.ts`, `enableCacheInterception: true`). A page is rendered on the
first visit, then served from cache, then **rebuilt in the background at most once per ~60 s while
it's being visited** (`x-nextjs-cache: HIT` / `STALE`). Exceptions rendered on every request:
`/search` (`force-dynamic`), the admin, the API routes, the preview pages.

Measured with `npx wrangler tail www --format json` while requesting pages (2026-10-02):

| Request | CPU | Wall |
|---|---|---|
| First render, never-visited pages (`/fr/section/culture`, `/ar/topic/nabeul`, `/fr/latest`, `/ar/section/sport`) | **710–975 ms** | 1.4–1.8 s |
| Background rebuild of `/ar` (homepage) | **1,016 ms** | 2.0 s |
| Background rebuild of `/ar/article/33` | **948 ms** | 1.6 s |
| Rebuild of `/ar/section/culture` | 638 ms | 1.5 s |
| Served from cache (HIT/STALE), all three page types | **11–132 ms** (mostly 40–100) | 0.2–0.7 s |
| Durable Object queue (schedules rebuilds) | 0–4 ms | — |

Cloudflare's own analytics for the last 48 h (GraphQL `workersInvocationsAdaptive`, script `www`):

```
status success  requests 639  errors 0  subrequests 4157  cpuTimeP50 59 208 µs  cpuTimeP99 970 009 µs
```

**Risk:** real but unquantifiable. Even cached responses use 4–13× the nominal 10 ms, so this isn't
"infrequently over the limit". Cloudflare accepted 100 % of requests so far, but nothing guarantees
it at higher volume. Rebuilds (~1 s CPU) are the most exposed. What would reduce it on Free:
fewer homepage sections/queries per render, a longer `revalidate` (fewer rebuilds). What removes it:
Workers Paid, $5/month, 30 s CPU (`docs/WORKERS-PAID.md`).

### 1.4 What a reader sees when a limit is hit

| Limit | Reader sees |
|---|---|
| CPU (Error 1102) | Cloudflare's error page "Worker exceeded resource limits" for that request. Next request may work |
| Daily requests (Error 1027) | On `*.workers.dev` (no origin to fall back to): Cloudflare error page for every request until midnight UTC |
| Subrequests (50) | Our own 500 error page; seen on 2026-10-02 before the memory data cache (DECISIONS.md → Deployment) |
| Supabase restricted (§2) | Pages that need a fresh render fail (500); cached pages keep working until they expire; images 402/blocked |

---

## 2. Supabase free plan

Limits (supabase.com/pricing, 2026-10-02): **500 MB database, 1 GB file storage, 5 GB egress +
5 GB cached egress per month**, 50 MB max upload, pause after 1 week of inactivity, 2 projects.
Over quota (billing FAQ): notification, grace period, then fair-use restrictions that can include
"switching databases to read-only mode" and "responding with a 402 status code for all API
requests", until the next billing cycle or an upgrade.

Database today: **14 MB** (`select pg_database_size(current_database())` → 14,579,379 bytes).

### 2.1 Database growth

**Articles** (measured on article 33, 654 characters of text, `pg_column_size`): row 6,392 B
(body_json 1,642, body_html 1,252, body_text 662, search_vector 1,766), revisions 1,920 B each.
Scaled to a typical 2,500-character article: ~25 KB per article with indexes, plus ~7.5 KB per
revision. Revisions are stored on every explicit save and at most every 5 minutes of autosave,
capped at 30 per article (`rollup_nightly`). Articles from the publish-article skill have 1.

| Per 1,000 articles | Estimate |
|---|---|
| Published from the skill (1 revision) | **~35 MB** |
| Edited in the admin (~8 revisions) | **~85 MB** |
| Worst case (30 revisions each) | ~250 MB |

**Statistics.** Measured by filling temporary copies of the real tables (same columns and indexes)
with 100,000 rows shaped like the existing ones:

```
pageviews_raw   297 B per row (154 heap + indexes: pkey, occurred_at, article_id)
engagement_raw   99 B per row  (≈ 0.7 rows per page view: 56 engagement / 74 page views so far)
analytics_daily_article 539 B per row (one per article per day with views, kept forever)
```

So **~366 B of raw data per page view**, kept `raw_retention_days = 60` (`site_settings.analytics`),
pruned nightly. Rollups are kept forever: `analytics_daily` (~80–150 rows/day across 7 dimensions,
~5 MB/year) and `analytics_daily_article`.

| Page views/day | Raw tables (steady state, 60 days) | Rollups added per year |
|---|---|---|
| 2,000 | **44 MB** | ~15 MB |
| 10,000 | **220 MB** | ~35 MB |
| 50,000 | **1,100 MB** (over the limit) | ~90 MB |

At 10,000 page views/day: ~220 MB of raw stats + ~35 MB/year of rollups + articles. Fine for a
year or more. Lowering retention to 30 days halves the raw figure (setting, no code change).

### 2.2 Storage per article

The uploader (`src/lib/admin/image-process.ts`, same rule in `scripts/publish-article.ts`) stores
WebP at quality 0.82: an "original" capped at 2400 px, plus 480/960/1600 px variants smaller than
the source. Measured (`storage.objects`, article 33's three posters):

| Image (source px) | Files | Size |
|---|---|---|
| Avant Goût poster 1448×2048 | original 174 KB, w480 42 KB, w960 102 KB | 327 KB |
| «الآنسة نون» 1088×1445 | original 144 KB, w480 48 KB, w960 135 KB | 337 KB |
| «واحد» 508×720 | original 29 KB, w480 26 KB | 57 KB |

Phone photos (≥ 2400 px) produce all four files. Estimate for a photo: original 2400 px ≈ 500–800 KB,
1600 ≈ 250–400, 960 ≈ 100–150, 480 ≈ 30–45, so **~0.9–1.4 MB per photo**.

| Article type | Storage | Articles per 1 GB |
|---|---|---|
| One poster (like the measured ones) | ~0.3 MB | ~3,000 |
| Three posters (article 33) | 0.72 MB | ~1,400 |
| Cover photo + 1 photo in the body | ~2–2.5 MB | **~400–500** |

At 3–5 articles a day with photos, **1 GB lasts ~3–5 months**. Quick win (code change, not done
here): the 2400 px original is never shown on the public site (`src/lib/public/media.ts` builds
`srcset` from the numeric variants only; the original is used only when the image is smaller than
1600 px), so capping it at 1600 px or not storing it would save **~40–50 %** of storage.

### 2.3 Egress: the first limit

Images are served by Supabase's CDN, which is Cloudflare underneath:

```
$ curl -sI https://knxuskjqpsimptwxqfju.supabase.co/storage/v1/object/public/media/2026/10/.../w960.webp
cf-cache-status: HIT
cache-control: public, max-age=31536000
content-length: 105350
```

So they count as **cached egress (5 GB/month)**. Browsers keep each image for a year, so repeat
visitors don't download it twice, but every new reader, and every new article, costs bytes.
Estimate per page view: an article read on a phone loads the cover at 960 or 1600 px
(`sizes="(min-width: 1024px) 800px, 100vw"` × device pixel ratio 2–3) ≈ 100–300 KB, plus body
images when scrolled; the homepage loads a lead image and ~10 cards (480 px variants) ≈ 0.5 MB on a
first visit. Most traffic arrives from Facebook to a single article, so **~150–250 KB per page view on
average**.

| Page views/day | Image egress / month | vs 5 GB cached egress |
|---|---|---|
| 1,000 | ~4.5–7.5 GB | at the limit |
| 2,000 | ~9–15 GB | **2–3× over** |
| 10,000 | ~45–75 GB | 9–15× over |
| 50,000 | ~225–375 GB | 45–75× over |

Uncached egress (the other 5 GB) covers API responses to the Worker (each render makes ~6.5
subrequests; JSON of 5–50 KB) and CDN misses. Small at these volumes, but it grows with rebuilds.

### 2.4 Which limit first, and when

| Page views/day | First limit | Others |
|---|---|---|
| **2,000** | **Supabase cached egress** (images), within the first two weeks of each month | Storage by article volume (months). DB, Workers fine |
| **10,000** | Egress (immediately) | Workers 20–30k requests/day (20–30 %), CPU risk grows with rebuilds. DB ~55 % after a year |
| **50,000** | Egress | **Workers requests** (100–150k/day) and **DB** (raw stats 1.1 GB) both over |

---

## 3. Images on our own VPS (everything else stays on Supabase)

Target: Supabase keeps the database, Auth, RLS and the `media` table; only the image **files** move
to a small Linux VPS in Tunisia (2 GB RAM, 25 GB disk), with Cloudflare's free plan in front for
HTTPS and caching.

### 3.1 How images work today

**Upload** (admin, `src/components/admin/useUpload.ts` → `src/lib/admin/media.ts`):
1. The browser resizes the image to WebP (`image-process.ts`; EXIF dropped by re-encoding).
2. Server action `createUploadTargets(names)` checks the user is staff (`assertStaff`) and asks
   Supabase for **signed upload URLs** (`db.storage.from('media').createSignedUploadUrl(path)`,
   path `YYYY/MM/<uuid>/<name>`, valid 2 h).
3. The browser `PUT`s each file to its signed URL (header `apikey: <anon key>`, FormData).
4. Server action `createMedia(...)` inserts the `media` row.

The publish-article script does the same with the service role (`client.storage.from('media').upload`).

**References in the database:**

| Where | Stored as |
|---|---|
| `media.storage_path`, `media.variants` | **relative paths** (`2026/10/<uuid>/w960.webp`) |
| `articles.body_json` (figure/gallery `src`, `variants`) | relative paths |
| **`articles.body_html`, `pages.body_html`** | **absolute Supabase URLs**, rendered at save time (`renderDoc(..., { mediaUrl })` in `src/lib/admin/articles.ts`); verified: article 33's HTML has `https://knxuskjqpsimptwxqfju.supabase.co/storage/v1/object/public/media/...` |
| covers, logos, avatars, OG images, ad creatives | `media` ids → relative paths |

**Serving:** every URL is built by **one function**, `mediaUrl()` in `src/lib/env.ts`
(`${SUPABASE_URL}/storage/v1/object/public/media/<path>`), used by 20 files (public components,
SEO/RSS/JSON-LD, the admin, the renderer). `scripts/publish-article.ts` has its own copy.

**Is storage behind one module?** Mostly:
- **URL building:** one function (`mediaUrl`), plus the copy in the script.
- **Storage API calls:** only 3. `createSignedUploadUrl` and `remove` in `src/lib/admin/media.ts`, `upload` in `scripts/publish-article.ts`.
- **Upload client:** in `src/components/admin/useUpload.ts`.
- **Also tied to Supabase:**
  - the stored HTML (absolute URLs)
  - `admin_system_status()`, which sums `storage.objects` for the admin's storage bar
  - the CSP (`src/lib/security/headers.ts`: `img-src` already allows any `https:`; `connect-src` allows only Supabase, so uploads to another host need it added)

### 3.2 Design options for the VPS side

| | A. Signed upload URLs from our server (recommended) | B. VPS checks the Supabase login itself | C. S3-compatible server (MinIO / Garage) |
|---|---|---|---|
| How | The server action (already checks the role) returns URLs signed with a shared secret: HMAC of `PUT:<path>:<expiry>:<max bytes>`. Browser `PUT`s to `https://img.<domain>/upload/<path>?e=…&s=…`. A ~100-line service verifies the signature, enforces size/type, writes the file atomically, refuses overwrites. Caddy (or Nginx) serves `/media/*` as static files with `Cache-Control: public, max-age=31536000, immutable` | Browser sends its Supabase JWT; VPS verifies it (Supabase JWKS or `GET /auth/v1/user`), then reads the role from `profiles` | Run an S3 API; server action creates presigned PUT URLs (S3 signing in the Worker); serve the bucket publicly through Caddy/Cloudflare |
| Simplicity | Highest: mirrors today's signed-URL flow exactly. Role checks stay where they are | Medium: the admin's session is an **httpOnly cookie on the site's domain**, so the browser can't read the JWT to send it; would need a token-exchange step. The VPS also needs Supabase keys or JWKS handling | Lowest: S3 auth, bucket policies, an extra admin UI |
| RAM | Caddy ~30–40 MB + Node/Go service ~20–60 MB | Same plus JWT libraries | MinIO: its docs recommend far more than 2 GB for production; also licence/packaging changes in 2025. Garage: ~50–100 MB, but young and more to learn |
| Security | VPS holds **no Supabase secrets**. Leaked URL = one path, one upload, expires in ~2 h. Secret only in Wrangler secrets + VPS env | VPS trusts tokens and needs DB access → larger blast radius | Access keys on the VPS and in the Worker |

**Recommendation: A.** Caddy (automatic config, static files, reverse proxy to the upload service on
`127.0.0.1`) + a small service under systemd + a firewall (only 80/443 from Cloudflare's IP ranges,
SSH by key). Deletion uses the same signed scheme (`DELETE`).

**Prerequisite: an own domain.** Cloudflare can only proxy and cache a hostname on a domain you've
added to it (e.g. `img.elborj.tn`). Without it there's no free HTTPS/caching layer in front of the VPS.
With it, Cloudflare serves cached images and the Tunisian VPS only answers cache misses.

### 3.3 Migration (old and new side by side)

1. **Copy** all objects from the Supabase bucket to `/srv/media/` with the **same paths**:
   `npx supabase storage cp -r ss:///media ./media --experimental`, then rsync. Or a script
   listing `storage.objects` and downloading the public URLs.
2. **Switch reads:** `mediaUrl()` gets a base URL from an env var (`MEDIA_BASE_URL`). Paths are
   relative in the DB, so covers, cards, OG images, RSS and the admin all switch at once on deploy.
3. **Rewrite stored HTML:** `update articles set body_html = replace(body_html, '<supabase prefix>', '<new prefix>')`
   (same for `pages`), or re-render from `body_json`. Then expire all cache tags (`/api/revalidate`).
4. **Switch uploads** to the VPS signed URLs (new images only exist on the VPS).
5. Keep the Supabase copies until the site has been checked for a while, then delete them (frees the 1 GB).

**Side by side: yes.** Until step 3, old HTML keeps pointing at Supabase, which still has the files,
and new pages use the VPS. Nothing breaks at any point if the files are copied before the switch.

### 3.4 Backups of the image folder (free)

Nightly `restic` (encrypted, deduplicated, keeps old versions) or `rclone sync` from cron/systemd timer to:
- **Cloudflare R2:** 10 GB free, already enabled on this account (card on file). Natural choice.
- **Backblaze B2:** 10 GB free.
- **Google Drive:** 15 GB via rclone, personal account.

Monthly: test a restore. The VPS is also a good place to run `scripts/backup.sh` (pg_dump of the
database, needs `pg_dump` 17) to the same destination.

### 3.5 Effort and risks

| Files to change | Change |
|---|---|
| `src/lib/env.ts` | `mediaUrl()` base from `MEDIA_BASE_URL` (default: Supabase, so nothing changes until set) |
| `src/lib/admin/media.ts` | `createUploadTargets` returns VPS signed URLs; `deleteMedia` signs deletes instead of `storage.remove` |
| `src/components/admin/useUpload.ts` | Raw `PUT` to the VPS URL (no `apikey` header, no FormData) |
| `scripts/publish-article.ts` | Same signed upload; use the shared `mediaUrl` |
| `src/lib/security/headers.ts` | Add the image host to `connect-src` (uploads) and `img-src` |
| New migration | `admin_system_status` storage figure from the VPS (or drop it; see §4) |
| `wrangler.jsonc` / secrets | `MEDIA_BASE_URL` var, `UPLOAD_HMAC_SECRET` secret |
| New: `ops/media-server/` | Upload service (~100 lines), Caddyfile, systemd units, backup timer, setup README |

**Effort:** ~1–1.5 days of code and tests, ~1 day for the VPS setup, migration and checks, so
**2–3 days**. Plus ongoing care: OS updates, disk, backups.

**Risks:**
- **Single server:** if the VPS is down, uncached images break. Cloudflare keeps serving what it has cached, but doesn't guarantee it.
- **Disk:** 25 GB is ~10,000+ photo articles at today's sizes (more with the 1600 px cap), so it fills slowly. It needs monitoring anyway (§4).
- **Security upkeep:** patching, SSH keys, firewall. Leaking `UPLOAD_HMAC_SECRET` would allow uploads (not reads, not DB access). Rotate it if in doubt.
- **The HTML rewrite** must be exact; keep the Supabase copies until it's verified.
- **Tunisian VPS uplink:** fine behind Cloudflare. Only cache misses come from Tunisia.

### 3.6 Hosted alternative for images only: Cloudflare R2

| | VPS (option A) | Cloudflare R2 |
|---|---|---|
| Cost | VPS rental (not free) | **Free up to 10 GB-month, 1M writes, 10M reads/month; egress free.** Card needed: already on file for this account |
| Capacity | 25 GB disk | 10 GB free, then $0.015/GB-month |
| Ops | OS, Caddy, service, backups, monitoring | None; durable storage |
| Upload path | Signed URLs to the VPS | Upload through the Worker's R2 binding (we already have one), or S3 presigned URLs. Code change about the same size as option A |
| Serving | Cloudflare in front of the VPS | Public bucket on a **custom domain** (`r2.dev` is "rate-limited and should only be used for development"); Cloudflare cache included |
| Prerequisite | Own domain on Cloudflare | Own domain on Cloudflare |
| Data location | Tunisia (one server) | Cloudflare (global) |

Both fix the egress problem the same way. **R2 gives up 15 GB of headroom and local hosting in
exchange for zero operations, and it costs nothing at this size.** The VPS makes sense if it will
also host the site (§5) or for data-location reasons.

---

## 4. Capacity monitoring

### 4.1 What the admin «النظام» page shows today

`src/app/[locale]/admin/(panel)/system/page.tsx` + RPC `admin_system_status()`
(`supabase/migrations/20261001001100_analytics_stats.sql`):
- **Database:** size bar, `pg_database_size` against a fixed 500 MB.
- **Storage:** bar with the sum of `storage.objects.metadata.size`, against a fixed 1 GB.
- **Raw statistics:** row counts (`pageviews_raw`, `engagement_raw`).
- **Pausing:** a note about the free plan pausing inactive projects.
- **Rollups:** the last 10 runs (job, start time UTC, status, detail).
- **Cron jobs:** each job's name, schedule, and whether it's switched off.
- **Build:** the build id, and the «إعادة توليد الذاكرة المؤقتة» button (expire all caches).

There are no colour thresholds, nothing from Cloudflare, and no egress.

### 4.2 Proposed "capacity" panel

Thresholds: **green < 70 %, `--warn` 70–90 %, `--danger` ≥ 90 %**. Fetched server-side
(admin only), cached for 5 minutes (`unstable_cache`, revalidate 300) so opening the page doesn't
cost many subrequests. All tokens are Wrangler secrets, never sent to the browser.

| Metric | Limit | How to fetch | Token | Free? |
|---|---|---|---|---|
| Worker requests today / 7-day max | 100,000/day | Cloudflare GraphQL `workersInvocationsAdaptive`, `sum.requests` by day, `scriptName: "www"` | API token with **Account Analytics: Read** (`CF_ANALYTICS_TOKEN`) | Yes (queried on this free account for this review) |
| CPU-limit errors (24 h) | 0 expected | Same dataset, `dimensions.status` (`exceededResources`), `sum.errors` | same | Yes |
| CPU p50 / p99 | 10 ms nominal | Same dataset, `quantiles.cpuTimeP50/P99` | same | Yes |
| Subrequests per request | 50 | `sum.subrequests / sum.requests` (now ~6.5) | same | Yes |
| Database size | 500 MB | `pg_database_size` (existing RPC) | none | Yes |
| Raw stats projection | — | rows × 366 B, and 60-day projection at the current daily rate | none | Yes |
| Supabase storage | 1 GB | `storage.objects` sum (existing RPC); 0 after moving images | none | Yes |
| Supabase egress (cached + uncached) | 5 + 5 GB/month | **No documented endpoint returning egress bytes was found** (Management API has `usage.api-counts`, request counts only). Show an **estimate** (page views × measured average image bytes) plus a link to the dashboard's Usage page | — | — |
| VPS disk used / free RAM | 25 GB / 2 GB | `GET https://img.<domain>/health` on the VPS (`df`, `/proc/meminfo`), bearer token | `MEDIA_HEALTH_TOKEN` | Yes |
| R2 storage (if R2) | 10 GB | Cloudflare GraphQL `r2StorageAdaptiveGroups` | Analytics Read | Yes |

Effort: ~1 day (one server module for the fetches, one section in the system page, translations, tests).

---

## 5. Running the same app on a Node VPS

### 5.1 Every Cloudflare-specific dependency

| Where | What | On a Node VPS |
|---|---|---|
| `package.json` | `@opennextjs/cloudflare`, `wrangler`; scripts `build:cf`, `preview:cf`, `deploy` (`scripts/deploy.sh`), `cf-typegen`, `bundle:size` (`scripts/bundle-size.ts`) | Unused; replace with `next build` + `next start` / standalone |
| `open-next.config.ts` | R2 incremental cache + Cache API (`withRegionalCache`), memory data cache, D1 tag cache, Durable Object queue, `enableCacheInterception` | Unused. Next's built-in file-system cache does ISR and `revalidateTag` on one server |
| `wrangler.jsonc` | Bindings `NEXT_INC_CACHE_R2_BUCKET` (R2), `NEXT_TAG_CACHE_D1` (D1), `NEXT_CACHE_DO_QUEUE` (DO), `WORKER_SELF_REFERENCE` (service), `ASSETS`, vars | Unused; vars → `.env` on the server |
| `next.config.ts` | `initOpenNextCloudflareForDev()` in dev | Remove (dev only) |
| `src/lib/analytics/request.ts:14` | `cf-ipcountry` header | Still works **if Cloudflare proxies the VPS**; otherwise country is empty (or add a GeoIP lookup) |
| `src/lib/security/rate-limit.ts:24` | `cf-connecting-ip` (falls back to `x-real-ip`, `x-forwarded-for`) | Works behind Cloudflare; set the proxy to pass the real IP |
| `src/app/api/t/route.ts`, `api/ads/i/route.ts` | `after()` | Next built-in; works in Node (OpenNext maps it to `waitUntil` on Workers) |
| `src/middleware.ts` | Edge-style middleware | Works in Node; can be migrated to `proxy.ts` there (OpenNext was the blocker) |
| Rate limiter | Per-isolate memory | Per process: stricter on one server, fine |
| `.github/workflows/ci.yml` | Builds with `build:cf` | Add a `next build` + deploy job |
| `scripts/deploy.sh` | Moves `.env.local` aside because OpenNext copies `.env` values into the Worker | Not needed: give the server its own `.env.production` and never copy `.env.local` to it |

No application code calls `getCloudflareContext`, R2, D1 or KV directly; they're used only
through OpenNext's cache layer. The app itself is plain Next.js + Supabase.

### 5.2 Effort to run on a Linux VPS

1. `next.config.ts`: `output: 'standalone'` (and keep `--webpack` or switch back to Turbopack; the
   Worker size reason disappears).
2. **Build in CI, not on the VPS:** a Next build of this app is likely to need more than 2 GB of RAM.
   Ship `.next/standalone` + `.next/static` (+ `public`).
3. Run with **PM2** (`node server.js`, restart on crash) or **Docker** (`node:22-alpine`, one
   container). Expect ~150–250 MB RAM idle, ~300–500 MB under load. That fits 2 GB together with
   Caddy and the image service.
4. **Caddy** in front (TLS to Cloudflare, compression), Cloudflare proxy in front of Caddy. HTML
   caching at Cloudflare needs a cache rule (Next sends `s-maxage` for ISR pages); otherwise Next's own
   cache on the VPS serves them, which is fast enough at these volumes.
5. Environment variables from `.env.production` (same names). Secrets stay on the server.
6. `open-next.config.ts` (memory data cache, cache interception) simply isn't used: those were
   workarounds for Workers, and Next's own cache handles a single server.

**Effort: ~1–2 days** including CI deploy, first setup and testing; then server upkeep.
**Gains:**
- no CPU, subrequest or request-count limits
- simpler caching
- `proxy.ts` becomes possible

**Costs:**
- one server to keep alive and patched
- no automatic scaling
- a crash or full disk takes the site down, where Cloudflare's 300 locations don't

A middle path is Workers Paid ($5/month, `docs/WORKERS-PAID.md`), which removes the CPU and
subrequest risks with no infrastructure change.

---

### How the numbers were obtained

- Bundle: `pnpm build:cf && pnpm bundle:size`.
- CPU: `npx wrangler tail www --format json` while requesting never-visited and cached pages; Cloudflare GraphQL `workersInvocationsAdaptive` for the last 48 h.
- Database: `pg_database_size`, `pg_column_size` on article 33 and its revisions, `pg_total_relation_size` of temporary tables `(like public.pageviews_raw including indexes)` etc. filled with 100,000 rows copied from the real ones (temporary, dropped at session end; no real data touched).
- Storage: `storage.objects` metadata sizes for article 33.
- Image headers: `curl -sI` on a public image URL.
- Limits: Cloudflare Workers limits, static-assets billing, R2 pricing and public-buckets pages; Supabase pricing, egress and billing FAQ pages (all fetched 2026-10-02).
