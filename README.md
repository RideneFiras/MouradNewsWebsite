# El Borj (working name) — build spec

Spec package for an Arabic-first online newspaper for Mourad Ridene, built with Claude Code.

## How to use it

1. Create an empty folder (or Git repo) and copy everything from this package into it: `CLAUDE.md`, `README.md`, `docs/`.
2. Open Claude Code in that folder and say:
   > Read CLAUDE.md and the docs in order, then start Phase 0 of docs/09-build-plan.md.
3. Claude Code will stop at three points (A, B, C in the build plan) to ask you for things only you can do: create the Supabase project and apply the migrations, try the admin, and go live.

## What you'll get from Claude Code

- The full Next.js app (public site + admin/CMS + analytics + ads), deployable on Cloudflare Workers free plan
- `supabase/migrations/*.sql` + `supabase/ALL_MIGRATIONS.sql` (paste into the Supabase SQL editor) + `seed.sql` + `APPLY.md` with step-by-step instructions
- `docs/DECISIONS.md` (choices it made), `docs/PROGRESS.md` (what's done), `docs/DEPLOY.md`, `docs/LAUNCH.md`

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
