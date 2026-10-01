// Prints the Worker size as Cloudflare computes it (wrangler dry run) and checks it
// against the Workers Free plan limit. Run after `pnpm build:cf`.
// Usage: pnpm bundle:size
import { execSync } from 'node:child_process';

const FREE_LIMIT_GZIP_KIB = 3 * 1024; // 3 MiB (gzip) — the limit stated in the spec

const out = execSync('npx wrangler deploy --dry-run --outdir .wrangler/dry', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const m = out.match(/Total Upload: ([\d.]+) KiB \/ gzip: ([\d.]+) KiB/);
if (!m) {
  console.error(out);
  process.exit(1);
}
const raw = Number(m[1]);
const gzip = Number(m[2]);
const pct = ((gzip / FREE_LIMIT_GZIP_KIB) * 100).toFixed(0);
console.log(`Worker: ${(raw / 1024).toFixed(2)} MiB raw, ${(gzip / 1024).toFixed(2)} MiB gzip (${pct}% of the 3 MiB free-plan limit)`);
if (gzip > FREE_LIMIT_GZIP_KIB * 0.9) {
  console.error('Worker is close to or above the free-plan limit: see docs/DECISIONS.md (bundle size).');
  process.exit(1);
}
