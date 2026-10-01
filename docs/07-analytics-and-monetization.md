# 07 — Analytics and monetization

Two goals:
1. **Credible numbers** the editor can show to sponsors, that nobody (including admins) can edit.
2. **Useful numbers** for the newsroom: what people read, from where, for how long, per article, section and author.

We run **our own first-party, cookieless analytics** (source of truth for the dashboard and media kit) **plus GA4** (a name advertisers recognise, and needed for AdSense insight). Numbers between the two will differ; the media kit uses ours and says how they are measured.

## First-party tracker

### Client (`src/lib/analytics/tracker.ts`, tiny, no dependencies)

On every public page load (not admin, not preview):
1. Generate `pv_id` (UUID v4) in memory.
2. Send a **pageview** beacon (`navigator.sendBeacon` to `/api/t`, JSON fallback to `fetch(..., {keepalive:true})`):
   `{ type: 'pv', pv_id, path, article_public_id?, locale, referrer: document.referrer, utm_source, utm_medium, utm_campaign, screen_w, ts_token }`
3. Measure **engaged time**: count seconds only while the tab is visible and the user was active (scroll, key, pointer, touch) in the last 15 seconds. Measure **max scroll depth** in % of the article body (not the whole page) on article pages.
4. Send an **engagement** beacon on `visibilitychange` to hidden and on `pagehide`: `{ type: 'eng', pv_id, engaged_seconds, max_scroll_pct }`. Cap engaged seconds at 1800. Send at most once per hidden event; later beacons for the same `pv_id` update by taking the max (the server upserts).

No cookies, no localStorage identifiers, no fingerprinting beyond what's described below.

`ts_token`: the server renders a short HMAC token (`TRACKER_HMAC_SECRET`) of `path + 10-minute time bucket` into the page. The endpoint rejects payloads whose token doesn't match the current or previous bucket. This stops naive scripted inflation (someone posting fake views to `/api/t` from a script without loading pages).

### Server (`/api/t` route on the Worker)

1. Validate payload with zod, max body 2 KB.
2. Drop if:
   - the request has a valid staff session cookie (`exclude_staff`, always on),
   - the user agent matches a bot list (use the `isbot` package), or is empty,
   - the `ts_token` is invalid,
   - the per-IP rate limit is exceeded (e.g. 60 pv/minute).
3. Derive:
   - `country` from Cloudflare's `CF-IPCountry` header (2-letter, `XX` unknown),
   - `device` from UA (mobile / tablet / desktop),
   - `source` from referrer host + UTM (classification table below),
   - `referrer_host` (host only, never the full URL),
   - `visitor_hash = sha256(month_salt || ip || user_agent || site_id)` using the **current month's salt** from `analytics_salts` (cache it in the isolate for a few minutes). The IP and UA are never stored.
4. Insert into `pageviews_raw` / upsert `engagement_raw` with the service role.
5. Respond `204` immediately (use `ctx.waitUntil` for the DB write if available in the OpenNext context).

Because the salt rotates monthly and is deleted afterwards, the hash can't be reversed or linked across months. This is privacy-friendly and lets us count **monthly unique visitors**, which is what advertisers ask for.

### Source classification

| Condition (first match wins) | Source |
|---|---|
| `utm_medium = newsletter` or `utm_source` contains `newsletter` | newsletter |
| `utm_source` in (facebook, fb) or referrer host in (facebook.com, m.facebook.com, l.facebook.com, lm.facebook.com, fb.com) | facebook |
| referrer instagram.com, l.instagram.com | instagram |
| `utm_source = whatsapp` or referrer contains `whatsapp` | whatsapp |
| referrer t.co, x.com, twitter.com | x |
| referrer google.* (any TLD) | google |
| referrer bing.com, duckduckgo.com, yahoo.*, yandex.*, ecosia.org, qwant.com | other_search |
| referrer is our own host | internal |
| referrer in (tiktok.com, linkedin.com, lnkd.in, youtube.com, t.me, telegram.org, reddit.com) | other_social |
| any other referrer | referral |
| no referrer | direct |

