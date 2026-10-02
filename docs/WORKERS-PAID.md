# Moving to Cloudflare Workers Paid ($5/month)

The site runs on the **Workers Free** plan. A few choices in the code exist only because
of Free-plan limits. This page lists them, so that the day the paper moves to **Workers
Paid** they can be switched back to the simpler or faster setup.

Nothing here is required after upgrading: the site keeps working as it is. These are
improvements, in order of value.

## Why upgrade (signs to watch)

| Sign | Where to see it |
|---|---|
| Error **1102** "Worker exceeded resource limits" | Visitors see a Cloudflare error page; Workers & Pages → `www` → Logs |
| "Too many subrequests" in the logs | `npx wrangler tail www` or the dashboard logs |
| More than ~100,000 requests a day | Workers & Pages → `www` → Metrics |

| | Free | Paid ($5/month) |
|---|---|---|
| Requests | 100,000 / day | 10 million / month included |
| CPU per request | 10 ms | 30 s (configurable up to 5 min) |
| Subrequests per request (Supabase, cache, R2, D1 calls) | **50, cannot be raised** | 10,000 (up to 10 million) |
| Worker size | 3 MiB gzip | 10 MiB gzip |

Measured on the live site (2026-10-02): building a page uses 400–700 ms of CPU; serving a
cached page uses about 15–60 ms. Cloudflare accepted these on Free, but the Free limit is
10 ms, so it is not guaranteed. Paid removes that risk.

To upgrade: Cloudflare dashboard → Workers & Pages → Plans → Workers Paid.

## 1. Data cache back in R2 (recommended)

**File:** `open-next.config.ts`

**Now (Free):** data lookups (`unstable_cache`) are kept in the memory of each Worker
instance. On Free, storing them in R2 + the Cache API cost ~5 subrequests per lookup and
the homepage went over the 50-subrequest limit on its first render (it returned errors).

**On Paid:** put them back in R2 so all Cloudflare locations share the same cached data
(fewer Supabase queries, faster first renders in a new location). Replace the custom
`incrementalCache` object with the regional R2 cache:

```ts
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  tagCache: d1NextTagCache,
  queue: doQueue,
  enableCacheInterception: true,   // keep this one
});
```

Delete `dataEntries`, `MAX_DATA_ENTRIES` and the custom object above it.

**Keep** `enableCacheInterception: true` on any plan: it is not a Free-plan workaround.
Without it, Next.js treated pages built on demand as fresh for 1 second on Workers and
rebuilt them on almost every visit (see DECISIONS.md, "Deployment").

## 2. Raise the CPU limit for page builds (optional)

**File:** `wrangler.jsonc`

```jsonc
"limits": { "cpu_ms": 30000 }
```

Paid allows up to 300,000 ms. 30 s is far more than a page build needs; the setting only
protects against an error page if a build is ever slow.

## 3. Shorter refresh time (optional)

**Files:** `export const revalidate = 60` in `src/app/[locale]/(public)/**/page.tsx` and
`REVALIDATE_SECONDS` in `src/lib/data/cache.ts`.

Edits made in the admin already appear at once (tags are revalidated on save). The
60-second refresh only matters for "most read" and time-based lists. It can stay at 60.
Lowering it means more page builds (CPU and R2 writes). Not recommended unless the editor
asks for it.

## 4. Things that do not change

- R2, D1 and the Durable Object queue stay as they are (they work on both plans).
- Secrets, `wrangler.jsonc` vars and `.env.production.local` stay as they are.
- Deploy the same way: `pnpm run deploy`.

## Checklist after upgrading

1. Upgrade in the dashboard.
2. Apply change 1 (and 2 if wanted), then run `pnpm typecheck && pnpm lint && pnpm test`.
3. `pnpm run deploy`.
4. `npx wrangler tail www` while opening `/ar`, `/fr` and an article: no
   "Too many subrequests", no exceptions.
5. `curl -sI https://<site>/ar | grep x-nextjs-cache`: `HIT` on most requests.
6. Note the change in `docs/DECISIONS.md` and `docs/HANDOFF.md`.
