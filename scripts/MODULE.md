# scripts: tooling

Run with `pnpm <script>` (see `package.json`) or `bash scripts/<file>`. Node 22.

## Deploy and build

| Script | What |
|---|---|
| `deploy.sh` (`pnpm run deploy`) | Build with `.env.local` moved aside, refuse if a secret got bundled, deploy to Cloudflare |
| `bundle-size.ts` (`pnpm bundle:size`) | Worker size as Cloudflare computes it (wrangler dry run) vs the 3 MiB gzip Free limit |
| `fonts/subset-arabic-fonts.sh` | Rebuilds the Arabic font subsets in `src/app/fonts/` from Google Fonts' files |

## Database

| Script | Where | What |
|---|---|---|
| `build-all-migrations.ts` (`pnpm db:bundle`) | files | Regenerates `supabase/ALL_MIGRATIONS.sql`; run after adding a migration (CI checks it) |
| `generate-demo-seed.ts` (`pnpm db:demo`) + `demo/content.ts` | files | Regenerates `supabase/demo-seed.sql` from the demo articles |
| `backup.sh` | **online** | `SUPABASE_DB_URL=… bash scripts/backup.sh`: pg_dump of public/private/auth (needs `pg_dump` 17). Weekly; keep the files private, never in Git |
| `local-reset.sh` (`pnpm db:local-reset`) | local only | Rebuild the local Docker database + demo + test users |
| `dev-users.ts` (`pnpm dev:users`) | local only | Three test staff users (password `local-dev-password`) |
| `db-test.sh` (`pnpm test:db`) | local only | SQL tests in `supabase/tests` (empties analytics tables) |
| `test-all-migrations.sh` | local only | Proves `ALL_MIGRATIONS.sql` builds the same database |
| `simulate-traffic.sh` + `.sql` (`pnpm dev:traffic`) | local only | 45 days of fake readers for UI work; refuses non-local databases |

**Local-only scripts must never point at the online project** (`knxuskjqpsimptwxqfju`): they reset
data or write fake statistics.

## Screenshots and performance

| Script | What |
|---|---|
| `screenshots.mjs <folder> [baseUrl]` | Design-review screenshots of the public pages (AR/FR, 375/1280) into `docs/screenshots/<folder>` |
| `admin-shot.mjs`, `shot.mjs`, `shot-clip.mjs` | Single screenshots (admin needs a login) |
| `lighthouse.sh`, `lighthouse-median.sh <url> [runs]` | Lighthouse mobile on home + an article (targets: perf ≥ 90, a11y ≥ 95, SEO 100) |
| `restart-prod.sh` | `next start` on port 3001 for e2e runs |
