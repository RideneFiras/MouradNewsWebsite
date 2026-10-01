# Handoff — current state of the build

_Updated at the end of every phase. Read this first if you are a new Claude Code
session continuing the work._

## Where we are

- **Current phase:** Phase 1 — Public site (starting). Phase 0 is done and pushed.
- **Branch:** `claude/inspiring-curie-5nj5ew` (pushed to `origin`).
- **Done:** see `docs/PROGRESS.md` (Phase 0).
- **Half-done:** `src/app/[locale]/(public)/page.tsx` is a placeholder (prints the site name); it will be replaced by the homepage renderer.

## Next 5 concrete steps

1. Write `supabase/demo-seed.sql` (~30 demo articles, 3 demo authors, `is_demo = true`, «[تجريبي]» / «[Démo]» titles).
2. Public components in `src/components/public/` (masthead, nav, footer, breaking bar, story units, ad slot) and `src/app/[locale]/(public)/layout.tsx`.
3. Homepage renderer for every `homepage_sections` type with deduplication.
4. Category, article, author, tag, format, latest, search, static pages, 404/500.
5. Playwright e2e + screenshots (375 / 1280, AR / FR) + Lighthouse; record bundle size.

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

Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:db && pnpm build:cf && pnpm bundle:size`.

## Checks to run on Firas's machine

(None blocked so far — Docker, Supabase CLI and Chromium all work in the cloud sandbox.)

## Known problems

- `next build` warns that `middleware.ts` is deprecated in favour of `proxy.ts`; intentionally kept (see DECISIONS.md).

## Prompt to resume in a new session

> Read `docs/CLOUD_RUN.md`, `CLAUDE.md`, then `docs/HANDOFF.md`, `docs/PROGRESS.md` and `docs/DECISIONS.md`. Continue the build from the "Next 5 concrete steps" in HANDOFF.md, following `docs/09-build-plan.md` (phases 0–5, skip 6) and the rules in CLOUD_RUN.md. Keep HANDOFF.md current and push after every phase.
