// Publisher: the small private service n8n calls to turn an email into a draft article.
// It runs next to n8n on the server (same Docker network, no public port) and reuses the
// /publish-article tool as-is: scripts/publish-article.ts check → fidelity → publish.
// Claude writes the spec with the rules of .claude/skills/publish-article/SKILL.md (read at
// runtime) and gets the tool's errors back until `fidelity` says "word for word".
//
//   POST /ingest   { message_id, subject, text, images: [{ filename, mime, data(base64) }] }
//                  → saves a DRAFT, returns the summary + a proposed Facebook post
//   POST /publish  { work_id }  → makes that draft public, returns the public link
//   GET  /health
//
// Every request needs `Authorization: Bearer $PUBLISHER_TOKEN`. Env: ANTHROPIC_API_KEY,
// PUBLISHER_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PROD_REVALIDATE_SECRET,
// optional DATA_DIR (/data), PORT (8787), CLAUDE_MODEL. See n8n/README.md.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { AUTOMATION_ADDENDUM, FACEBOOK_RULES } from './prompts';

const REPO = resolve(process.env.REPO_DIR ?? process.cwd());
const DATA = resolve(process.env.DATA_DIR ?? '/data');
const PORT = Number(process.env.PORT ?? 8787);
const TOKEN = process.env.PUBLISHER_TOKEN ?? '';
const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-5-5';
const SITE_URL = 'https://www.elborj.workers.dev';
const MAX_ATTEMPTS = 3;

if (TOKEN.length < 24) throw new Error('PUBLISHER_TOKEN must be set (24+ characters)');
const claude = new Anthropic();

// ------------------------------------------------------------------ helpers

type Json = Record<string, unknown>;

