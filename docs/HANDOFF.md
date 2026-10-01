# Handoff — current state of the build

_Updated at the end of every phase. Read this first if you are a new Claude Code
session continuing the work._

## Where we are

- **Current phase:** Phase 5 — SEO, polish, launch prep (starting). Phases 0–4 are done and pushed.
- **Branch:** `claude/inspiring-curie-5nj5ew` (pushed to `origin`).
- **Done:** see `docs/PROGRESS.md` (Phases 0–4).
- **Half-done:** nothing. Known issue to fix in Phase 5: web-font swap causes ~0.12 CLS on article pages at 375 px (see DECISIONS, Phase 4).

## Next 5 concrete steps

1. SEO: review metadata/hreflang/canonical, JSON-LD (NewsArticle, Organization, BreadcrumbList), `sitemap.xml` index + per-type sitemaps, `news-sitemap.xml` (last 48 h), `robots.txt`, RSS (`/[locale]/rss.xml`, per-section).
2. Performance: font strategy (subset / fewer weights / preload only the headline face / `size-adjust` fallbacks) to remove the swap CLS and the 374 KB font cost; check `srcset`/`sizes`; Lighthouse mobile ≥ 90/95/100 on home and article.
3. Accessibility: axe in Playwright on main public and admin pages (no serious/critical), keyboard and focus review.
4. Security review: CSP, headers, contact rate limits; `scripts/backup.sh` (pg_dump of the Supabase DB, free).
5. `docs/DEPLOY.md`, `docs/LAUNCH.md`, README update; final screenshot review; PROGRESS "What Firas needs to do"; HANDOFF "Checks to run on Firas's machine".

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
`pnpm db:local-reset`. Then `pnpm dev:traffic` for 45 days of simulated (local-only) readers so the
statistics screens have numbers (`pnpm dev:traffic --clear` removes them).

Restart the local production server for e2e: `bash scripts/restart-prod.sh` (port 3001; run e2e with `E2E_BASE_URL=http://localhost:3001 E2E_NO_SERVER=1`).
Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:db && pnpm build:cf && pnpm bundle:size`.
E2E: `pnpm build && pnpm start` (other terminal), then `E2E_NO_SERVER=1 pnpm test:e2e` (needs local Supabase + demo seed). Run e2e against `next start`, not `next dev` (Strict Mode double-sends page views in dev).
Screenshots: `node scripts/screenshots.mjs <folder>`; Lighthouse: `bash scripts/lighthouse.sh <label>`.

## Checks to run on Firas's machine

(None blocked so far — Docker, Supabase CLI and Chromium all work in the cloud sandbox.)

## Known problems

- In the cloud sandbox the Docker daemon is a background job with a 2-hour limit; when it stops, restart it (`dockerd &`) and run `npx supabase stop && npx supabase start` (data is kept in Docker volumes). Not an issue on a normal machine.
- `next build` warns that `middleware.ts` is deprecated in favour of `proxy.ts`; intentionally kept (see DECISIONS.md).

## Prompt to resume in a new session

> Read `docs/CLOUD_RUN.md`, `CLAUDE.md`, then `docs/HANDOFF.md`, `docs/PROGRESS.md` and `docs/DECISIONS.md`. Continue the build from the "Next 5 concrete steps" in HANDOFF.md, following `docs/09-build-plan.md` (phases 0–5, skip 6) and the rules in CLOUD_RUN.md. Keep HANDOFF.md current and push after every phase.