Note: WhatsApp and many in-app browsers send no referrer, so WhatsApp shares land in "direct". To recover them, **the share buttons on our pages add `?utm_source=whatsapp&utm_medium=share`** (and `facebook`, `x`, `copy`). Strip UTM params from the URL after reading them (`history.replaceState`) so they don't get re-shared.

Unit-test the classifier.

### Raw tables

`pageviews_raw`
| Column | Type |
|---|---|
| pv_id | uuid PK |
| occurred_at | timestamptz default now() |
| path | text |
| article_id | uuid null (resolved from public_id) |
| category_id | uuid null (article's primary category, or the category page's) |
| locale | content_language |
| source | traffic_source |
| referrer_host | text null |
| utm_source, utm_medium, utm_campaign | text null |
| country | char(2) |
| device | device_type |
| visitor_hash | bytea (32) |

Indexes: `(occurred_at)`, `(article_id, occurred_at)`.

`engagement_raw`: `pv_id uuid PK FK pageviews_raw on delete cascade, engaged_seconds int, max_scroll_pct smallint, updated_at`.

Storage estimate: ~250 bytes per page view with indexes. At 10,000 page views/day, 60 days of raw data ≈ 150 MB. That fits the 500 MB free DB with room for content. The system page shows the DB size; retention days are configurable. If traffic grows past ~25k views/day, lower retention to 30 days or move to Supabase Pro.

### Rollups

`analytics_daily`
| Column | Notes |
|---|---|
| date | date (Africa/Tunis day) |
| dimension | text: `site`, `locale`, `source`, `country`, `device`, `category`, `referrer_host`, `utm_campaign` |
| dimension_value | text (`'all'` for site) |
| pageviews | int |
| visitors | int (distinct visitor_hash that day) |
| engaged_seconds_sum | bigint |
| engaged_count | int (page views with engagement data) |
| reads | int (article page views with `max_scroll_pct ≥ 75`) |
| article_views | int (page views that are article pages) |

PK `(date, dimension, dimension_value)`.

`analytics_daily_article`: `date, article_id, pageviews, visitors, engaged_seconds_sum, engaged_count, reads, source_breakdown jsonb ({facebook: n, google: n, ...}), country_breakdown jsonb (top 10), device_breakdown jsonb`. PK `(date, article_id)`.

`analytics_monthly_uniques`: `month date, dimension ('site'|'category'|'author'|'locale'), dimension_value text, visitors int, pageviews int`. PK `(month, dimension, dimension_value)`. Computed from raw rows for the current month (recomputed nightly while the month is open; frozen after the month ends, since raw rows will later be pruned). **Because of retention, raw retention must be ≥ 35 days so a full month can be computed.** Enforce a minimum of 35 days in settings.

Rollup functions (`security definer`, idempotent upserts) are run by pg_cron (see database doc) and also exposed as an admin-only RPC `run_rollup(from_date, to_date)` for recovery.

### Metric definitions (show these as tooltips in the dashboard and on the media kit)

| Metric | AR label | Definition |
|---|---|---|
| Page views | مشاهدات الصفحات | Every page loaded by a real browser, excluding bots and logged-in staff |
| Unique visitors (daily) | الزوار | Distinct anonymous visitor fingerprints in a day |
| Unique visitors (monthly) | الزوار الشهريون | Distinct anonymous visitors in a calendar month |
| Engaged time | مدة القراءة الفعلية | Average seconds a reader was active on the page with the tab visible |
| Read-through rate | نسبة إكمال القراءة | Share of article views that scrolled through ≥ 75% of the article |
| Sources | مصادر الزيارات | Where the visit came from (see classification) |

Per-author numbers: an article with several authors counts fully for each of them (state it in the tooltip).

### Stats RPCs (read-only)

