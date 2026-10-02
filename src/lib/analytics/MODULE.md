# src/lib/analytics: first-party, cookieless tracker

Spec: `docs/07-analytics-and-monetization.md`. The site's own statistics are the source of truth
for the admin dashboard and the public media kit. They must stay credible: **nobody can edit them**.

Flow: `Tracker.tsx` (browser) → `POST /api/t` → `track_pageview` / `track_engagement` (Postgres,
service role) → raw tables → cron rollups → `analytics_daily*` → stats RPCs / `media_kit_public()`.

| File | What |
|---|---|
| `token.ts` | Page token: HMAC (`TRACKER_HMAC_SECRET`) of a 10-minute bucket, rendered into each page; accepted for 24 h because pages are cached |
| `classify.ts` | Traffic source from referrer + UTM: direct, facebook, instagram, whatsapp, x, google, other_search, internal, referral… |
| `engagement.ts` | Engaged time (only while visible and active, capped) and scroll depth |
| `device.ts` | Coarse device class from the user agent (the UA itself is never stored) |
| `request.ts` | `hasStaffSession` (Supabase auth cookie → not counted), `isBotRequest`, `countryOf` (Cloudflare header) |
| `consent.ts` | Google Consent Mode v2 defaults: denied in EEA/UK/CH until Google's consent message says otherwise; only used when GA4/AdSense are on |

Privacy: no cookies, no localStorage IDs. The IP and user agent go to Postgres only to compute a
visitor hash with the month's salt (`analytics_salts`, rotated monthly); neither is stored.

Rules: don't add a code path that writes statistics outside `/api/t`, `/api/ads/*` and the cron
functions; don't count staff or bots; keep `/api/t` answering 204 for everything.
