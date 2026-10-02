# tests

| Folder | Runner | Needs | Command |
|---|---|---|---|
| `unit/` | Vitest | nothing | `pnpm test` (50 tests: dates, slugs, source classification, analytics tokens/engagement, article body, ads pick, stats ranges) |
| `e2e/` | Playwright (Chromium) | local Docker Supabase with demo content, app on `next start` | `bash scripts/restart-prod.sh` then `E2E_BASE_URL=http://localhost:3001 E2E_NO_SERVER=1 pnpm test:e2e` |
| `../supabase/tests/` | psql | local Docker Supabase | `pnpm test:db` (RLS per role, author publish guard, last-admin guard, statistics write lock, rollups, media kit rounding, search) |
| `support/` | | | `load-env.ts` (loads `.env.local` for e2e), `route-images.mjs` (fetches remote demo images through Node) |

e2e specs: `public` (pages, RTL/LTR, redirects), `admin` (login, editor, publish), `analytics`
(beacons counted once, staff and bots excluded), `ads` (slots, impressions, clicks),
`mediakit`, `seo` (sitemaps, feeds, JSON-LD, canonical), `security` (headers, no secrets in
bundles, admin/API guards), `a11y` (axe, WCAG 2.1 AA).

**Never run e2e or SQL tests against the online project**: they create users, write analytics
rows and truncate tables. Run e2e against `next start`, not `next dev` (React Strict Mode sends
page views twice in dev). Firas's machine has no `psql` yet (`sudo apt install postgresql-client-17`)
and hasn't set up the local Docker Supabase, so only `pnpm test` runs there today.