Implement as `security definer` functions that check the caller's role:
- `stats_overview(from, to, locale?)`
- `stats_timeseries(from, to, metric, granularity)`
- `stats_top_articles(from, to, limit, category_id?, author_id?)`
- `stats_article_detail(article_id, from, to)`
- `stats_breakdown(from, to, dimension, limit)`
- `stats_authors(from, to)`
- `stats_categories(from, to)`
- `stats_realtime(minutes default 30)` (from raw)
- `media_kit_public()` — returns only the metrics enabled in `site_settings.media_kit`, for the configured period, with rounding applied. Callable by anon. This is the only public stats function.
- `my_*` variants for authors, filtered by `article_authors`.

"Today" uses raw data for the current day in Africa/Tunis plus rollups for previous days.

## GA4

- Measurement ID from settings; if empty, nothing loads.
- Load with consent defaults (see public site doc). Send page_view on route change.
- Send `article_read` event when an article is read through (≥75%), with `section` and `author` as event params. Keep it minimal.
- Don't build any dashboard from GA4 data; the admin links to GA4 for deeper analysis.

## Google AdSense

- Enabled only when `adsense.enabled` and a client ID are set.
- Load the AdSense script once, lazily, after interaction or idle.
- **Manual ad units only** in our slots (mode `adsense` with a slot ID). Recommend in the admin helper text that Auto ads stay off in the AdSense dashboard, because they inject ads into places that break the layout.
- Reserve slot height to prevent CLS. Hide the label «إشهار» if the unit doesn't fill (listen for the `data-ad-status="unfilled"` attribute and collapse).
- `ads.txt` is served from settings at `/ads.txt` (text/plain).
- AdSense approval requires a real site with original content, an About page, a contact page and a privacy policy. Make sure those pages exist and are published before the owner applies (list it in the launch checklist).

## Direct sponsor ads

- Slot resolution order per request: active direct campaign(s) for the slot (matching locale and target categories, within dates; weighted random among them) → AdSense if slot mode is `adsense` → nothing.
  Slot mode `direct` means "campaigns only, no AdSense fallback"; mode `house` shows a house ad (e.g. «أعلن معنا» linking to the media kit) when no campaign is running.
- Because pages are cached, **campaign selection happens client-side** from a small JSON of active campaigns embedded in the page (or fetched from `/api/ads/active?slot=...` with a short cache). Rotation then varies between visitors even on cached pages.
- Impression: counted when ≥ 50% of the creative is visible for ≥ 1s (IntersectionObserver), sent to `/api/ads/i` (same anti-abuse checks as the tracker: bot filter, staff exclusion, HMAC token, rate limit). Aggregated per day into `ad_daily_stats` via upsert increments.
- Click: link goes through `/api/ads/c/{campaign_id}` which increments clicks and 302-redirects to `click_url` (validated https, stored on campaign). Add `rel="sponsored noopener"`.
- Sponsor report shows impressions, clicks, CTR per day and totals, printable.

## Media kit (public page `/advertise`)

Composition (texts editable, numbers live and read-only):
1. Editor's pitch (from the page body).
2. **Audience numbers** for the configured period, via `media_kit_public()`: monthly unique visitors, monthly page views, average engaged time, % mobile, % from Tunisia vs abroad (top 3 countries), top sections, articles published per month. Each with its definition in a footnote.
3. **Social reach** (manual entries), labeled «حسب إحصائيات صفحة فيسبوك، أدخلت يدويا بتاريخ …».
4. A statement under the numbers, e.g. «تُحتسب هذه الأرقام آليًا بأداة قياس خاصة بالموقع، ولا يمكن تعديلها يدويا. تُستثنى زيارات فريق التحرير وبرامج الروبوت.» (editable text, but the numbers below it are not).
5. **Ad formats** (from settings): name, placement, size, price or «حسب الطلب».
6. Contact block + «تحميل نسخة PDF» (print).

The numbers are cached for 1 hour.

## Manual social stats

`social_stats`: `id, platform ('facebook'|'instagram'|'youtube'|'tiktok'), recorded_for date, followers int, reach_28d int, engagement_28d int, note text, entered_by, created_at`. Editors/admins can insert and correct their own entries within 24h (this is human data and is always labeled as manual, which keeps the automatic stats credible).
