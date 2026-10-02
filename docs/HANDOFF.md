# Handoff — current state of the build

_Updated at the end of every phase. Read this first if you are a new Claude Code
session continuing the work._

## Where we are

- **Status: Phases 0–5 complete** (Phase 6 is optional and was not started, per CLOUD_RUN.md). Everything is committed and pushed.
- **Branch:** `main` (the cloud branch `claude/inspiring-curie-5nj5ew` was merged).
- **Done:** see `docs/PROGRESS.md` (Phases 0–5, and "What Firas needs to do" at the end).
- **Half-done:** nothing.

## On Firas's machine (2026-10-01)

- Repo cloned from GitHub `main` (c6ec606). Node 22 via nvm (`nvm use 22`; the machine default was 20), pnpm 10.28.
- Checks run here: `pnpm lint` ✅, `pnpm typecheck` ✅, `pnpm test` ✅ (50/50), `pnpm build:cf` ✅, `pnpm bundle:size` ✅ 1.61 MiB gzip.
  Not run: `pnpm test:db` and e2e (they need the local Docker Supabase, which Firas chose not to use; `psql` is also not installed — `sudo apt install postgresql-client-17` if needed).
- **Local development uses the online Supabase project** `alborjnews` (ref `knxuskjqpsimptwxqfju`, eu-central-1, free plan). `.env.local` holds its URL, anon and service_role keys (legacy JWT keys) and two random secrets. APPLY.md steps 1–6 done: migrations, seed, admin `firasuv@gmail.com`, **demo content loaded** (32 articles, remove with `demo-clear.sql` before launch). Step 8 (`private.app_config`) waits for the public URL.
  Don't run `pnpm test:db` / `pnpm dev:traffic` against it (they truncate or fake statistics; the scripts refuse non-local URLs anyway).
- Access for Claude Code: the Supabase MCP server is configured in `.mcp.json` (approved in `.claude/settings.local.json`), and the Supabase CLI is logged in. `~/.bashrc` exports an old `SUPABASE_ACCESS_TOKEN` (another project) that overrides the CLI login and is rejected: run CLI commands as `env -u SUPABASE_ACCESS_TOKEN npx supabase … --linked --project-ref knxuskjqpsimptwxqfju`.
- **Supabase Advisor review** (nothing changed in the database):
  - "Security Definer View" ×4 (`article_cards`, `public_authors`, `public_ad_slots`, `active_ad_campaigns`): intended (DECISIONS → Database); each exposes only published/active public rows.
  - "anon/authenticated can execute SECURITY DEFINER function" ×19/×31: role helpers needed by RLS, RPCs that check the role first, trigger functions (not callable directly), and Supabase's own `rls_auto_enable`. No hole. Optional hygiene migration (not written yet): revoke `anon` execute on trigger functions, `admin_list_users`, `ad_campaign_report`, `unique_profile_slug`; wrap `auth.uid()` in `(select …)` in the 8 policies flagged by `auth_rls_initplan`.
  - "RLS enabled, no policy" ×4 (raw analytics, salts, app_config): intended lock.
  - "Leaked password protection": paid-plan feature, not available on Free.
  - Performance INFOs (unused indexes, unindexed FKs on small tables, multiple permissive policies): not relevant at this size.
- Verified in the browser with `pnpm dev` against the online project: home AR at 1280 px, article AR at 390 px.

## Deployed (2026-10-02)

- **Live: https://www.elborj.workers.dev** (Cloudflare account firasuv@gmail.com, account subdomain `elborj`, Worker `www`). Demo content was removed on 2026-10-02 (`demo-clear.sql`); re-apply `demo-seed.sql` only on a test project.
- Resources: R2 bucket `el-borj-opennext-cache` (R2 enabled in the dashboard), D1 `el-borj-tag-cache` (id in `wrangler.jsonc`), SQLite DO queue. Public vars in `wrangler.jsonc`; `.env.production.local` (git-ignored) holds the same public values for the build.
- Secrets set with `wrangler secret bulk` (new random values, not the local ones): `SUPABASE_SERVICE_ROLE_KEY`, `REVALIDATE_SECRET`, `TRACKER_HMAC_SECRET`. The same `REVALIDATE_SECRET` and `revalidate_url` are in Supabase `private.app_config`.
- Deploy with **`pnpm run deploy`** (`scripts/deploy.sh`: builds with `.env.local` moved aside and refuses to ship if a secret got bundled). `pnpm deploy` is pnpm's built-in and fails.
- Fixed during the first deploy (details in DECISIONS.md → Deployment): homepage 500 from the Free plan's 50-subrequest limit (data cache now in isolate memory), pages re-rendered on almost every visit (`enableCacheInterception`), `/favicon.ico` 500 (public layout locale guard), local secrets bundled into the Worker (deploy script).
- Measured live: cached page visits 15–60 ms CPU, page builds 400–700 ms CPU (above the Free plan's 10 ms; accepted by Cloudflare so far). Pages rebuild in the background at most about once a minute while visited. If error 1102 or "Too many subrequests" appear: `docs/WORKERS-PAID.md`.
- **Still to do by Firas**: Supabase → Authentication → URL Configuration: Site URL `https://www.elborj.workers.dev`, add redirect URL `https://www.elborj.workers.dev/**` (password reset / invitations). Then test login on the live site.
- Logs: `npx wrangler tail www` (add `--format json` for scripts). Debug cache logging for one deploy: `npx wrangler deploy --var NEXT_PRIVATE_DEBUG_CACHE:1`, then deploy again normally.

## Working with Claude Code (2026-10-02)

- `CLAUDE.md` was rewritten for maintenance (the build-session version said "the repository starts empty"). It holds the ground rules, commands, the live database and Cloudflare details, and the rules for touching the online database.
- Every main folder has a `MODULE.md` (map in CLAUDE.md). **`supabase/MODULE.md` is the database definition**: tables, roles, views, RPCs, triggers, cron, and how to change it.
- The live Supabase project has **no migration history table**: apply new migrations with the Supabase MCP `apply_migration`, never `supabase db push`.

## Next 5 concrete steps (for whoever continues)

1. Firas: Supabase Auth URLs for the live address (above), then log in on https://www.elborj.workers.dev/ar/admin/login.
2. Run the remaining "Checks to run on Firas's machine" below against the live site (Lighthouse, JSON-LD, backups, e-mail flows, AdSense, cache after publishing); fix anything they reveal.
3. Owner: `docs/LAUNCH.md` (content, legal pages, Google, Facebook, training).
4. If wanted, Phase 6 options from `docs/09-build-plan.md` (newsletter, reader tips, volleyball module, PWA).
5. Keep `pnpm bundle:size` under 3 MiB gzip on every change (now 1.62 MiB). Buy the domain and attach it (DEPLOY.md §5), then update `SITE_URL` and the Supabase Auth URLs.

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

1. ~~**Real deployment**~~ Done 2026-10-02 (see "Deployed" above).
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
