# Deploying El Borj (Cloudflare Workers free plan + Supabase free plan)

Everything here is free. Do the database first (`supabase/APPLY.md`), then this file.
Time needed the first time: about one hour.

## 0. What you need

- Node.js 22 and pnpm 10 (`corepack enable` then `pnpm -v`).
- A Cloudflare account (free) and a Supabase project already set up with
  `supabase/APPLY.md` (migrations, seed, your admin account).
- This repository, with dependencies installed: `pnpm install`.

## 1. Cloudflare resources (once)

```bash
npx wrangler login                                   # opens the browser
npx wrangler r2 bucket create el-borj-opennext-cache # page cache (ISR)
npx wrangler d1 create el-borj-tag-cache             # prints a database_id
```

Paste the printed `database_id` into `wrangler.jsonc` (`d1_databases[0].database_id`).

> **R2 and payment methods.** Cloudflare may ask you to add a payment method before R2
> can be enabled, even on the free tier. Nothing is charged within the free allowance
> (10 GB, 1M writes and 10M reads per month — far above what this site uses). If you
> prefer not to add a card, use Workers KV instead (free: 100k reads and 1k writes per
> day, enough for a small paper):
>
> ```bash
> npx wrangler kv namespace create NEXT_INC_CACHE_KV   # prints an id
> ```
> In `wrangler.jsonc` replace the `r2_buckets` block with
> `"kv_namespaces": [{ "binding": "NEXT_INC_CACHE_KV", "id": "<the id>" }]`, and in
> `open-next.config.ts` replace the R2 import with
> `import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';`
> and use `withRegionalCache(kvIncrementalCache, { mode: 'long-lived' })`.

## 2. Configuration

**Public values** (not secret) — in `wrangler.jsonc` → `vars`:

| Name | Value |
|---|---|
| `SITE_URL` | `https://your-domain.tn` (no trailing slash; the `*.workers.dev` URL until the domain is ready) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → Publishable key (`sb_publishable_…`) |

`NEXT_PUBLIC_*` values are also written into the browser code **at build time**, so put
the same two values (and `SITE_URL`) in a file `.env.production.local` at the root of the
project before building (this file is ignored by Git):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxx
SITE_URL=https://your-domain.tn
```

**Secrets** — never in a file, never in Git:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # Supabase → API Keys → Secret key (sb_secret_…)
npx wrangler secret put REVALIDATE_SECRET           # any long random string: openssl rand -hex 32
npx wrangler secret put TRACKER_HMAC_SECRET         # another long random string
```

Use the same `REVALIDATE_SECRET` in `supabase/APPLY.md` step 8 (instant refresh of
scheduled articles).

## 3. Build and deploy

```bash
pnpm build:cf        # Next.js production build + OpenNext Worker bundle
pnpm bundle:size     # must stay under 3 MiB gzip (free plan); last measured: 2.23 MiB
pnpm deploy          # uploads the Worker and static files
```

The first deploy prints a URL like `https://el-borj.<your-subdomain>.workers.dev`. Open
it: `/ar` must show the paper, `/ar/admin/login` the login page.

To preview the production Worker locally before deploying: `pnpm preview:cf`.

## 4. Supabase Auth URLs

Supabase → Authentication → URL Configuration:

- **Site URL**: `https://your-domain.tn` (or the workers.dev URL for now)
- **Redirect URLs**: `https://your-domain.tn/api/auth/callback`,
  `https://el-borj.<subdomain>.workers.dev/api/auth/callback`,
  `http://localhost:3000/api/auth/callback`

Without these, password-reset and invitation e-mails won't log people in.

## 5. Your domain

- `.tn` domains are sold by registrars accredited by the ATI (Agence Tunisienne
  d'Internet); `.com` anywhere. Buying the domain is not automated here.
- Add the domain to Cloudflare (free plan): Cloudflare dashboard → Add a domain, then at
  your registrar replace the name servers with the two Cloudflare gives you.
- Attach it to the Worker: Workers & Pages → el-borj → Settings → Domains & Routes →
  Add → Custom domain → `your-domain.tn` (and `www.your-domain.tn` if you want it).
- Update `SITE_URL` (wrangler.jsonc and `.env.production.local`) and the Supabase Auth
  URLs, then build and deploy again.

## 6. Recommended free protections

- **Rate limiting rule** (Cloudflare free plan includes one): Security → WAF → Rate
  limiting rules → "If URI path starts with `/api/`" → 60 requests per 10 seconds per IP
  → Block. The app already limits per isolate; this adds a global limit.
- **Bot Fight Mode**: Security → Bots → on.

## 7. Automatic checks and deploys (optional)

`.github/workflows/ci.yml` runs lint, type checks, unit tests, the migrations-bundle check
and a production build on every push to `main` (free GitHub Actions minutes). To deploy
from GitHub too: create a Cloudflare API token (template "Edit Cloudflare Workers"), add
repository secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and repository
variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SITE_URL`, then
uncomment the `deploy` job (it runs on "Run workflow").

A staging copy can be deployed as a second Worker (change `name` and the
`WORKER_SELF_REFERENCE` service to `el-borj-staging`, its own R2 bucket and D1). It can
share the Supabase project for v1, but then staging and production edit the same
articles — fine for trying the admin, not for testing migrations.

## 8. Backups (do this weekly)

The free Supabase plan has no downloadable backups.

- **Database**: `SUPABASE_DB_URL='…' bash scripts/backup.sh` (the URL is in Supabase →
  Connect → Session pooler; needs `pg_dump` 17). Keep the `.sql.gz` files privately
  (an external disk or a private cloud folder), never in Git. Restore with
  `gunzip -c file.sql.gz | psql "$NEW_DB_URL"`.
- **Photos** (Storage bucket `media`): Supabase → Storage → media → select all → Download,
  or with the CLI after `npx supabase login` and `npx supabase link`:
  `npx supabase storage cp -r ss:///media ./media-backup --experimental`.
- Test a restore once into a new free project before relying on it (launch checklist).

## 9. Free-plan limits to keep in mind

| Service | Limit | What the app does |
|---|---|---|
| Workers | 100k requests/day, 10 ms CPU per request, 3 MiB gzip script | Pages served from cache; no link prefetching; 2.23 MiB script |
| Supabase DB | 500 MB | Raw analytics pruned after 60 days (setting); rollups are small. Watch «النظام» in the admin |
| Supabase Storage | 1 GB | Photos are resized to WebP in the browser before upload |
| Supabase pausing | Free projects pause after ~7 days without activity | The cron jobs and readers keep it active; if it pauses, Supabase → Restore |
| R2 / D1 | see section 1 | Cache only; can be emptied at any time |

When the paper outgrows these, see "Upgrade path" in `README.md`.

## 10. Troubleshooting

- **Logs**: `npx wrangler tail` (live), or Workers & Pages → el-borj → Logs.
- **Error 1102 / "exceeded CPU"**: a page rendered without cache on a slow path; it is
  retried from cache next time. If frequent, check «النظام» and the logs; see upgrade path.
- **Old content after an edit**: «النظام» → «إعادة توليد الذاكرة المؤقتة».
- **Login e-mails don't arrive**: Supabase's built-in e-mail is limited to a few
  messages per hour; for regular use add a free SMTP provider in Supabase → Auth → SMTP.
- **Worker too big**: `pnpm bundle:size`; DECISIONS.md (Verified facts, Phase 1 and Phase 2) lists what was done to keep it small.