function send(res: ServerResponse, status: number, body: Json) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function authorized(req: IncomingMessage) {
  const got = Buffer.from(req.headers.authorization ?? '');
  const want = Buffer.from(`Bearer ${TOKEN}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function readJson(req: IncomingMessage, limit = 80 * 1024 * 1024): Promise<Json> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > limit) throw new HttpError(413, 'request too large');
    chunks.push(c as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Json;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Runs the publish-article CLI, same as `pnpm -s publish:article …`. */
function cli(args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((done) => {
    const p = spawn(join(REPO, 'node_modules/.bin/tsx'), ['scripts/publish-article.ts', ...args], { cwd: REPO, env: process.env });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => done({ code: code ?? 1, out: out.trim() }));
  });
}

const tunisNow = () =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Tunis', dateStyle: 'full', timeStyle: 'short' }).format(new Date());

const textOf = (m: Anthropic.Beta.BetaMessage) =>
  m.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();

async function ask(system: string, messages: Anthropic.Beta.BetaMessageParam[], effort: 'medium' | 'high') {
  const stream = claude.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort },
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages,
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('Claude declined this text (refusal)');
  if (msg.stop_reason === 'max_tokens') throw new Error('Claude ran out of output space');
  return msg;
}

function parseObject(text: string): Json {
  const s = text.replace(/^```(?:json)?\s*|\s*```$/g, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no JSON object in the answer');
  return JSON.parse(s.slice(a, b + 1)) as Json;
}

/** `pnpm publish:article options` → slug → Arabic name, for the Facebook hashtags. */
function tagNames(options: string) {
  const names = new Map<string, string>();
  for (const line of options.split('\n')) {
    const m = line.match(/^\s+([a-z0-9-]+)\s+(?:(?:topic|place|person|club|competition|event)\s+)?(.+?)(?:\s+\/.*)?$/);
    // Sections come first in the listing: keep their Arabic name over a same-slug tag («Volley-ball»).
    if (m && !names.has(m[1]!)) names.set(m[1]!, m[2]!.trim());
  }
  return names;
}

// ------------------------------------------------------------------ pictures

interface Picture { name: string; path: string; original: string; forClaude: string }

async function savePictures(dir: string, images: Json[], notes: string[]): Promise<Picture[]> {
  const out: Picture[] = [];
  for (const img of images) {
    const original = String(img.filename ?? 'picture');
    const buf = Buffer.from(String(img.data ?? ''), 'base64');
    try {
      const meta = await sharp(buf, { failOn: 'none' }).metadata();
      if (!meta.width) throw new Error('not an image');
      const name = `img${out.length + 1}.${meta.format === 'png' ? 'png' : meta.format === 'webp' ? 'webp' : 'jpg'}`;
      const path = join(dir, name);
      // Keep the file as sent (publish-article makes the WebP sizes and drops EXIF);
      // only convert formats it can't read well.
      if (['jpeg', 'png', 'webp'].includes(meta.format ?? '')) writeFileSync(path, buf);
      else await sharp(buf, { failOn: 'none' }).rotate().jpeg({ quality: 92 }).toFile(path);
      const small = await sharp(buf, { failOn: 'none' }).rotate().resize({ width: 1568, height: 1568, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
      out.push({ name, path, original, forClaude: small.toString('base64') });
    } catch {
      notes.push(`Picture «${original}» could not be read (format not supported, e.g. HEIC); it was left out. Send it as JPEG or add it in the admin.`);
    }
  }
  return out;
}

// ------------------------------------------------------------------ spec

/** Paths, and the rules no draft may break whatever Claude wrote. */
function prepareSpec(spec: Json, pictures: Picture[], notes: string[]) {
  const byName = new Map(pictures.map((p) => [p.name, p.path]));
  const fix = (img: unknown) => {
    if (img && typeof img === 'object' && 'file' in img) {
      const o = img as { file: string };
      o.file = byName.get(o.file.split('/').pop()!) ?? o.file;
    }
  };
  fix(spec.cover);
  for (const b of (spec.body as Json[] | undefined) ?? []) {
    if (b.type === 'image') fix(b);
    if (b.type === 'gallery') for (const i of (b.images as Json[]) ?? []) fix(i);
  }
  spec.status = 'draft';
  spec.unsigned = true;
  spec.authors = [];
  spec.is_breaking = false;
  spec.is_featured = false;
  delete spec.byline_override;
  delete spec.scheduled_for;
  const newTags = (spec.new_tags as { name_ar?: string }[] | undefined) ?? [];
  if (newTags.length) notes.push(`Proposed new tags (not added, add them in the admin if you agree): ${newTags.map((t) => t.name_ar).join('، ')}`);
  spec.new_tags = [];
  return spec;
}

// ------------------------------------------------------------------ /ingest

async function ingest(body: Json): Promise<Json> {
  const messageId = String(body.message_id ?? '');
  if (!messageId) throw new HttpError(400, 'message_id is required');
  const workId = createHash('sha256').update(messageId).digest('hex').slice(0, 16);
  const dir = join(DATA, 'posts', workId);
  const resultFile = join(dir, 'result.json');
  if (existsSync(resultFile)) return { ...(JSON.parse(readFileSync(resultFile, 'utf8')) as Json), repeated: true };
  const lock = join(dir, '.lock');
  if (existsSync(lock)) throw new HttpError(409, 'this email is already being processed');
  mkdirSync(dir, { recursive: true });
  writeFileSync(lock, new Date().toISOString());
  try {
    return await ingestLocked(body, workId, dir, resultFile);
  } finally {
    rmSync(lock, { force: true });
  }
}

async function ingestLocked(body: Json, workId: string, dir: string, resultFile: string): Promise<Json> {
  const subject = String(body.subject ?? '').trim();
  const text = String(body.text ?? '').replace(/\r\n?/g, '\n').replace(/ /g, ' ');
  const lines = text.split('\n');
  writeFileSync(join(dir, 'email.txt'), `Subject: ${subject}\n\n${text}`);
  const notes: string[] = [];
  const pictures = await savePictures(dir, (body.images as Json[] | undefined) ?? [], notes);

  const options = await cli(['options']);
  if (options.code !== 0) throw new Error(`could not read the live options: ${options.out}`);
  const skill = readFileSync(join(REPO, '.claude/skills/publish-article/SKILL.md'), 'utf8').replace(/^---[\s\S]*?---\n/, '');
  const system = `${skill}\n\n${AUTOMATION_ADDENDUM}`;

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  pictures.forEach((p) => {
    content.push({ type: 'text', text: `Picture ${p.name} (sent as «${p.original}»):` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: p.forClaude } });
  });
  content.push({
    type: 'text',
    text: [
      `Now in Tunis: ${tunisNow()}`,
      '',
      'LIVE OPTIONS (pnpm publish:article options):',
      options.out,
      '',
      `EMAIL SUBJECT: ${subject || '(none)'}`,
      '',
      'EMAIL BODY:',
      lines.map((l, i) => `L${i + 1}| ${l}`).join('\n'),
      '',
      pictures.length ? `Pictures: ${pictures.map((p) => p.name).join(', ')}` : 'No pictures.',
    ].join('\n'),
  });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content }];

  let answer: Json = {};
  let fidelity = '';
  let ok = false;
  let lastError = '';
  let specNotes: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !ok; attempt++) {
    const msg = await ask(system, messages, 'high');
    messages.push({ role: 'assistant', content: msg.content });
    let problem = '';
    try {
      answer = parseObject(textOf(msg));
    } catch (e) {
      problem = `Your answer was not one valid JSON object (${(e as Error).message}).`;
    }
    if (!problem && answer.status === 'needs_input') {
      const result = { ok: false, needs_input: true, work_id: workId, question: String(answer.question ?? ''), notes: [...notes, ...((answer.notes as string[]) ?? [])] };
      writeFileSync(join(dir, 'needs-input.json'), JSON.stringify(result, null, 2));
      return result;
    }
    if (!problem) {
      const skip = new Set(((answer.skip_lines as number[]) ?? []).map(Number));
      const kept = lines.filter((_, i) => !skip.has(i + 1)).join('\n');
      writeFileSync(join(dir, 'source.txt'), answer.title_from_subject ? `${subject}\n\n${kept}` : kept);
      specNotes = [];
      const spec = prepareSpec(structuredClone((answer.spec as Json) ?? {}), pictures, specNotes);
      writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec, null, 2));
      const check = await cli(['check', join(dir, 'spec.json')]);
      if (check.code !== 0) problem = `\`check\` failed:\n${check.out}`;
      else {
        const f = await cli(['fidelity', join(dir, 'spec.json'), join(dir, 'source.txt')]);
        fidelity = f.out;
        if (f.code !== 0) problem = `\`fidelity\` failed (the article must contain the source word for word):\n${f.out}`;
      }
    }
    if (problem) {
      lastError = problem;
      console.log(`[${workId}] attempt ${attempt}: ${problem.split('\n')[0]}`);
      messages.push({ role: 'user', content: `${problem}\n\nFix the spec and answer again with the full JSON object.` });
    } else ok = true;
  }
  if (!ok) throw new Error(`no valid draft after ${MAX_ATTEMPTS} attempts. Last error:\n${lastError}`);

  notes.push(...specNotes);
  const spec = JSON.parse(readFileSync(join(dir, 'spec.json'), 'utf8')) as Json;
  const pub = await cli(['publish', join(dir, 'spec.json')]);
  if (pub.code !== 0) throw new Error(`saving the draft failed:\n${pub.out}`);
  const art = JSON.parse(readFileSync(join(dir, 'article.json'), 'utf8')) as { id: string; public_id: number; language: string };
  const publicUrl = `${SITE_URL}/${art.language}/article/${art.public_id}`;
  const adminUrl = `${SITE_URL}/${art.language}/admin/articles/${art.id}`;
  console.log(`[${workId}] draft saved: ${adminUrl}`);

  const skipped = ((answer.skip_lines as number[]) ?? []).map((n) => `L${n}: ${lines[n - 1] ?? ''}`);
  const facebook = await facebookPost(spec, readFileSync(join(dir, 'source.txt'), 'utf8'), publicUrl, tagNames(options.out)).catch((e: Error) => {
    notes.push(`The Facebook text could not be written (${e.message}); write it in the approval form.`);
    return '';
  });

  const images = [spec.cover, ...((spec.body as Json[]) ?? []).flatMap((b) => (b.type === 'image' ? [b] : b.type === 'gallery' ? (b.images as Json[]) : []))]
    .filter(Boolean)
    .map((i, n) => `${n === 0 && spec.cover ? 'cover' : 'in the text'}: ${pictures.find((p) => p.path === (i as Json).file)?.original ?? (i as Json).file}: ${(i as Json).alt}`);

  const result = {
    ok: true,
    work_id: workId,
    article_id: art.id,
    public_id: art.public_id,
    admin_url: adminUrl,
    public_url: publicUrl,
    title: spec.title,
    subtitle: spec.subtitle ?? '',
    generated: spec.generated ?? [],
    category: spec.category,
    extra_categories: spec.extra_categories ?? [],
    format: spec.format ?? '',
    tags: spec.tags ?? [],
    images,
    events: spec.events ?? [],
    corrections: spec.corrections ?? [],
    skipped_lines: skipped,
    title_from_subject: Boolean(answer.title_from_subject),
    notes: [...notes, ...((answer.notes as string[]) ?? [])],
    fidelity: fidelity.split('\n').filter((l) => l.startsWith('✓') || l.startsWith('original:')).join('\n'),
    facebook_post: facebook,
  };
  writeFileSync(resultFile, JSON.stringify(result, null, 2));
  return result;
}

