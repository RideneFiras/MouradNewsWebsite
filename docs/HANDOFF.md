# Handoff — current state of the build

_Updated at the end of every phase. Read this first if you are a new Claude Code
session continuing the work._

## Where we are

- **Current phase:** Phase 4 — Monetization (starting). Phases 0–3 are done and pushed.
- **Branch:** `claude/inspiring-curie-5nj5ew` (pushed to `origin`).
- **Done:** see `docs/PROGRESS.md` (Phases 0–3).
- **Half-done:** `src/components/public/AdSlot.tsx` is a stub that renders nothing. Sidebar links «الإشهار» (`/admin/ads`) and «ملف المعلنين» (`/admin/media-kit`) point to pages not built yet. The token helper (`src/lib/analytics/token.ts`) is meant to be reused by `/api/ads/i`.

## Next 5 concrete steps

1. `/admin/ads`: slots list/edit (mode adsense/direct/house, AdSense slot id, sizes, active) and campaigns CRUD (sponsor, slot, dates, desktop/mobile creatives from the media library, https click URL, weight, target sections, language; status upcoming/running/ended). RPCs/tables are in migration 09.
2. Public `AdSlot`: reserved height, «إشهار» label, client-side weighted pick from active campaigns (`/api/ads/active?slot=` with short cache or embedded JSON), AdSense manual unit loaded lazily after interaction/idle with collapse on `data-ad-status="unfilled"`, house ad fallback, `?show_slots=1` outline mode.
3. `/api/ads/i` (IntersectionObserver ≥50 % for ≥1 s; same anti-abuse as `/api/t`) → `record_ad_impression`; `/api/ads/c/[id]` → `record_ad_click` + 302 to the campaign URL (`rel="sponsored noopener"`); `/ads.txt` from settings.
4. Sponsor report per campaign (printable + CSV) from `ad_campaign_report`; `/admin/media-kit` settings (metrics checkboxes, period, rounding, formats, pitch/contact) feeding `/advertise`.
5. Phase 4 tests: e2e campaign → impression + click counted → report; CLS check on pages with slots; screenshots `docs/screenshots/phase4`; bundle size; docs.

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
