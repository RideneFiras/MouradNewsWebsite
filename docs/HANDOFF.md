# Handoff — current state of the build

_Updated at the end of every phase. Read this first if you are a new Claude Code
session continuing the work._

## Where we are

- **Current phase:** Phase 3 — Analytics (starting). Phases 0, 1 and 2 are done and pushed.
- **Branch:** `claude/inspiring-curie-5nj5ew` (pushed to `origin`).
- **Done:** see `docs/PROGRESS.md` (Phases 0–2).
- **Half-done:** `src/components/public/AdSlot.tsx` is a stub that renders nothing (Phase 4). `src/components/admin/stats/DashboardStats.tsx` is an empty placeholder (Phase 3). Sidebar links «الإحصائيات», «الإشهار», «ملف المعلنين» point to pages not built yet (Phases 3–4).

## Next 5 concrete steps

1. Tracker client (`src/lib/analytics/tracker.ts` + a tiny client component in the public layout) and `/api/t` (HMAC page token, isbot, staff exclusion, rate limit, `track_pageview`/`track_engagement` via service role).
2. Stats screens under `/admin/stats` (overview, articles + detail, sections, authors, sources, audience, Facebook manual entries, CSV export, printable monthly report) using the RPCs in migration 11; hand-rolled SVG charts.
3. Dashboard tiles (`DashboardStats`) and author "my stats".
4. GA4 loader with Consent Mode v2 defaults.
5. Phase 3 tests: classifier/engagement unit tests, beacon → rollup integration test, "no role can write analytics" via the API; screenshots; bundle size.

## Install and run (on Firas's machine)

```bash
pnpm install
cp .env.example .env.local   # fill in values (local Supabase values below)
# Local database (needs Docker):
npx supabase start           # prints the local URL and keys
npx supabase db reset        # applies supabase/migrations + supabase/seed.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/demo-seed.sql   # optional demo content
pnpm dev                     # http://localhost:3000
```

Local `.env.local` for `supabase start` (these are the CLI's fixed local dev keys,
not secrets):
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE_KEY printed by supabase start>
SUPABASE_SERVICE_ROLE_KEY=<SECRET_KEY printed by supabase start>
REVALIDATE_SECRET=local-dev-revalidate-secret
TRACKER_HMAC_SECRET=local-dev-tracker-secret
SITE_URL=http://localhost:3000
```

One command for a clean local database with demo content and test users
(admin@elborj.test / editor@elborj.test / author@elborj.test, password `local-dev-password`):
`pnpm db:local-reset`.

Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:db && pnpm build:cf && pnpm bundle:size`.
E2E: `pnpm build && pnpm start` (other terminal), then `E2E_NO_SERVER=1 pnpm test:e2e` (needs local Supabase + demo seed).
Screenshots: `node scripts/screenshots.mjs <folder>`; Lighthouse: `bash scripts/lighthouse.sh <label>`.

## Checks to run on Firas's machine

(None blocked so far — Docker, Supabase CLI and Chromium all work in the cloud sandbox.)

## Known problems

- In the cloud sandbox the Docker daemon is a background job with a 2-hour limit; when it stops, restart it (`dockerd &`) and run `npx supabase stop && npx supabase start` (data is kept in Docker volumes). Not an issue on a normal machine.
- `next build` warns that `middleware.ts` is deprecated in favour of `proxy.ts`; intentionally kept (see DECISIONS.md).

## Prompt to resume in a new session

> Read `docs/CLOUD_RUN.md`, `CLAUDE.md`, then `docs/HANDOFF.md`, `docs/PROGRESS.md` and `docs/DECISIONS.md`. Continue the build from the "Next 5 concrete steps" in HANDOFF.md, following `docs/09-build-plan.md` (phases 0–5, skip 6) and the rules in CLOUD_RUN.md. Keep HANDOFF.md current and push after every phase.
