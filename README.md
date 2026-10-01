# El Borj (working name) — online newspaper

Arabic-first (RTL) and French online newspaper for Mourad Ridene: public site, admin/CMS,
first-party statistics that nobody can edit, sponsor ads and a live media kit. Next.js on
Cloudflare Workers (free plan) + Supabase (free plan).

## Start here

| You want to… | Read |
|---|---|
| Put it online | `supabase/APPLY.md` (database), then `docs/DEPLOY.md` (Cloudflare) |
| Launch it | `docs/LAUNCH.md` |
| Know what was built and what's left for you | `docs/PROGRESS.md` (ends with "What Firas needs to do") |
| Know why things are the way they are | `docs/DECISIONS.md` |
| Continue development with Claude Code | `docs/HANDOFF.md` |

## Run it locally

Needs Node 22, pnpm 10 and Docker (for the local Supabase).

```bash
pnpm install
npx supabase start                 # local database; prints the local keys
cp .env.example .env.local         # put the local URL/keys in it (see docs/HANDOFF.md)
pnpm db:local-reset                # migrations + seed + demo content + 3 test users
pnpm dev:traffic                   # optional: 45 days of simulated readers (local only)
pnpm dev                           # http://localhost:3000  — admin: /ar/admin/login
```

Test users (local only): `admin@elborj.test`, `editor@elborj.test`, `author@elborj.test`,
password `local-dev-password`.

## Commands

| Command | What it does |
|---|---|
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | ESLint (incl. RTL rule), TypeScript, unit tests |
| `pnpm test:db` | SQL tests against the local database (RLS, statistics lock, rollups…) |
| `pnpm build && pnpm start` then `E2E_NO_SERVER=1 pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm db:bundle` | Rebuilds `supabase/ALL_MIGRATIONS.sql` from the numbered migrations |
| `pnpm db:demo` | Regenerates `supabase/demo-seed.sql` |
| `pnpm build:cf` / `pnpm bundle:size` / `pnpm deploy` | Cloudflare build, Worker size check, deploy |
| `bash scripts/backup.sh` | Database backup (see DEPLOY.md §8) |
| `bash scripts/lighthouse-median.sh <url>` | Lighthouse mobile, median of 3 runs |

## Costs

- Cloudflare Workers free plan + Supabase free plan: 0 TND/month. Domain: yearly fee.

## Upgrade path (only when needed)

| Sign | Upgrade | Cost (list prices when written; check before buying) |
|---|---|---|
| More than ~100k page requests a day, or Workers CPU-limit errors in the logs | Cloudflare **Workers Paid** (10 million requests/month, 30 s CPU, bigger script) | $5/month |
| Database near 500 MB, storage near 1 GB, need real backups or no pausing | **Supabase Pro** (8 GB DB, 100 GB storage, daily backups, no pausing) | $25/month |
| Login e-mails limited | A free SMTP provider in Supabase Auth (no upgrade needed) | free |
| Error alerts wanted | Sentry free tier | free |

Nothing in the code has to change for these upgrades.

## Things to confirm with your dad (can be changed later in the admin, no code)

- [ ] Name of the paper (working: «البرج» / El Borj; alternatives: «الشّراع», «المنارة»)
- [ ] Tagline
- [ ] Section list (seeded with: الوطن القبلي، وطنية، الكرة الطائرة، رياضة، ثقافة، مجتمع، اقتصاد، رأي)
- [ ] Is «أبو فراس» still a signature he wants to use? (can be a byline override)
- [ ] Legal masthead: who is المدير المسؤول and رئيس التحرير, address, contact
- [ ] Whether the publication needs to be declared anywhere in Tunisia (ask SNJT or a lawyer)
- [ ] Domain name (check availability of the chosen name in `.tn` and `.com`)

## Costs

- Cloudflare Workers free plan + Supabase free plan: 0 TND/month. Domain: yearly fee.
- Possible upgrades later: Cloudflare Workers Paid ($5/month) if the app bundle grows past 3 MiB or traffic is high; Supabase Pro when the database outgrows 500 MB or for proper backups.

## What's in `docs/`

| File | Content |
|---|---|
| 01-product.md | Vision, positioning, roles, scope |
| 02-design-system.md | Visual direction from the research, tokens, fonts, components, banned "AI look" patterns |
| 03-architecture.md | Stack, Cloudflare/OpenNext, i18n, caching, media, auth, security |
| 04-database.md | Full schema, seed data, RLS, cron jobs, migration deliverables |
| 05-public-site.md | Every public page |
| 06-admin-cms.md | Every admin screen, including categories and homepage builder |
| 07-analytics-and-monetization.md | Tracker, dashboards, per-author stats, GA4, AdSense, sponsors, media kit |
| 08-seo-legal-ops.md | SEO, feeds, legal pages, deployment, backups, launch checklist |
| 09-build-plan.md | Phases, checks, stop points |
| research/tunisian-press-notes.md | What Tunisian news sites look like, and what we keep or avoid |
