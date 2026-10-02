// Creates share.jpg (1200×630 link-preview picture) for media uploaded before it existed,
// and adds it to media.variants.share. Only touches the media table and Storage (no
// articles, no statistics).
//
//   pnpm -s backfill:share            list what would be done (writes nothing)
//   pnpm -s backfill:share --apply    upload and update the rows
//
// Needs .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server only).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { SHARE_NAME } from '../src/lib/public/share-image';
import { shareJpeg } from './lib/share-image';

const envFile = join(process.cwd(), '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('.env.local must contain NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
const apply = process.argv.includes('--apply');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await db.from('media').select('id, storage_path, variants, focal_x, focal_y, mime_type').neq('mime_type', 'image/svg+xml');
if (error) throw error;
const todo = (data ?? []).filter((m) => !(m.variants as Record<string, string> | null)?.share && !/^https?:/.test(m.storage_path));
console.log(`${todo.length} picture(s) without a link-preview version${apply ? '' : ' (dry run, add --apply to write)'}`);

for (const m of todo) {
  const dir = m.storage_path.slice(0, m.storage_path.lastIndexOf('/'));
  const path = `${dir}/${SHARE_NAME}`;
  if (!apply) {
    console.log(`  would create ${path}`);
    continue;
  }
  const { data: file, error: dl } = await db.storage.from('media').download(m.storage_path);
  if (dl || !file) {
    console.error(`  skip ${m.id}: download failed (${dl?.message})`);
    continue;
  }
  const jpg = await shareJpeg(Buffer.from(await file.arrayBuffer()), Number(m.focal_x), Number(m.focal_y));
  const { error: up } = await db.storage.from('media').upload(path, jpg, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: true });
  if (up) {
    console.error(`  skip ${m.id}: upload failed (${up.message})`);
    continue;
  }
  const variants = { ...((m.variants as Record<string, string>) ?? {}), share: path };
  const { error: upd } = await db.from('media').update({ variants }).eq('id', m.id);
  console.log(upd ? `  ${m.id}: row update failed (${upd.message})` : `  ✓ ${path}`);
}
