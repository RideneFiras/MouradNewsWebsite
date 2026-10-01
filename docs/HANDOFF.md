# Handoff — current state of the build

_Updated at the end of every phase. Read this first if you are a new Claude Code
session continuing the work._

## Where we are

- **Current phase:** Phase 2 — Admin and CMS (starting). Phases 0 and 1 are done and pushed.
- **Branch:** `claude/inspiring-curie-5nj5ew` (pushed to `origin`).
- **Done:** see `docs/PROGRESS.md` (Phase 0).
- **Half-done:** `src/components/public/AdSlot.tsx` is a stub that renders nothing (Phase 4). No tracker yet (Phase 3).

## Next 5 concrete steps

1. Admin shell: `src/app/[locale]/admin/` layout (sidebar/drawer), login / forgot / reset pages, role helpers (`src/lib/auth/`).
2. Article editor (Tiptap, client-only via `next/dynamic`) with server actions: save/autosave/revisions/submit/publish/schedule/send back, `renderDoc` + `sanitizeArticleHtml` on save, revalidation.
3. Media library with client-side WebP variants (480/960/1600) and focal point.
4. Categories (tree + delete-with-move), tags (merge), formats, homepage builder, menus, pages, settings, team (invites via service role), profile, messages, system.
5. Phase 2 e2e (review workflow, category delete with move, homepage reorder) + mobile editor screenshots + bundle size.

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
E2E: `pnpm build && pnpm start` (other terminal), then `E2E_NO_SERVER=1 pnpm test:e2e` (needs local Supabase + demo seed).
Screenshots: `node scripts/screenshots.mjs <folder>`; Lighthouse: `bash scripts/lighthouse.sh <label>`.

## Checks to run on Firas's machine

(None blocked so far — Docker, Supabase CLI and Chromium all work in the cloud sandbox.)

## Known problems

- `next build` warns that `middleware.ts` is deprecated in favour of `proxy.ts`; intentionally kept (see DECISIONS.md).

## Prompt to resume in a new session

> Read `docs/CLOUD_RUN.md`, `CLAUDE.md`, then `docs/HANDOFF.md`, `docs/PROGRESS.md` and `docs/DECISIONS.md`. Continue the build from the "Next 5 concrete steps" in HANDOFF.md, following `docs/09-build-plan.md` (phases 0–5, skip 6) and the rules in CLOUD_RUN.md. Keep HANDOFF.md current and push after every phase.
