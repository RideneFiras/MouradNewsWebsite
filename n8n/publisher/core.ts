// The publisher's work, shared by the HTTP service (server.ts) and the local test (try.ts).
// Reuses the /publish-article tool as-is: scripts/publish-article.ts check → fidelity → publish.
// The model writes the spec with the rules of .claude/skills/publish-article/SKILL.md (read at
// runtime) and gets the tool's errors back until `fidelity` says "word for word".
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { AUTOMATION_ADDENDUM, FACEBOOK_RULES } from './prompts';
import { startChat } from './llm';

const REPO = resolve(process.env.REPO_DIR ?? process.cwd());
const DATA = resolve(process.env.DATA_DIR ?? '/data');
const SITE_URL = 'https://www.elborj.workers.dev';
const MAX_ATTEMPTS = 3;

export type Json = Record<string, unknown>;

export class HttpError extends Error {
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

interface Picture { name: string; path: string; original: string; small: string }

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
      out.push({ name, path, original, small: small.toString('base64') });
    } catch {
      notes.push(`Picture «${original}» could not be read (format not supported, e.g. HEIC); it was left out. Send it as JPEG or add it in the admin.`);
    }
  }
  return out;
}

// ------------------------------------------------------------------ spec

/** Paths, and the rules no draft may break whatever the model wrote. */
function prepareSpec(spec: Json, pictures: Picture[], notes: string[]) {
  const byName = new Map(pictures.map((p) => [p.name, p.path]));
  const fix = (img: unknown) => {
    if (img && typeof img === 'object' && 'file' in img) {
      const o = img as { file: string };
      o.file = byName.get(String(o.file).split('/').pop()!) ?? o.file;
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

// ------------------------------------------------------------------ ingest

/** Email → draft. With `dry_run: true` it does everything except save to the database
 *  (check, fidelity, Facebook text, a local HTML preview), and can be repeated. */
export async function ingest(body: Json): Promise<Json> {
  const messageId = String(body.message_id ?? '');
  if (!messageId) throw new HttpError(400, 'message_id is required');
  const dry = body.dry_run === true;
  const workId = createHash('sha256').update(dry ? `${messageId}:dry:${Date.now()}` : messageId).digest('hex').slice(0, 16);
  const dir = join(DATA, 'posts', workId);
  const resultFile = join(dir, 'result.json');
  if (existsSync(resultFile)) return { ...(JSON.parse(readFileSync(resultFile, 'utf8')) as Json), repeated: true };
  const lock = join(dir, '.lock');
  if (existsSync(lock)) throw new HttpError(409, 'this email is already being processed');
  mkdirSync(dir, { recursive: true });
  writeFileSync(lock, new Date().toISOString());
  try {
    return await ingestLocked(body, workId, dir, resultFile, dry);
  } finally {
    rmSync(lock, { force: true });
  }
}

async function ingestLocked(body: Json, workId: string, dir: string, resultFile: string, dry: boolean): Promise<Json> {
  const subject = String(body.subject ?? '').trim();
  const text = String(body.text ?? '').replace(/\r\n?/g, '\n').replace(/ /g, ' ');
  const lines = text.split('\n');
  writeFileSync(join(dir, 'email.txt'), `Subject: ${subject}\n\n${text}`);
  const notes: string[] = [];
  const pictures = await savePictures(dir, (body.images as Json[] | undefined) ?? [], notes);

  const options = await cli(['options']);
  if (options.code !== 0) throw new Error(`could not read the live options: ${options.out}`);
  const skill = readFileSync(join(REPO, '.claude/skills/publish-article/SKILL.md'), 'utf8').replace(/^---[\s\S]*?---\n/, '');
  const chat = startChat(`${skill}\n\n${AUTOMATION_ADDENDUM}`, 'high');

  let message = [
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
  ].join('\n');
  let images = pictures.map((p) => ({ label: `Picture ${p.name} (sent as «${p.original}»):`, jpegBase64: p.small }));

  let answer: Json = {};
  let fidelity = '';
  let preview = '';
  let ok = false;
  let lastError = '';
  let specNotes: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !ok; attempt++) {
    const reply = await chat.send(message, images);
    images = []; // sent once; the conversation keeps them
    let problem = '';
    try {
      answer = parseObject(reply);
    } catch (e) {
      problem = `Your answer was not one valid JSON object (${(e as Error).message}).`;
    }
    if (!problem && answer.status === 'needs_input') {
      const result = { ok: false, needs_input: true, dry_run: dry, work_id: workId, question: String(answer.question ?? ''), notes: [...notes, ...((answer.notes as string[]) ?? [])] };
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
      preview = check.out.match(/preview[^:]*: (\S+\.html)/)?.[1] ?? '';
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
      message = `${problem}\n\nFix the spec and answer again with the full JSON object.`;
    } else ok = true;
  }
  if (!ok) throw new Error(`no valid draft after ${MAX_ATTEMPTS} attempts. Last error:\n${lastError}`);

  notes.push(...specNotes);
  const spec = JSON.parse(readFileSync(join(dir, 'spec.json'), 'utf8')) as Json;
  let art = { id: '(dry run)', public_id: 0, language: String(spec.language ?? 'ar') };
  if (!dry) {
    const pub = await cli(['publish', join(dir, 'spec.json')]);
    if (pub.code !== 0) throw new Error(`saving the draft failed:\n${pub.out}`);
    art = JSON.parse(readFileSync(join(dir, 'article.json'), 'utf8')) as typeof art;
    console.log(`[${workId}] draft saved: ${SITE_URL}/${art.language}/admin/articles/${art.id}`);
  }
  const publicUrl = `${SITE_URL}/${art.language}/article/${art.public_id}`;
  const adminUrl = dry ? `(dry run, nothing saved) preview: ${preview}` : `${SITE_URL}/${art.language}/admin/articles/${art.id}`;

  const skipped = ((answer.skip_lines as number[]) ?? []).map((n) => `L${n}: ${lines[n - 1] ?? ''}`);
  const facebook = await facebookPost(spec, readFileSync(join(dir, 'source.txt'), 'utf8'), publicUrl, tagNames(options.out)).catch((e: Error) => {
    notes.push(`The Facebook text could not be written (${e.message}); write it in the approval form.`);
    return '';
  });

  const pics = [spec.cover, ...((spec.body as Json[]) ?? []).flatMap((b) => (b.type === 'image' ? [b] : b.type === 'gallery' ? (b.images as Json[]) : []))]
    .filter(Boolean)
    .map((i, n) => `${n === 0 && spec.cover ? 'cover' : 'in the text'}: ${pictures.find((p) => p.path === (i as Json).file)?.original ?? (i as Json).file}: ${(i as Json).alt}`);

  const result = {
    ok: true,
    dry_run: dry,
    work_id: workId,
    work_dir: dir,
    article_id: art.id,
    public_id: art.public_id,
    admin_url: adminUrl,
    public_url: publicUrl,
    preview,
    title: spec.title,
    subtitle: spec.subtitle ?? '',
    generated: spec.generated ?? [],
    category: spec.category,
    extra_categories: spec.extra_categories ?? [],
    format: spec.format ?? '',
    tags: spec.tags ?? [],
    images: pics,
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
  const reply = await startChat(FACEBOOK_RULES, 'medium').send([
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
  ].join('\n'));
  const post = reply.replace(/^["«]|["»]$/g, '').trim();
  return post.includes(url) ? post : `${post}\n${url}`;
}

// ------------------------------------------------------------------ publish

export async function publish(body: Json): Promise<Json> {
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
