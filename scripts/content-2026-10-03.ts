// One-off content update (2026-10-03), approved by Firas before running. Dry run by default:
//   pnpm tsx scripts/content-2026-10-03.ts            # prints what it would do
//   pnpm tsx scripts/content-2026-10-03.ts --apply    # writes
// Needs the events migration (20261003100000) applied first. Safe to re-run (skips what exists).
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { renderDoc, type PMNode } from '../src/lib/content/render';
import { sanitizeArticleHtml } from '../src/lib/content/sanitize';
import { tunisianHolidays } from '../src/lib/events/holidays';

for (const line of existsSync('.env.local') ? readFileSync('.env.local', 'utf8').split('\n') : []) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
}
const APPLY = process.argv.includes('--apply');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const log = (s: string) => console.log(`${APPLY ? '✓' : '·'} ${s}`);
async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return (data ?? []) as NonNullable<T>;
}

// 1. Sections ---------------------------------------------------------------------------
const NEW_SECTIONS = [
  { slug: 'regions', name_ar: 'جهات', name_fr: 'Régions' },
  { slug: 'education', name_ar: 'تربية', name_fr: 'Éducation' },
];
const ORDER = ['cap-bon', 'national', 'regions', 'volleyball', 'sport', 'culture', 'society', 'education', 'economy', 'opinion', 'world'];

// 2. Towns (place tags): the delegations of Nabeul governorate not yet tagged ----------------
const TOWNS = [
  ['beni-khiar', 'بني خيار', 'Béni Khiar'], ['dar-chaabane', 'دار شعبان الفهري', 'Dar Chaâbane El Fehri'],
  ['el-mida', 'الميدة', 'El Mida'], ['hammam-ghezaz', 'حمام الأغزاز', 'Hammam Ghezèze'], ['takelsa', 'تاكلسة', 'Takelsa'],
  ['soliman', 'سليمان', 'Soliman'], ['beni-khalled', 'بني خلاد', 'Béni Khalled'], ['grombalia', 'قرمبالية', 'Grombalia'],
  ['bou-argoub', 'بوعرقوب', 'Bou Argoub'],
] as const;

// 3. Articles: town tags and the sections the texts asked for --------------------------------
const ADD_TAGS: [publicId: number, slug: string][] = [[38, 'beni-khiar'], [34, 'hammam-ghezaz'], [37, 'bou-argoub']];
const MOVE: [publicId: number, to: string, keepAsExtra: string][] = [[39, 'education', 'society'], [40, 'regions', 'cap-bon']];

// 4. Calendar: dates announced by the published articles, and the public holidays ----------
type Ev = { pid: number; title_ar: string; starts_on: string; ends_on?: string; start_time?: string; end_time?: string; place?: string; town?: string };
const EVENTS: Ev[] = [
  { pid: 33, title_ar: 'مسرحية «اليوم تسأل»', starts_on: '2026-10-02', start_time: '18:30', place: 'دار الثقافة نابل', town: 'nabeul' },
  { pid: 33, title_ar: 'العرض ما قبل الأول لمسرحية «الآنسة نون»', starts_on: '2026-10-03', start_time: '18:30', place: 'دار الثقافة نابل', town: 'nabeul' },
  { pid: 33, title_ar: 'مسرحية «واحد»', starts_on: '2026-10-04', start_time: '18:00', place: 'دار الثقافة نابل', town: 'nabeul' },
  { pid: 33, title_ar: 'ورشة فن الممثل مع معز حمزة', starts_on: '2026-10-02', ends_on: '2026-10-04', place: 'دار الثقافة نابل', town: 'nabeul' },
  { pid: 37, title_ar: 'المهرجان الدولي لفيلم المرأة «بعيونهن»', starts_on: '2026-10-03', ends_on: '2026-10-07', place: 'نابل والحمامات وبوعرقوب' },
  { pid: 37, title_ar: 'افتتاح مهرجان «بعيونهن»', starts_on: '2026-10-03', start_time: '18:30', place: 'فضاء الحمامات فن وثقافة', town: 'hammamet' },
  { pid: 38, title_ar: 'نادي عليسة للغناء يستأنف نشاطه', starts_on: '2026-10-07', place: 'دار الشباب بني خيار', town: 'beni-khiar' },
  { pid: 40, title_ar: 'وقفة احتجاجية ضد مصنع الذباب الأسود', starts_on: '2026-10-03', start_time: '11:00', end_time: '13:00', place: 'أمام المصنع، شارع المنجي سليم', town: 'menzel-bouzelfa' },
];

