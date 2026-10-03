// Full copy of the site's content: every table in `public` (as JSON) and every file in the
// `media` storage bucket. Read-only: it never writes to the database.
//
//   pnpm backup [out-dir]     # default backups/<date>/ (git-ignored)
//
// Run weekly by .github/workflows/backup.yml, which encrypts the copy (the repo is public)
// and keeps it 90 days as a workflow artifact. Restoring: docs/BACKUP.md.
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env or .env.local).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const db = createClient(url, key, { auth: { persistSession: false } });

// Parents before children, so a restore can insert in this order. analytics_salts is left out
// on purpose (a fresh salt is created on restore; old visitor hashes can't be linked anyway).
const TABLES = [
  'profiles', 'categories', 'article_formats', 'tags', 'media', 'articles', 'article_authors', 'article_categories',
  'article_tags', 'article_revisions', 'events', 'pages', 'menu_items', 'homepage_sections', 'site_settings', 'redirects',
  'ad_slots', 'ad_campaigns', 'ad_daily_stats', 'social_stats', 'contact_messages',
  'analytics_daily', 'analytics_daily_article', 'analytics_monthly_uniques', 'pageviews_raw', 'engagement_raw', 'rollup_runs',
];

const out = process.argv[2] ?? join('backups', new Date().toISOString().slice(0, 10));
mkdirSync(join(out, 'tables'), { recursive: true });

const summary: Record<string, number> = {};
const missing: string[] = [];
tables: for (const table of TABLES) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select('*').range(from, from + 999);
    // A table listed here but not created yet (migration not applied) is noted, not fatal.
    if (error?.code === 'PGRST205') { missing.push(table); continue tables; }
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  writeFileSync(join(out, 'tables', `${table}.json`), JSON.stringify(rows));
  summary[table] = rows.length;
}

// Storage: walk the bucket's folders and download every file.
const files: string[] = [];
async function walk(prefix: string) {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from('media').list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`storage list ${prefix}: ${error.message}`);
    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) files.push(path); // a file (folders have no id)
      else await walk(path);
    }
    if (!data || data.length < 1000) break;
  }
}
await walk('');
let bytes = 0;
for (const path of files) {
  const { data, error } = await db.storage.from('media').download(path);
  if (error || !data) throw new Error(`storage download ${path}: ${error?.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  bytes += buf.length;
  mkdirSync(dirname(join(out, 'media', path)), { recursive: true });
  writeFileSync(join(out, 'media', path), buf);
}

const manifest = { created_at: new Date().toISOString(), project: url, tables: summary, missing_tables: missing, media_files: files.length, media_bytes: bytes };
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`✓ backup in ${out}: ${Object.values(summary).reduce((a, b) => a + b, 0)} rows in ${TABLES.length} tables, ${files.length} files (${Math.round(bytes / 1024)} KB)`);
