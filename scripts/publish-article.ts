// Publishes an article to the online database from a JSON spec, exactly as the admin
// editor would store it: same Tiptap JSON, same renderer (src/lib/content/render.ts), same
// sanitizer, same WebP image variants. Used by the /publish-article skill
// (.claude/skills/publish-article/SKILL.md). The text in the spec is stored as given.
//
// Usage:
//   pnpm publish:article options               # sections, genres, tags, authors (live)
//   pnpm publish:article check <spec.json>     # validate + render, write nothing
//   pnpm publish:article fidelity <spec.json> <source.txt>  # word-by-word diff vs the original text
//   pnpm publish:article publish <spec.json>   # upload images, insert the article (once; remembered in article.json)
//   pnpm publish:article events <spec.json>    # add the spec's calendar dates to an already saved article
//   pnpm publish:article status <spec.json> published | draft | scheduled YYYY-MM-DDTHH:MM   # change it afterwards
//
// Needs .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server only).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { renderDoc, docToText, type PMNode } from '../src/lib/content/render';
import { sanitizeArticleHtml } from '../src/lib/content/sanitize';
import { slugify } from '../src/lib/slug';
import { SHARE_NAME, SHARE_W } from '../src/lib/public/share-image';
import { shareJpeg } from './lib/share-image';

// ------------------------------------------------------------------ env

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
  }
}
loadEnv(join(process.cwd(), '.env.local'));
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SITE_URL = 'https://www.elborj.workers.dev';

const mediaUrl = (p: string) => `${SUPABASE_URL}/storage/v1/object/public/media/${p.split('/').map(encodeURIComponent).join('/')}`;

// ------------------------------------------------------------------ spec

const Run = z.union([
  z.string(),
  z.object({ text: z.string(), bold: z.boolean().optional(), italic: z.boolean().optional(), link: z.string().url().optional() }),
]);
const Inline = z.union([z.string(), z.array(Run)]);
const Image = z.object({
  file: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
  credit: z.string().optional(),
});
const Block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: Inline }),
  z.object({ type: z.literal('heading'), text: Inline, level: z.union([z.literal(2), z.literal(3)]).default(2) }),
  z.object({ type: z.literal('quote'), paragraphs: z.array(Inline).min(1) }),
  z.object({ type: z.literal('pullquote'), text: Inline }),
  z.object({ type: z.literal('list'), ordered: z.boolean().default(false), items: z.array(Inline).min(1) }),
  z.object({ type: z.literal('table'), header: z.boolean().default(true), rows: z.array(z.array(z.string())).min(1) }),
  z.object({ type: z.literal('image'), ...Image.shape }),
  z.object({ type: z.literal('gallery'), images: z.array(Image).min(2) }),
  z.object({ type: z.literal('embed'), url: z.string().url(), caption: z.string().optional() }),
  z.object({ type: z.literal('hr') }),
  z.object({ type: z.literal('read_also'), href: z.string(), title: z.string() }),
]);
type BlockT = z.infer<typeof Block>;

