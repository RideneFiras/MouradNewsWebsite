# Autonomous cloud run — overrides

These rules apply to the autonomous cloud session and **take precedence over anything else in the docs**.

## Never stop
- Don't stop and wait for the owner. Ignore stop points A, B and C in `09-build-plan.md`: write what you would have asked or reported into `docs/PROGRESS.md` and keep going.
- If a tool can't run in this sandbox (Docker, Playwright browsers, Lighthouse, screenshots), try to install it once. If that fails, write the tests and scripts anyway, skip running them, and list them in `docs/HANDOFF.md` under "Checks to run on Firas's machine". A blocked tool never stops the build.

## Free only
- Never use or propose a paid service. If something seems to need a paid tier (e.g. the Worker bundle approaching 3 MiB), solve it the free way: shrink the bundle, lazy-load admin code, drop the heavy dependency, or use a lighter alternative. Log it in `docs/DECISIONS.md`.

## No credentials
- No credentials exist here. Test the database locally: Supabase CLI if Docker works; otherwise install plain PostgreSQL in the sandbox (or use PGlite) and run migrations, seeds and RLS tests against it, with a small shim for Supabase-specific parts (`auth` schema, `storage` schema, `auth.uid()`, `pg_cron`). Log exactly what was and wasn't tested.
- Every external secret is a placeholder in `.env.example`, with a comment saying where it comes from.
- Don't deploy. Make sure the OpenNext Cloudflare build succeeds and record the Worker bundle size.

## Design
- Where screenshots are possible, review them against the banned-patterns list in `02-design-system.md` and fix every violation. Where they aren't, re-read the banned list and review component code against it before closing each phase.

## Migrations
- Deliver numbered files in `supabase/migrations/`, generated `supabase/ALL_MIGRATIONS.sql`, `seed.sql`, `demo-seed.sql`, `demo-clear.sql`, `bootstrap_admin.sql`, and a step-by-step `APPLY.md` for someone who pastes them into the Supabase SQL editor or applies them through the Supabase MCP.

## Saving work (the session can end at any time)
- Commit in small steps. Push to the remote at the end of every phase and at least every hour of work. Never leave more than one phase unpushed.
- Keep `docs/HANDOFF.md` current so a new Claude Code session on Firas's machine can continue without this conversation: current phase and step, what's done, what's half-done (with file paths), next 5 concrete steps, install/run commands, checks to run locally, known problems, and the exact prompt to paste into the next session to resume.

## Done when
- Phases 0–5 complete (Phase 6 skipped); all checks that can run here pass; the rest are listed in `HANDOFF.md`.
- Worker bundle under the free-plan limit.
- Migrations, seeds and `APPLY.md` complete and tested as far as this environment allows.
- Everything editorial is editable from the admin; no human can modify any statistic.
- `docs/DEPLOY.md` and `docs/LAUNCH.md` written; `docs/PROGRESS.md` ends with a "What Firas needs to do" list (env vars, migrations to apply, accounts to create, checks to run locally).
- Everything committed and pushed.
