// Local test of the automation on a posts/<n> folder, WITHOUT saving anything to the site:
// it treats the folder like an email (text file = email body, pictures = attachments), asks the
// model for the spec, runs check + fidelity, writes the Facebook text and an HTML preview.
//
//   pnpm -s publisher:try posts/10                 # dry run (default)
//   pnpm -s publisher:try posts/10 --subject "…"   # pretend the email had this subject
//   pnpm -s publisher:try --models                 # the OpenAI models this key can use
//
// Needs in .env.local: OPENAI_API_KEY (+ OPENAI_MODEL) or LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY,
// and the Supabase keys (read-only here: the live sections and tags).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

for (const line of existsSync('.env.local') ? readFileSync('.env.local', 'utf8').split('\n') : []) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
}
process.env.DATA_DIR ??= join(tmpdir(), 'elborj-publisher-try');

const { ingest } = await import('./core');
const { MODEL, PROVIDER } = await import('./llm');

const args = process.argv.slice(2);
const keyName = PROVIDER === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
if (!process.env[keyName]) {
  console.error(`✗ ${keyName} is missing: add a line ${keyName}=… to .env.local (LLM_PROVIDER=${PROVIDER}).`);
  process.exit(1);
}
if (args[0] === '--models') {
  const { default: OpenAI } = await import('openai');
  const ids: string[] = [];
  for await (const m of new OpenAI().models.list()) if (/^(gpt|o\d)/.test(m.id)) ids.push(m.id);
  console.log(ids.sort().join('\n'));
  process.exit(0);
}
const folder = resolve(args[0] ?? '');
if (!args[0] || !existsSync(folder)) throw new Error('usage: pnpm -s publisher:try posts/<n> [--subject "…"]');
const si = args.indexOf('--subject');
const subject = si >= 0 ? args[si + 1] ?? '' : '';

// The text: post.txt, post or posts (the names used so far); never our own spec/source files.
const files = readdirSync(folder);
const textFile = ['post.txt', 'post', 'posts'].find((f) => files.includes(f));
if (!textFile) throw new Error(`no post.txt / post / posts in ${folder}`);
const mime: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };
const images = files
  .filter((f) => mime[f.split('.').pop()!.toLowerCase()])
  .map((f) => ({ filename: f, mime: mime[f.split('.').pop()!.toLowerCase()], data: readFileSync(join(folder, f)).toString('base64') }));

console.log(`${PROVIDER} ${MODEL} · ${textFile} · ${images.length} picture(s) · dry run, nothing is saved\n`);
const t0 = Date.now();
const r = await ingest({ message_id: `try:${folder}`, subject, text: readFileSync(join(folder, textFile), 'utf8'), images, dry_run: true });
console.log(JSON.stringify(r, null, 2));
console.log(`\n${((Date.now() - t0) / 1000).toFixed(0)} s · spec and source in ${String(r.work_dir ?? '')}`);
