# CLAUDE.md — instructions for the build session

You are building **an online newspaper** for a Tunisian journalist. This repository starts empty except for this file, `README.md` and `docs/`. Everything you need to know is in `docs/`. There is no other context: if something is not written here, make the most reasonable choice, write it down in `docs/DECISIONS.md`, and keep going.

## Read first, in this order

1. `docs/01-product.md` — what we are building, for whom, and why
2. `docs/02-design-system.md` — the visual direction. **Non-negotiable.** Read it fully before writing any UI.
3. `docs/03-architecture.md` — stack, hosting, i18n, caching, security
4. `docs/04-database.md` — schema, RLS, migrations you must produce
5. `docs/05-public-site.md` — every public page
6. `docs/06-admin-cms.md` — the admin dashboard and CMS
7. `docs/07-analytics-and-monetization.md` — tracking, dashboards, AdSense, sponsors, media kit
8. `docs/08-seo-legal-ops.md` — SEO, feeds, legal pages, ops
9. `docs/09-build-plan.md` — phases, acceptance criteria, and when to stop and report
10. `docs/research/tunisian-press-notes.md` — background research behind the design

## Ground rules

- **The site is Arabic first, RTL first.** Build every component in RTL, then check LTR (French). Use CSS logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`, Tailwind `ms-* me-* ps-* pe-* start-* end-*`). Never use `left`/`right` for layout.
- **It must not look AI-generated or templated.** The design system lists banned patterns. If you are about to use a rounded card with a shadow, a gradient, an emoji, or a generic icon set, stop and re-read `docs/02-design-system.md`.
- **Everything editorial is editable from the admin.** Site name, logo, categories, menus, homepage sections, static pages, media-kit text, ad slots, footer masthead. Hard-coding any of these is a bug. Seed them in the database instead.
- **Statistics are never editable by humans.** No UI and no API may write to analytics tables except the tracker and the rollup jobs. This is what makes the numbers credible to sponsors.
- **Supabase migrations are a deliverable.** The owner applies them by hand. Follow the migration rules in `docs/04-database.md` exactly (numbered files, a combined file, an APPLY guide).
- **Secrets never reach the browser.** The Supabase service-role key is server-only.
- **Free tiers first.** Cloudflare Workers (free plan) + Supabase (free plan). Don't add paid services. If something only works on a paid tier, say so in `docs/DECISIONS.md` and propose the free alternative.
- **No lorem ipsum anywhere.** Use realistic Arabic and French demo content, clearly flagged as demo (see seed rules), removable with one command.
- **Verify, don't assume.** Library versions, Google Fonts names and weights, OpenNext/Cloudflare limits, Supabase key formats: check current docs before relying on them. Note anything that differs from these docs in `docs/DECISIONS.md`.

## How to work

- Work phase by phase from `docs/09-build-plan.md`. At the end of each phase, run the checks listed for that phase, then write a short report in `docs/PROGRESS.md` (what was done, what was skipped and why, what the owner must do by hand).
- **Stop and ask the owner** only at the stop points listed in the build plan (for example: before you need real Supabase/Cloudflare credentials). Otherwise keep going.
- Keep commits small and descriptive.
- Write tests where the build plan asks for them. Don't skip the RTL visual checks.
- When a spec detail conflicts with reality (an API changed, a limit is different), choose the closest working solution and log it in `docs/DECISIONS.md`.

## Glossary

| Term | Meaning |
|---|---|
| Editor-in-chief / owner | The journalist the site belongs to. Admin role. Not technical. |
| Admin | The dashboard at `/admin`, Arabic UI by default. |
| Kicker | Small label above a headline (genre or topic), e.g. "حوار" or "الكرة الطائرة". |
| Dek | The subtitle / standfirst under a headline. |
| Dateline | Place where the story was filed, printed at the start of the first paragraph: "قليبية — ". |
| إشهار | Tunisian Arabic for "advertisement". Label for every ad slot. French: "Publicité". |
| Media kit | Public page for advertisers with live audience numbers and ad formats. |