const Spec = z.object({
  language: z.enum(['ar', 'fr']),
  status: z.enum(['draft', 'in_review', 'published', 'scheduled']).default('draft'),
  scheduled_for: z.string().optional(), // "YYYY-MM-DDTHH:MM" in Tunis time
  title: z.string().trim().min(1).max(400),
  subtitle: z.string().trim().max(2000).nullish(),
  kicker_override: z.string().trim().max(200).nullish(),
  location: z.string().trim().max(80).nullish(),
  category: z.string(), // slug
  extra_categories: z.array(z.string()).max(5).default([]),
  format: z.string().nullish(), // slug
  tags: z.array(z.string()).max(30).default([]), // slugs of existing tags
  new_tags: z.array(z.object({ name_ar: z.string().min(1), name_fr: z.string().nullish(), kind: z.enum(['topic', 'place', 'person', 'club', 'competition', 'event']) })).default([]),
  authors: z.array(z.string()).max(6).default([]), // profile slugs; default: the admin
  byline_override: z.string().trim().max(200).nullish(),
  /** No author name at all (same as «بدون توقيع» in the editor). */
  unsigned: z.boolean().default(false),
  cover: Image.nullish(),
  excerpt: z.string().trim().max(400).nullish(),
  is_breaking: z.boolean().default(false),
  breaking_hours: z.number().int().min(1).max(72).default(6),
  is_featured: z.boolean().default(false),
  /** Reader-visible fields Claude wrote because the source had none (e.g. "subtitle"). Must be approved. */
  generated: z.array(z.enum(['subtitle', 'kicker_override', 'location', 'captions'])).default([]),
  /** Obvious typos Claude fixed (exact text in the source → fixed text). `fidelity` applies them to the source before comparing. */
  corrections: z.array(z.object({ from: z.string().min(1), to: z.string(), why: z.string().optional() })).default([]),
  body: z.array(Block).min(1),
  /** Dates the text announces, added to the calendar (الأجندة) linked to this article. Titles
   *  are written by Claude (approved with the rest); dates, times and places come from the text. */
  events: z.array(z.object({
    title_ar: z.string().trim().min(1).max(300),
    title_fr: z.string().trim().max(300).nullish(),
    starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    start_time: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
    place: z.string().trim().max(200).nullish(),
    town: z.string().nullish(), // slug of a place tag
  }).refine((e) => !e.ends_on || e.ends_on >= e.starts_on, 'ends_on before starts_on')).default([]),
});
type SpecT = z.infer<typeof Spec>;

// ------------------------------------------------------------------ helpers

const textNode = (text: string, marks?: PMNode['marks']): PMNode => ({ type: 'text', text, ...(marks?.length ? { marks } : {}) });

/** Inline content; "\n" inside a string becomes a line break (hardBreak), nothing else changes. */
function inline(v: z.infer<typeof Inline>): PMNode[] {
  const runs = typeof v === 'string' ? [{ text: v }] : v.map((r) => (typeof r === 'string' ? { text: r } : r));
  const out: PMNode[] = [];
  for (const r of runs as { text: string; bold?: boolean; italic?: boolean; link?: string }[]) {
    const marks: NonNullable<PMNode['marks']> = [];
    if (r.bold) marks.push({ type: 'bold' });
    if (r.italic) marks.push({ type: 'italic' });
    if (r.link) marks.push({ type: 'link', attrs: { href: r.link } });
    r.text.split('\n').forEach((part, i) => {
      if (i > 0) out.push({ type: 'hardBreak' });
      if (part) out.push(textNode(part, marks));
    });
  }
  return out;
}
const para = (v: z.infer<typeof Inline>): PMNode => ({ type: 'paragraph', content: inline(v) });