async function facebookPost(spec: Json, source: string, url: string, names: Map<string, string>) {
  const tags = [...((spec.tags as string[]) ?? []), ...((spec.extra_categories as string[]) ?? [])].map((t) => names.get(t) ?? t);
  const msg = await ask(FACEBOOK_RULES, [{
    role: 'user',
    content: [
      `Current date/time in Africa/Tunis: ${tunisNow()}`,
      `Publish date/time: when Firas approves, normally today.`,
      `Title: ${spec.title}`,
      `Subtitle: ${spec.subtitle ?? ''}`,
      `Category: ${names.get(String(spec.category)) ?? spec.category}`,
      `Tags: ${tags.join('، ')}`,
      `Calendar dates in the article: ${JSON.stringify(spec.events ?? [])}`,
      `URL: ${url}`,
      '',
      'Full body:',
      source,
    ].join('\n'),
  }], 'medium');
  const post = textOf(msg).replace(/^["«]|["»]$/g, '').trim();
  return post.includes(url) ? post : `${post}\n${url}`;
}

// ------------------------------------------------------------------ /publish

async function publish(body: Json): Promise<Json> {
  const workId = String(body.work_id ?? '');
  if (!/^[0-9a-f]{16}$/.test(workId)) throw new HttpError(400, 'bad work_id');
  const dir = join(DATA, 'posts', workId);
  if (!existsSync(join(dir, 'article.json'))) throw new HttpError(404, 'no draft for this work_id');
  const r = await cli(['status', join(dir, 'spec.json'), 'published']);
  if (r.code !== 0) throw new Error(`publishing failed:\n${r.out}`);
  const art = JSON.parse(readFileSync(join(dir, 'article.json'), 'utf8')) as { public_id: number; language: string };
  console.log(`[${workId}] published`);
  return { ok: true, public_url: `${SITE_URL}/${art.language}/article/${art.public_id}`, output: r.out };
}

// ------------------------------------------------------------------ server

createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
    if (!authorized(req)) return send(res, 401, { ok: false, error: 'unauthorized' });
    if (req.method === 'POST' && req.url === '/ingest') return send(res, 200, await ingest(await readJson(req)));
    if (req.method === 'POST' && req.url === '/publish') return send(res, 200, await publish(await readJson(req, 1024 * 1024)));
    send(res, 404, { ok: false, error: 'not found' });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    console.error(`[error] ${req.method} ${req.url}: ${(e as Error).message}`);
    send(res, status, { ok: false, error: (e as Error).message });
  }
}).listen(PORT, () => console.log(`publisher listening on :${PORT} (model ${MODEL})`));
