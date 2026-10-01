# 08 — SEO, feeds, legal pages, deployment and operations

## SEO

### Per page
- `<title>`: article: `{seo_title || title} | {site_name}`; section: `{section name} | {site_name}`; home: `{site_name} — {tagline}`.
- Meta description: article `seo_description || excerpt`; section description; home tagline.
- Canonical URL on every page (absolute, `SITE_URL`). Pagination pages canonical to themselves.
- `hreflang`: for articles with a linked translation, `ar` and `fr` alternates; for sections, home and static pages, both locales; `x-default` → Arabic.
- Open Graph + Twitter cards: `og:type=article`, `article:published_time`, `article:modified_time`, `article:section`, `article:tag`, `og:image` (1600w variant, 1200×630 crop using focal point if possible; else the default share image from settings), `og:locale` `ar_TN` / `fr_TN`.
- `robots`: `noindex` on search, preview, admin, and paginated pages beyond page 5 of tag pages (avoid thin pages).

### Structured data (JSON-LD)
- Article pages: `NewsArticle` with `headline`, `description`, `image` (3 ratios if available), `datePublished`, `dateModified`, `author` (Person with url to author page), `publisher` (NewsMediaOrganization with name and logo), `articleSection`, `inLanguage`, `isAccessibleForFree: true`. For sponsored articles, keep `NewsArticle` but the visible label must be present.
- Home: `NewsMediaOrganization` + `WebSite` with `SearchAction`.
- Author pages: `ProfilePage` with `Person`.
- Breadcrumbs (`BreadcrumbList`) on articles and sections.
- If the owner later writes an ethics policy, corrections policy, and masthead page, link them in `NewsMediaOrganization` (`ethicsPolicy`, `correctionsPolicy`, `masthead`) — the static pages support it.

### Sitemaps and feeds
- `/sitemap.xml`: index pointing to sitemaps for articles (paged by month if large), sections, tags (only tags with ≥ 3 articles), authors, static pages.
- `/news-sitemap.xml`: Google News sitemap with articles published in the last 48 hours (`news:publication` name and language).
- `/robots.txt`: allow all public; disallow `/*/admin`, `/api/`, `/*/search`; point to sitemaps.
- RSS 2.0 per locale and per section: last 30 articles, full title, excerpt, cover image (`enclosure` or `media:content`), author, category. Link to RSS in the footer and in `<link rel="alternate">`.

### URLs
- Lowercase ASCII routes, numeric `public_id` for articles plus a cosmetic slug (Arabic allowed). Old slugs 301 to the canonical one automatically.
- No trailing slash.

### Google News / Discover readiness
- Large images (≥1200px wide) on every article with a cover; `max-image-preview:large` robots meta.
- Clear bylines with author pages, dates, a contact page and an about page. Document in the launch checklist that the owner can submit the site in Google Publisher Center.

## Legal and trust pages (content written by the owner; the build only provides the pages and structure)

Seeded as drafts (see database doc): About, Editorial charter, Contact, Advertise (media kit), Privacy policy, Legal notice / terms.

The **privacy policy** must at least describe (provide a factual draft in Arabic and French that the owner reviews, and mark it clearly as a draft to be checked):
- the cookieless first-party analytics and what it stores (no IP, no identifiers, monthly-rotated hash),
- GA4 and AdSense (Google cookies, consent for EEA visitors, links to Google's policies),
- contact form data (what's kept, for how long, how to request deletion),
- staff accounts only; no reader accounts,
- Tunisian personal data law (Loi organique n° 2004-63) and the national authority INPDP as the reference regulator.

**Do not invent legal obligations.** Add to `docs/DECISIONS.md` an "Owner to verify" list: whether an online news publication must be declared/registered in Tunisia and what the masthead must legally contain, ideally checked with the journalists' union (SNJT) or a lawyer. The footer masthead fields exist so the owner can comply once he knows.

## Deployment (document in `docs/DEPLOY.md`)

1. Cloudflare account, Workers free plan.
2. `wrangler login`, create the Worker via the OpenNext template/config, set `compatibility_flags` required by OpenNext (`nodejs_compat`) and a current `compatibility_date`.
3. R2 bucket for the OpenNext incremental cache (if used), bound in `wrangler.jsonc`.
4. Secrets: `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`, `REVALIDATE_SECRET`, `TRACKER_HMAC_SECRET`; vars for public values.
5. Build and deploy: `pnpm build:cf && pnpm deploy` (scripts wrapping `opennextjs-cloudflare build` and `opennextjs-cloudflare deploy`).
6. Custom domain: add the domain to Cloudflare (DNS), attach it to the Worker as a custom domain. Note: `.tn` domains are registered through accredited Tunisian registrars; the owner can still point DNS to Cloudflare. Mention it, don't automate it.
7. Supabase Auth: set Site URL and redirect URLs to the production domain and `http://localhost:3000`.
8. GitHub Actions (optional but recommended): on push to `main`, run lint, typecheck, unit tests, build; deploy on tag or manual dispatch. Free for public/private repos within GitHub's free minutes.
9. Preview deployments: a `staging` Worker (`*.workers.dev`) using the same Supabase project is fine for v1; note the trade-off.

## Operations

- **Backups**: Supabase free plan doesn't include downloadable point-in-time backups. Provide `scripts/backup.sh` that runs `pg_dump` with the connection string (documented), and recommend running it weekly (manually or from GitHub Actions with the DB URL as a secret), storing dumps privately. Media is in Supabase Storage; document how to download the bucket.
- **Supabase free-plan pausing**: projects can be paused after a period of inactivity. A live site with traffic and cron jobs keeps it active, but mention it in DEPLOY.md and in the system page.
- **Upgrade path** (write it in README): when traffic grows → Workers Paid ($5/mo) for bigger bundle and limits; Supabase Pro for more DB, backups, no pausing.
- **Error monitoring**: Cloudflare Workers logs (observability) are enough for v1. Optional Sentry free tier later.

## Launch checklist (put in `docs/LAUNCH.md`)

- [ ] Name, tagline, logo confirmed by the editor and set in settings
- [ ] About, contact, editorial charter, privacy, legal pages written and published (AR at least)
- [ ] Legal masthead filled
- [ ] Demo content removed (`demo-clear.sql`)
- [ ] At least 15–20 real articles published across sections before applying to AdSense
- [ ] GA4 property created, ID in settings
- [ ] AdSense application submitted; ads.txt line added after approval; consent message configured in AdSense
- [ ] Google Search Console verified, sitemaps submitted; Google Publisher Center
- [ ] Facebook page linked, share preview checked with the Facebook Sharing Debugger
- [ ] Lighthouse mobile targets met on home and an article
- [ ] Backups script tested once
- [ ] Owner trained: publish from phone, schedule, upload photos, edit categories, view stats, update Facebook numbers