function fail(msg: string): never {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function db(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_KEY) fail('.env.local must contain NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Tunis local "YYYY-MM-DDTHH:MM" → ISO (Tunisia is UTC+1 all year, no DST). */
function tunisToIso(local: string): string {
  const d = new Date(`${local.length === 16 ? `${local}:00` : local}+01:00`);
  if (Number.isNaN(d.getTime())) fail(`scheduled_for is not a valid date: ${local}`);
  return d.toISOString();
}

// ------------------------------------------------------------------ images

interface Uploaded { id: string; storage_path: string; variants: Record<string, string>; width: number; height: number }

async function prepareImage(file: string) {
  const path = resolve(file);
  if (!existsSync(path)) fail(`image not found: ${file}`);
  const src = sharp(path, { failOn: 'none' }).rotate(); // apply EXIF orientation; output drops EXIF
  const meta = await src.metadata();
  const w0 = meta.autoOrient?.width ?? meta.width ?? 0;
  if (!w0) fail(`not an image: ${file}`);
  const originalWidth = Math.min(w0, 2400);
  const files: { name: string; width: number; buf: Buffer; type: string }[] = [];
  const encode = (w: number) => sharp(path, { failOn: 'none' }).rotate().resize({ width: w }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const orig = await encode(originalWidth);
  files.push({ name: 'original.webp', width: originalWidth, buf: orig.data, type: 'image/webp' });
  for (const w of [480, 960, 1600]) if (w < w0) files.push({ name: `w${w}.webp`, width: w, buf: (await encode(w)).data, type: 'image/webp' });
  files.push({ name: SHARE_NAME, width: SHARE_W, buf: await shareJpeg(path), type: 'image/jpeg' });
  return { files, width: orig.info.width, height: orig.info.height };
}

async function uploadImage(client: SupabaseClient, img: z.infer<typeof Image>, language: 'ar' | 'fr', uploadedBy: string): Promise<Uploaded> {
  const p = await prepareImage(img.file);
  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}`;
  const variants: Record<string, string> = {};
  let original = '';
  let size = 0;
  for (const f of p.files) {
    const path = `${dir}/${f.name}`;
    const { error } = await client.storage.from('media').upload(path, f.buf, { contentType: f.type, cacheControl: '31536000', upsert: false });
    if (error) fail(`upload failed (${img.file}): ${error.message}`);
    if (f.name === 'original.webp') {
      original = path;
      size = f.buf.length;
    } else if (f.name === SHARE_NAME) variants.share = path;
    else variants[String(f.width)] = path;
  }
  // Same rule as the admin uploader: a small original doubles as its own width variant.
  if (!variants[String(p.width)] && p.width < 1600) variants[String(p.width)] = original;
  const row: Record<string, unknown> = {
    storage_path: original, variants, width: p.width, height: p.height, size_bytes: size, mime_type: 'image/webp',
    uploaded_by: uploadedBy, credit: img.credit ?? null,
    ...(language === 'ar' ? { alt_ar: img.alt, caption_ar: img.caption ?? null } : { alt_fr: img.alt, caption_fr: img.caption ?? null }),
  };
  const { data, error } = await client.from('media').insert(row).select('id').single();
  if (error || !data) fail(`media row failed: ${error?.message}`);
  return { id: data.id as string, storage_path: original, variants, width: p.width, height: p.height };
}

// ------------------------------------------------------------------ document

function figureNode(img: z.infer<typeof Image>, u: Uploaded | null): PMNode {
  return {
    type: 'figure',
    attrs: {
      src: u?.storage_path ?? `preview/${basename(img.file)}`, variants: u?.variants ?? null, width: u?.width ?? null, height: u?.height ?? null,
      alt: img.alt, caption: img.caption ?? '', credit: img.credit ?? '', mediaId: u?.id ?? null,
    },
  };
}

function toDoc(body: BlockT[], uploads: Map<string, Uploaded>): PMNode {
  const content: PMNode[] = [];
  for (const b of body) {
    switch (b.type) {
      case 'paragraph': content.push(para(b.text)); break;
      case 'heading': content.push({ type: 'heading', attrs: { level: b.level }, content: inline(b.text) }); break;
      case 'quote': content.push({ type: 'blockquote', content: b.paragraphs.map(para) }); break;
      case 'pullquote': content.push({ type: 'pullQuote', content: inline(b.text) }); break;
      case 'list': content.push({ type: b.ordered ? 'orderedList' : 'bulletList', content: b.items.map((i) => ({ type: 'listItem', content: [para(i)] })) }); break;
      case 'table':
        content.push({
          type: 'table',
          content: b.rows.map((row, r) => ({
            type: 'tableRow',
            content: row.map((cell) => ({ type: b.header && r === 0 ? 'tableHeader' : 'tableCell', content: [para(cell)] })),
          })),
        });
        break;
      case 'image': content.push(figureNode(b, uploads.get(b.file) ?? null)); break;
      case 'gallery': content.push({ type: 'gallery', attrs: { images: b.images.map((i) => figureNode(i, uploads.get(i.file) ?? null).attrs) } }); break;
      case 'embed': content.push({ type: 'embed', attrs: { url: b.url, caption: b.caption ?? '' } }); break;
      case 'hr': content.push({ type: 'horizontalRule' }); break;
      case 'read_also': content.push({ type: 'readAlso', attrs: { href: b.href, title: b.title, publicId: null } }); break;
    }
  }
  return { type: 'doc', content };
}

function bodyImages(spec: SpecT) {
  const list: z.infer<typeof Image>[] = [];
  for (const b of spec.body) {
    if (b.type === 'image') list.push(b);
    if (b.type === 'gallery') list.push(...b.images);
  }
  return list;
}

// ------------------------------------------------------------------ lookups

async function lookups(client: SupabaseClient) {
  const [cats, formats, tags, authors] = await Promise.all([
    client.from('categories').select('id, slug, name_ar, name_fr, parent_id, is_active').eq('is_active', true).order('position'),
    client.from('article_formats').select('id, slug, name_ar, name_fr').eq('is_active', true).order('position'),
    client.from('tags').select('id, slug, name_ar, name_fr, kind').order('name_ar'),
    client.from('profiles').select('id, slug, display_name_ar, display_name_fr, role, is_active, is_demo').eq('is_active', true),
  ]);
  for (const r of [cats, formats, tags, authors]) if (r.error) fail(r.error.message);
  return { cats: cats.data!, formats: formats.data!, tags: tags.data!, authors: authors.data! };
}

async function resolveSpec(client: SupabaseClient, spec: SpecT) {
  const L = await lookups(client);
  const cat = (s: string) => L.cats.find((c) => c.slug === s) ?? fail(`unknown section "${s}" (pnpm publish:article options)`);
  const category = cat(spec.category);
  const extra = spec.extra_categories.map((s) => cat(s).id).filter((id) => id !== category.id);
  const format = spec.format ? L.formats.find((f) => f.slug === spec.format) ?? fail(`unknown genre "${spec.format}"`) : null;
  const tagIds = spec.tags.map((s) => (L.tags.find((t) => t.slug === s) ?? fail(`unknown tag "${s}" (put new ones in new_tags)`)).id as string);
  const admin = L.authors.find((a) => a.role === 'admin' && !a.is_demo);
  const authorRows = spec.unsigned
    ? []
    : spec.authors.length
    ? spec.authors.map((s) => L.authors.find((a) => a.slug === s) ?? fail(`unknown author "${s}"`))
    : spec.byline_override ? [] : [admin ?? fail('no admin profile found')];
  const actingId = (admin ?? authorRows[0])?.id as string;
  if (spec.status === 'scheduled' && !spec.scheduled_for) fail('status "scheduled" needs scheduled_for ("YYYY-MM-DDTHH:MM", Tunis time)');
  if (spec.cover && !spec.cover.alt) fail('the cover image needs alt text');
  for (const i of [spec.cover, ...bodyImages(spec)].filter(Boolean)) if (!existsSync(resolve(i!.file))) fail(`image not found: ${i!.file}`);
  const events = spec.events.map((e) => {
    const town = e.town ? L.tags.find((t) => t.slug === e.town && t.kind === 'place') ?? fail(`unknown town "${e.town}" (a place tag: pnpm publish:article options)`) : null;
    return { title_ar: e.title_ar, title_fr: e.title_fr ?? null, starts_on: e.starts_on, ends_on: e.ends_on ?? null, start_time: e.start_time ?? null, end_time: e.end_time ?? null, place: e.place ?? null, town_tag_id: (town?.id as string) ?? null };
  });
  return { category, extra, format, tagIds, authorRows, actingId, events };
}

// ------------------------------------------------------------------ commands

async function options() {
  const L = await lookups(db());
  const name = (r: { name_ar: string; name_fr: string | null }) => `${r.name_ar}${r.name_fr ? ` / ${r.name_fr}` : ''}`;
  console.log('SECTIONS (category / extra_categories):');
  for (const c of L.cats.filter((c) => !c.parent_id)) {
    console.log(`  ${c.slug.padEnd(22)} ${name(c)}`);
    for (const s of L.cats.filter((x) => x.parent_id === c.id)) console.log(`    ${s.slug.padEnd(20)} ${name(s)}`);
  }
  console.log('\nGENRES (format):');
  for (const f of L.formats) console.log(`  ${f.slug.padEnd(22)} ${name(f)}`);
  console.log('\nTAGS (tags):');
  for (const t of L.tags) console.log(`  ${t.slug.padEnd(30)} ${t.kind.padEnd(12)} ${name(t)}`);
  console.log('\nAUTHORS (authors; default = the admin):');
  for (const a of L.authors) console.log(`  ${a.slug.padEnd(30)} ${a.role.padEnd(7)} ${a.display_name_ar}${a.is_demo ? '  [demo]' : ''}`);
}

function readSpec(file: string): SpecT {
  if (!file || !existsSync(file)) fail(`spec file not found: ${file}`);
  const parsed = Spec.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) fail(`invalid spec:\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  return parsed.data;
}

async function check(file: string) {
  const spec = readSpec(file);
  const r = await resolveSpec(db(), spec);
  const doc = toDoc(spec.body, new Map());
  const html = sanitizeArticleHtml(renderDoc(doc, { mediaUrl, locale: spec.language }));
  const out = join(tmpdir(), `article-preview-${Date.now()}.html`);
  const dir = spec.language === 'ar' ? 'rtl' : 'ltr';
  writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>${spec.title}</title><body dir="${dir}" lang="${spec.language}" style="max-width:680px;margin:2rem auto;font:18px/1.7 serif">` +
    `<p style="color:#a3161c">${r.category.name_ar}${r.format ? ` · ${r.format.name_ar}` : ''}</p><h1>${spec.title}</h1>${spec.subtitle ? `<p><em>${spec.subtitle}</em></p>` : ''}${html}</body>`);
  for (const img of [spec.cover, ...bodyImages(spec)].filter(Boolean)) {
    const p = await prepareImage(img!.file);
    console.log(`  image ${basename(img!.file)}: ${p.width}×${p.height}, ${p.files.length} WebP files, ${Math.round(p.files.reduce((n, f) => n + f.buf.length, 0) / 1024)} KB`);
  }
  console.log('✓ spec is valid');
  console.log(`  language ${spec.language} · status ${spec.status}${spec.scheduled_for ? ` (${spec.scheduled_for} Tunis)` : ''}`);
  console.log(`  section ${r.category.slug}${r.extra.length ? ` (+${r.extra.length})` : ''} · genre ${r.format?.slug ?? '—'} · tags ${spec.tags.length} existing, ${spec.new_tags.length} new`);
  console.log(`  byline ${spec.unsigned ? '(unsigned: no author name)' : spec.byline_override ?? r.authorRows.map((a) => a!.display_name_ar).join('، ')}`);
  for (const e of r.events) console.log(`  calendar: ${e.starts_on}${e.ends_on ? ` → ${e.ends_on}` : ''}${e.start_time ? ` ${e.start_time}` : ''} «${e.title_ar}»${e.place ? ` · ${e.place}` : ''}`);
  console.log(`  blocks ${spec.body.length} · images ${bodyImages(spec).length + (spec.cover ? 1 : 0)} · words ${docToText(doc).split(/\s+/).filter(Boolean).length}`);
  console.log(`  preview (images not uploaded yet): ${out}`);
}

async function publish(file: string) {
  const spec = readSpec(file);
  const saved = savedFile(file);
  if (existsSync(saved)) fail(`already saved on the site (${saved}); change it with: status ${file} published|draft|scheduled`);
  const client = db();
  const r = await resolveSpec(client, spec);

  // New tags first (editorial: the skill only adds them after Firas approved).
  const tagIds = [...r.tagIds];
  for (const t of spec.new_tags) {
    // Same slug rule as the admin's createTag.
    const base = slugify(t.name_fr || t.name_ar) || `tag-${Date.now().toString(36)}`;
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const { data: taken } = await client.from('tags').select('id').eq('slug', slug).maybeSingle();
      if (!taken) break;
      slug = `${base}-${i}`;
    }
    const { data, error } = await client.from('tags').insert({ name_ar: t.name_ar, name_fr: t.name_fr ?? null, kind: t.kind, slug }).select('id, slug').single();
    if (error || !data) fail(`tag "${t.name_ar}" failed: ${error?.message}`);
    tagIds.push(data.id as string);
    console.log(`  + tag ${data.slug}`);
  }

  // Images.
  const uploads = new Map<string, Uploaded>();
  let cover: Uploaded | null = null;
  if (spec.cover) {
    cover = await uploadImage(client, spec.cover, spec.language, r.actingId);
    console.log(`  + cover ${cover.storage_path}`);
  }
  for (const img of bodyImages(spec)) {
    if (uploads.has(img.file)) continue;
    const u = await uploadImage(client, img, spec.language, r.actingId);
    uploads.set(img.file, u);
    console.log(`  + image ${u.storage_path}`);
  }

  const doc = toDoc(spec.body, uploads);
  const body_html = sanitizeArticleHtml(renderDoc(doc, { mediaUrl, locale: spec.language }));
  const now = new Date();
  const row: Record<string, unknown> = {
    language: spec.language, status: spec.status, title: spec.title, subtitle: spec.subtitle ?? null,
    kicker_override: spec.kicker_override ?? null, location: spec.location ?? null,
    body_json: doc, body_html, body_text: docToText(doc), excerpt: spec.excerpt ?? null,
    category_id: r.category.id, format_id: r.format?.id ?? null, byline_override: spec.unsigned ? null : spec.byline_override ?? null,
    cover_media_id: cover?.id ?? null, cover_caption: spec.cover?.caption ?? null, cover_credit: spec.cover?.credit ?? null, cover_alt: spec.cover?.alt ?? null,
    is_featured: spec.is_featured, is_breaking: spec.is_breaking,
    breaking_until: spec.is_breaking ? new Date(now.getTime() + spec.breaking_hours * 3600000).toISOString() : null,
    created_by: r.actingId, last_edited_by: r.actingId,
  };
  if (spec.status === 'published') row.published_at = now.toISOString();
  if (spec.status === 'scheduled') row.scheduled_for = tunisToIso(spec.scheduled_for!);

  const { data: art, error } = await client.from('articles').insert(row).select('id, public_id, slug, status, language').single();
  if (error || !art) fail(`article insert failed: ${error?.message}`);

  const joins = await Promise.all([
    r.authorRows.length ? client.from('article_authors').insert(r.authorRows.map((a, position) => ({ article_id: art.id, profile_id: a!.id, position }))) : null,
    tagIds.length ? client.from('article_tags').insert(tagIds.map((tag_id) => ({ article_id: art.id, tag_id }))) : null,
    r.extra.length ? client.from('article_categories').insert(r.extra.map((category_id) => ({ article_id: art.id, category_id }))) : null,
    client.from('article_revisions').insert({ article_id: art.id, title: spec.title, subtitle: spec.subtitle ?? null, body_json: doc, edited_by: r.actingId }),
  ]);
  for (const j of joins) if (j?.error) fail(`article saved (id ${art.id}) but a link table failed: ${j.error.message}. Fix it in the admin.`);

  // Calendar entries: hidden from readers until the article is public (RLS).
  if (r.events.length) {
    const ev = await client.from('events').insert(r.events.map((e) => ({ ...e, kind: 'event', article_id: art.id, created_by: r.actingId })));
    if (ev.error) fail(`article saved (id ${art.id}) but the calendar entries failed: ${ev.error.message}. Add them in the admin (الأجندة).`);
    console.log(`  + ${r.events.length} calendar entr${r.events.length > 1 ? 'ies' : 'y'} (الأجندة)`);
  }

  writeFileSync(saved, JSON.stringify({ id: art.id, public_id: art.public_id, language: art.language }, null, 2) + '\n');

  // Short link (no slug): an Arabic slug percent-encodes into ~250 characters. Same page, see DECISIONS.md.
  const path = `/${art.language}/article/${art.public_id}`;
  console.log(`\n✓ saved as ${art.status}`);
  console.log(`  admin:  ${SITE_URL}/${art.language}/admin/articles/${art.id}`);
  if (art.status === 'published') console.log(`  public: ${SITE_URL}${path}`);
  if (art.status !== 'draft') await refreshSite();
  if (art.status === 'scheduled') console.log(`  goes live at ${spec.scheduled_for} (Tunis): ${SITE_URL}${path}`);
}

/** Refreshes the live site's cached pages (homepage, lists) right away instead of waiting for
 *  the time-based refresh. Needs PROD_REVALIDATE_SECRET in .env.local (the live site's
 *  REVALIDATE_SECRET, also in private.app_config); without it, prints how long to wait. */
async function refreshSite(tags: string[] = ['articles', 'authors', 'stats', 'events']) {
  const secret = process.env.PROD_REVALIDATE_SECRET;
  if (!secret) return console.log('  (no PROD_REVALIDATE_SECRET: homepage and lists refresh within about 5 minutes)');
  const res = await fetch(`${SITE_URL}/api/revalidate`, { method: 'POST', headers: { 'x-revalidate-secret': secret, 'content-type': 'application/json' }, body: JSON.stringify({ tags }) }).catch(() => null);
  console.log(res?.ok ? '  site refreshed: homepage and lists show it now' : `  (refresh failed${res ? `: HTTP ${res.status}` : ''}; homepage and lists refresh within about 5 minutes)`);
}

/** Remembers the article a spec was saved as, so it is never inserted twice. */
const savedFile = (spec: string) => join(dirname(resolve(spec)), 'article.json');

/** Change the status of the article saved from this spec (draft → published, scheduled…). */
async function setStatus(file: string, status: string, when?: string) {
  const saved = savedFile(file);
  if (!existsSync(saved)) fail(`not saved on the site yet (no ${saved}): run publish first`);
  const art = JSON.parse(readFileSync(saved, 'utf8')) as { id: string; public_id: number; language: string };
  const patch: Record<string, unknown> =
    status === 'published' ? { status, scheduled_for: null }
    : status === 'draft' ? { status, published_at: null, scheduled_for: null }
    : status === 'scheduled' && when && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when) ? { status, scheduled_for: tunisToIso(when), published_at: null }
    : fail('usage: status <spec.json> published | draft | scheduled YYYY-MM-DDTHH:MM');
  const { data, error } = await db().from('articles').update(patch).eq('id', art.id).select('status').single();
  if (error || !data) fail(`status change failed: ${error?.message}`);
  const path = `/${art.language}/article/${art.public_id}`;
  console.log(`✓ now ${data.status}${when ? ` (${when} Tunis)` : ''}`);
  console.log(`  admin:  ${SITE_URL}/${art.language}/admin/articles/${art.id}`);
  if (data.status === 'published') console.log(`  public: ${SITE_URL}${path}`);
  await refreshSite();
}

/** Adds the spec's `events` to the calendar for an article already saved (skips ones already there). */
async function addEvents(file: string) {
  const spec = readSpec(file);
  const saved = savedFile(file);
  if (!existsSync(saved)) fail(`not saved on the site yet (no ${saved}): run publish (it adds the events too)`);
  const art = JSON.parse(readFileSync(saved, 'utf8')) as { id: string };
  const client = db();
  const r = await resolveSpec(client, spec);
  const { data: have } = await client.from('events').select('starts_on, title_ar').eq('article_id', art.id);
  const key = (e: { starts_on: string; title_ar: string }) => `${e.starts_on}|${e.title_ar}`;
  const known = new Set((have ?? []).map(key));
  const rows = r.events.filter((e) => !known.has(key(e))).map((e) => ({ ...e, kind: 'event', article_id: art.id, created_by: r.actingId }));
  if (!rows.length) return console.log('nothing new: these dates are already on the calendar');
  const { error } = await client.from('events').insert(rows);
  if (error) fail(`calendar insert failed: ${error.message}`);
  console.log(`✓ ${rows.length} calendar entr${rows.length > 1 ? 'ies' : 'y'} added (shown once the article is public)`);
  await refreshSite(['events']);
}

/** Every word of the spec that readers will see, in reading order. */
function specWords(spec: SpecT): string[] {
  // The site prints the dateline as «location — » at the start of the first paragraph.
  const gen = new Set(spec.generated);
  const parts: string[] = [
    spec.title,
    gen.has('kicker_override') ? '' : spec.kicker_override ?? '',
    gen.has('subtitle') ? '' : spec.subtitle ?? '',
    !gen.has('location') && spec.location ? `${spec.location} —` : '',
    gen.has('captions') ? '' : spec.cover?.caption ?? '', spec.cover?.credit ?? '',
  ];
  const flat = (v: z.infer<typeof Inline>) => (typeof v === 'string' ? v : v.map((r) => (typeof r === 'string' ? r : r.text)).join(''));
  for (const b of spec.body) {
    if (b.type === 'paragraph' || b.type === 'heading' || b.type === 'pullquote') parts.push(flat(b.text));
    else if (b.type === 'quote') parts.push(...b.paragraphs.map(flat));
    else if (b.type === 'list') parts.push(...b.items.map(flat));
    else if (b.type === 'table') parts.push(...b.rows.flat());
    else if (b.type === 'image') parts.push(gen.has('captions') ? '' : b.caption ?? '', b.credit ?? '');
    else if (b.type === 'gallery') parts.push(...b.images.flatMap((i) => [gen.has('captions') ? '' : i.caption ?? '', i.credit ?? '']));
    else if (b.type === 'read_also') parts.push(b.title);
  }
  return parts.join(' ').split(/\s+/).filter(Boolean);
}

/** Word-level diff (LCS) between the original text and the spec. Exit 2 if anything differs. */
function fidelity(file: string, sourceFile: string) {
  const spec = readSpec(file);
  if (!sourceFile || !existsSync(sourceFile)) fail(`source text not found: ${sourceFile}`);
  let source = readFileSync(sourceFile, 'utf8');
  for (const c of spec.corrections) {
    if (!source.includes(c.from)) fail(`correction not found in the source: «${c.from}»`);
    source = source.split(c.from).join(c.to);
  }
  const a = source.split(/\s+/).filter(Boolean);
  const b = specWords(spec);
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i]![j] = a[i] === b[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const missing: string[] = [], added: string[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; } else if (L[i + 1]![j]! >= L[i]![j + 1]!) missing.push(`${a[i++]}  (word ${i})`); else added.push(b[j++]!);
  }
  while (i < n) missing.push(`${a[i++]}  (word ${i})`);
  while (j < m) added.push(b[j++]!);
  console.log(`original: ${n} words · article: ${m} words · identical in order: ${L[0]![0]}`);
  for (const c of spec.corrections) console.log(`typo fixed by Claude (needs approval): «${c.from}» → «${c.to}»${c.why ? `  (${c.why})` : ''}`);
  for (const f of spec.generated) console.log(`written by Claude (not part of the comparison, needs approval): ${f}${f === 'captions' ? ' (picture captions)' : ` = «${spec[f] ?? ''}»`}`);
  if (!missing.length && !added.length) { console.log(`✓ the article contains the original text word for word${spec.corrections.length ? ` (after the ${spec.corrections.length} typo fixes above)` : ''}`); return; }
  if (missing.length) console.log(`\nIn the original but NOT in the article (${missing.length}):\n  ${missing.join('\n  ')}`);
  if (added.length) console.log(`\nIn the article but NOT in the original (${added.length}):\n  ${added.join('\n  ')}`);
  process.exit(2);
}

const [cmd, file, extra, extra2] = process.argv.slice(2);
if (cmd === 'fidelity') fidelity(file!, extra!);
const run = cmd === 'fidelity' ? Promise.resolve() : cmd === 'options' ? options() : cmd === 'check' ? check(file!) : cmd === 'publish' ? publish(file!) : cmd === 'status' ? setStatus(file!, extra ?? '', extra2) : cmd === 'events' ? addEvents(file!) : fail('usage: publish-article.ts options | check <spec.json> | fidelity <spec.json> <source.txt> | publish <spec.json> | status <spec.json> published|draft|scheduled [YYYY-MM-DDTHH:MM]');
run.catch((e) => fail(e instanceof Error ? e.message : String(e)));