// 5. Static pages: drafts to read and publish from the admin (no names) ----------------------
const p = (text: string): PMNode => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const h = (text: string): PMNode => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] });
const PAGES: Record<string, Record<'ar' | 'fr', PMNode[]>> = {
  about: {
    ar: [
      p('«البرج» جريدة إلكترونية مستقلّة تهتمّ بأخبار الوطن القبلي (ولاية نابل) وبالشأن الوطني: الحياة اليومية في المدن والقرى، الثقافة، الرياضة، المجتمع والاقتصاد.'),
      p('اخترنا اسم «البرج» نسبة إلى برج قليبية، الحصن الذي يطلّ على البحر منذ قرون ويختصر تاريخ الجهة.'),
      p('ننشر الأخبار كما تصلنا من الميدان ومن المؤسسات والجمعيات بعد التثبّت منها، ونفصل بين الخبر والرأي، وبين التحرير والإشهار: كل محتوى مموّل يحمل عبارة «محتوى برعاية».'),
      p('لإرسال خبر أو صورة أو موعد أو تصويب، استعملوا صفحة «اتصل بنا» أو صفحتنا على فيسبوك.'),
    ],
    fr: [
      p('El Borj est un journal électronique indépendant consacré à l’actualité du Cap Bon (gouvernorat de Nabeul) et à l’actualité nationale : la vie des villes et des villages, la culture, le sport, la société et l’économie.'),
      p('Son nom vient du Borj de Kélibia, la forteresse qui veille sur la mer depuis des siècles et résume l’histoire de la région.'),
      p('Nous publions les informations venues du terrain, des institutions et des associations après les avoir vérifiées. Nous séparons l’information de l’opinion, et la rédaction de la publicité : tout contenu financé porte la mention « Contenu sponsorisé ».'),
      p('Pour nous envoyer une information, une photo, un rendez-vous ou une correction, utilisez la page Contact ou notre page Facebook.'),
    ],
  },
  contact: {
    ar: [p('لديكم خبر من مدينتكم، أو موعد ثقافي أو رياضي تريدون إعلانه، أو صورة، أو ملاحظة على مقال؟ راسلونا عبر النموذج أسفله أو عبر صفحتنا على فيسبوك. نقرأ كل الرسائل، ونصحّح كل خطأ متى ثبت.')],
    fr: [p('Une information de votre ville, un rendez-vous culturel ou sportif à annoncer, une photo, une remarque sur un article ? Écrivez-nous avec le formulaire ci-dessous ou sur notre page Facebook. Nous lisons tous les messages et corrigeons toute erreur avérée.')],
  },
  charter: {
    ar: [
      h('الدقّة'), p('لا ننشر خبرا قبل التثبّت منه، ونذكر مصدره كلّما أمكن (بلاغ، جمعية، مؤسسة، شاهد).'),
      h('الخبر والرأي'), p('نفصل بين الخبر والرأي: مقالات الرأي تحمل صنف «رأي» وتعبّر عن أصحابها.'),
      h('التحرير والإشهار'), p('لا يؤثّر المعلنون في ما ننشره. كل محتوى مموّل يحمل عبارة «محتوى برعاية»، وكل مساحة إشهارية تحمل كلمة «إشهار».'),
      h('التصويبات وحقّ الردّ'), p('إذا أخطأنا نصحّح الخطأ في المقال نفسه ونشير إلى التصويب في آخره. ولكل من يرد اسمه في خبر حقّ الردّ عبر صفحة «اتصل بنا».'),
      h('الكرامة والحياة الخاصة'), p('نحترم الحياة الخاصة وكرامة الأشخاص، ونتوخّى الحذر في نشر صور القصّر وأسمائهم.'),
    ],
    fr: [
      h('Exactitude'), p('Nous ne publions une information qu’après l’avoir vérifiée et citons sa source chaque fois que possible (communiqué, association, institution, témoin).'),
      h('Information et opinion'), p('Les articles d’opinion portent le genre « Opinion » et n’engagent que leurs auteurs.'),
      h('Rédaction et publicité'), p('Les annonceurs n’influencent pas ce que nous publions. Tout contenu financé porte la mention « Contenu sponsorisé », toute publicité la mention « Publicité ».'),
      h('Corrections et droit de réponse'), p('Quand nous nous trompons, nous corrigeons l’article lui-même et le signalons à la fin. Toute personne citée peut exercer son droit de réponse via la page Contact.'),
      h('Dignité et vie privée'), p('Nous respectons la vie privée et la dignité des personnes, et restons prudents avec les photos et les noms de mineurs.'),
    ],
  },
};

