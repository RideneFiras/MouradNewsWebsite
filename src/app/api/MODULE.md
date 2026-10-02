# src/app/api: route handlers

All are POST/GET handlers running in the Worker. None is cached. Abuse protection is
per-isolate rate limiting (`src/lib/security/rate-limit.ts`) plus, recommended, a Cloudflare
WAF rate-limit rule on `/api/` (docs/DEPLOY.md §6).

| Route | What | Writes with |
|---|---|---|
| `t` | First-party analytics beacon from `Tracker.tsx` (page view, then engagement when the tab hides). Always 204; invalid hits dropped silently | service role → `track_pageview` / `track_engagement` (in `after()`, i.e. `ctx.waitUntil`) |
| `ads/i` | Sponsor ad impression (≥ 50 % visible ≥ 1 s) | service role → `record_ad_impression` |
| `ads/c/[id]` | Sponsor click: counts, then 302 to the campaign's https link | service role → `record_ad_click` |
| `contact` | Contact form (honeypot, minimum time, rate limit) | service role → `contact_messages` |
| `revalidate` | Expire cache tags. Header `x-revalidate-secret: $REVALIDATE_SECRET`, body `{"tags": [...]}` or `{"all": true}`. Called by the DB (`publish_scheduled` via `pg_net`) | — |
| `auth/callback` | Supabase e-mail links (invite, password reset) land here, then redirect to `next` | Supabase session cookie |

## The tracker contract (don't weaken it)

- Requests must carry the page token (`src/lib/analytics/token.ts`): an HMAC of a 10-minute bucket
  rendered into the page, accepted for 24 h (cached pages).
- Dropped without counting: bots (`isbot`), staff (Supabase auth cookie present), bad/expired token,
  rate-limited IPs. Response is the same 204 either way, so probing reveals nothing.
- The Worker never stores the IP or user agent: it passes them to `track_pageview`, which hashes
  them with the month's salt inside Postgres.
- These routes are the **only** writers of statistics besides the cron rollups. Never add an
  endpoint that lets a person set or correct a number.
