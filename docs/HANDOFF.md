# Handoff — current state of the build

_Updated at the end of every phase. Read this first if you are a new Claude Code
session continuing the work._

## Where we are

- **Status: Phases 0–5 complete** (Phase 6 is optional and was not started, per CLOUD_RUN.md). Everything is committed and pushed.
- **Branch:** `claude/inspiring-curie-5nj5ew`.
- **Done:** see `docs/PROGRESS.md` (Phases 0–5, and "What Firas needs to do" at the end).
- **Half-done:** nothing.

## Next 5 concrete steps (for whoever continues)

1. Firas: deploy following `supabase/APPLY.md` then `docs/DEPLOY.md`.
2. Run the "Checks to run on Firas's machine" below against the real domain; fix anything they reveal (most likely: Lighthouse performance on the article page, see DECISIONS Phase 5).
3. Owner: `docs/LAUNCH.md` (content, legal pages, Google, Facebook, training).
4. If wanted, Phase 6 options from `docs/09-build-plan.md` (newsletter, reader tips, volleyball module, PWA).
5. Keep `pnpm bundle:size` under 3 MiB gzip on every change (now 1.61 MiB).

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

Things that could not run in the cloud sandbox (no credentials, no real domain, proxy in the way):

1. **Real deployment**: `pnpm build:cf && pnpm deploy` with the real Supabase project and Cloudflare account (DEPLOY.md). The OpenNext build and `wrangler deploy --dry-run` pass here; the upload itself needs Cloudflare credentials.
2. **Lighthouse on the real domain** (Chrome DevTools → Lighthouse → Mobile, or `bash scripts/lighthouse-median.sh https://your-domain.tn 5`): home and an article, targets perf ≥ 90, a11y ≥ 95, SEO 100. In the sandbox: home 94, article 80 (noisy machine; demo photos blocked by the sandbox proxy).
3. **JSON-LD validation**: paste an article URL into Google's Rich Results Test and the Schema.org validator (network access to Google was not available for this).
4. **Backups**: `SUPABASE_DB_URL=… bash scripts/backup.sh` against the real project, then restore the dump into a scratch project (`pg_dump` 17 needed).
5. **E-mail flows** with the real Supabase project: invitation, forgot password → `/api/auth/callback` → new password (tested locally with the CLI's mail catcher only).
6. **AdSense** live units (needs an approved account): a slot in AdSense mode fills, and an unfilled unit collapses. The collapse logic is in `AdSlotClient.tsx`; only the sponsor and house modes were tested end to end here.
7. **Cloudflare cache behaviour**: publish an article and check it appears on the homepage within a minute (on-demand revalidation through R2/D1).
8. **R2 activation**: if Cloudflare asks for a card and you don't want to add one, use the KV fallback (DEPLOY.md §1).

## Known problems

- In the cloud sandbox the Docker daemon is a background job with a 2-hour limit; when it stops, restart it (`dockerd &`) and run `npx supabase stop && npx supabase start` (data is kept in Docker volumes). Not an issue on a normal machine.
- `next build` warns that `middleware.ts` is deprecated in favour of `proxy.ts`; intentionally kept (see DECISIONS.md).
- Lighthouse numbers in the cloud sandbox vary ±15 points between identical runs; trust the real-domain run.
- E2E tests must run against `next start` (port 3001 via `scripts/restart-prod.sh`), not `next dev` (Strict Mode double-sends page views).
- `pnpm test:db` empties the local analytics tables (so its numbers are deterministic); run `pnpm dev:traffic` again afterwards if you want local statistics.

## Prompt to resume in a new session

> Read `CLAUDE.md`, then `docs/HANDOFF.md`, `docs/PROGRESS.md` and `docs/DECISIONS.md`. Phases 0–5 are done. Start from "Next 5 concrete steps" in HANDOFF.md (or the Phase 6 item I name), keep the design system and the free-tier rules, run the checks listed in HANDOFF.md before each push, and keep HANDOFF.md current.