async function main() {
  console.log(APPLY ? 'APPLYING changes to the live database\n' : 'DRY RUN (add --apply to write)\n');

  // Sections
  const cats = await must(db.from('categories').select('id, slug, parent_id, position'), 'categories');
  for (const s of NEW_SECTIONS) {
    if (cats.some((c) => c.slug === s.slug)) { log(`section ${s.slug} exists`); continue; }
    if (APPLY) cats.push(...(await must(db.from('categories').insert({ ...s, show_in_nav: true, position: 99 }).select('id, slug, parent_id, position'), `section ${s.slug}`)));
    log(`section ${s.name_ar} (${s.slug})`);
  }
  if (APPLY) for (const [i, slug] of ORDER.entries()) { const c = cats.find((x) => x.slug === slug && !x.parent_id); if (c) await must(db.from('categories').update({ position: i + 1 }).eq('id', c.id), 'order'); }
  log(`section order: ${ORDER.join(' · ')}`);

  // Towns
  const tags = await must(db.from('tags').select('id, slug, kind'), 'tags');
  for (const [slug, ar, fr] of TOWNS) {
    if (tags.some((t) => t.slug === slug)) { log(`town ${slug} exists`); continue; }
    if (APPLY) tags.push(...(await must(db.from('tags').insert({ slug, name_ar: ar, name_fr: fr, kind: 'place' }).select('id, slug, kind'), `tag ${slug}`)));
    log(`town tag ${ar} (${slug})`);
  }
  const tagId = (slug: string) => tags.find((t) => t.slug === slug)?.id ?? (APPLY ? (() => { throw new Error(`tag ${slug}`); })() : 'new');

  // Articles
  const arts = await must(db.from('articles').select('id, public_id, category_id').in('public_id', [...new Set([...ADD_TAGS.map((x) => x[0]), ...MOVE.map((x) => x[0]), ...EVENTS.map((e) => e.pid)])]), 'articles');
  const art = (pid: number) => arts.find((a) => a.public_id === pid) ?? (() => { throw new Error(`article ${pid}`); })();
  for (const [pid, slug] of ADD_TAGS) {
    if (APPLY) await must(db.from('article_tags').upsert({ article_id: art(pid).id, tag_id: tagId(slug) }, { onConflict: 'article_id,tag_id', ignoreDuplicates: true }), `tag ${pid}`);
    log(`article ${pid}: + tag ${slug}`);
  }
  const catId = (slug: string) => cats.find((c) => c.slug === slug)?.id ?? (APPLY ? (() => { throw new Error(`section ${slug}`); })() : 'new');
  for (const [pid, to, extra] of MOVE) {
    if (APPLY) {
      await must(db.from('articles').update({ category_id: catId(to) }).eq('id', art(pid).id), `move ${pid}`);
      await must(db.from('article_categories').delete().eq('article_id', art(pid).id).eq('category_id', catId(to)), `extra ${pid}`);
      await must(db.from('article_categories').upsert({ article_id: art(pid).id, category_id: catId(extra) }, { onConflict: 'article_id,category_id', ignoreDuplicates: true }), `extra ${pid}`);
    }
    log(`article ${pid}: section → ${to} (also in ${extra})`);
  }

  // Calendar
  const admin = await must(db.from('profiles').select('id').eq('role', 'admin').eq('is_demo', false).limit(1).single(), 'admin');
  const have = APPLY ? await must(db.from('events').select('starts_on, title_ar'), 'events') : [];
  const known = new Set(have.map((e) => `${e.starts_on}|${e.title_ar}`));
  for (const e of EVENTS) {
    if (known.has(`${e.starts_on}|${e.title_ar}`)) { log(`event exists: ${e.title_ar}`); continue; }
    if (APPLY) await must(db.from('events').insert({ kind: 'event', title_ar: e.title_ar, starts_on: e.starts_on, ends_on: e.ends_on ?? null, start_time: e.start_time ?? null, end_time: e.end_time ?? null, place: e.place ?? null, town_tag_id: e.town ? tagId(e.town) : null, article_id: art(e.pid).id, created_by: admin.id }), `event ${e.title_ar}`);
    log(`event ${e.starts_on}${e.ends_on ? `→${e.ends_on}` : ''}${e.start_time ? ` ${e.start_time}` : ''} ${e.title_ar} (article ${e.pid})`);
  }
  for (const y of [2026, 2027]) for (const hday of tunisianHolidays(y)) {
    if ((hday.ends_on ?? hday.starts_on) < '2026-10-03') continue; // already past
    if (known.has(`${hday.starts_on}|${hday.title_ar}`)) continue;
    if (APPLY) await must(db.from('events').insert({ ...hday, kind: 'holiday', created_by: admin.id }), `holiday ${hday.title_ar}`);
    log(`holiday ${hday.starts_on}${hday.ends_on ? `→${hday.ends_on}` : ''} ${hday.title_ar}${hday.is_estimate ? ' (approximate)' : ''}`);
  }

  // Homepage: the agenda block after the latest news (Arabic and French homepages)
  const secs = await must(db.from('homepage_sections').select('id, type, position, locale').order('position'), 'homepage');
  if (secs.some((s) => (s.type as string) === 'agenda')) log('homepage agenda block exists');
  else {
    if (APPLY) {
      for (const s of secs.filter((x) => x.position >= 4).reverse()) await must(db.from('homepage_sections').update({ position: s.position + 1 }).eq('id', s.id), 'shift');
      await must(db.from('homepage_sections').insert({ type: 'agenda', position: 4, locale: 'both', config: { count: 5 }, is_active: true }), 'agenda block');
    }
    log('homepage: «المواعيد القادمة» block after the latest news');
  }

  // Pages (stay drafts)
  for (const [slug, byLang] of Object.entries(PAGES)) for (const lang of ['ar', 'fr'] as const) {
    const doc: PMNode = { type: 'doc', content: byLang[lang] };
    const body_html = sanitizeArticleHtml(renderDoc(doc, { locale: lang }));
    if (APPLY) await must(db.from('pages').update({ body_json: doc, body_html }).eq('slug', slug).eq('language', lang).eq('status', 'draft'), `page ${slug}`);
    log(`page draft ${lang}/${slug} written (still a draft)`);
  }

  if (APPLY && process.env.PROD_REVALIDATE_SECRET) {
    const r = await fetch('https://www.elborj.workers.dev/api/revalidate', { method: 'POST', headers: { 'x-revalidate-secret': process.env.PROD_REVALIDATE_SECRET, 'content-type': 'application/json' }, body: JSON.stringify({ all: true }) });
    log(`site cache refreshed (HTTP ${r.status})`);
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
