---
name: publish-article
description: Publish an article to the El Borj newspaper website from a text (pasted, or a posts/<n>/ folder with post.txt + pictures). Keeps the author's text exactly as written, word for word, and only adds structure (paragraphs, headings, tables, images) and the missing metadata (section, genre, tags, cover, alt text). Use when Firas asks to publish, post, upload or put an article/text/news on the site.
---

# Publish an article on El Borj

You turn a text the owner gives you into an article on the live site, **without changing a
single word of it** except obvious typing slips (see "Typo fixes" below). You decide the *format* (paragraphs, headings, lists, tables, where images go)
and fill the *metadata* the text doesn't give (section, genre, tags, cover, alt text). The
content itself is the journalist's and is never rewritten.

Tool: `scripts/publish-article.ts` (`pnpm -s publish:article …`). It stores the article exactly
like the admin editor does (same editor JSON, same HTML renderer and sanitizer, same WebP image
sizes), so the result can be edited in the admin afterwards.

## The non-negotiable rule: the text stays as written

- Copy every word **exactly**: same wording, same digits (don't convert ٣ ↔ 3), same Latin words
  and odd spellings (e.g. `Avant _Gout` stays `Avant _Gout`), same quotes and dashes, except the
  typo fixes allowed below.
- **Never** rephrase, shorten, translate, summarise, reorder or add sentences inside the body or
  the title. If you notice a probable error of *fact* (a wrong year, a wrong name, a date that
  doesn't match its weekday), **point it out to Firas and ask**; change it only if he says so.

### Typo fixes (allowed since 2026-10-03, only when you are very sure)

Firas allowed fixing minor typing mistakes **when you are very sure** they are slips, not choices:
- spacing around punctuation: `كلمة ،` → `كلمة،`, `2023.وتولى` → `2023. وتولى`, `" نادي"` → `"نادي"`;
  missing space between a number and a word (`11أوت` → `11 أوت`);
- a letter clearly dropped or doubled (`عل الألوان` → `على الألوان`);
- standard hamza spelling: `الى` → `إلى`, hamzat wasl written as qat' (`الإحتفال` → `الاحتفال`,
  `الإنضمام` → `الانضمام`), especially when the text itself spells the word correctly elsewhere;
- a stray character from copy-paste (a lone `-` at a line start), an unclosed bracket whose end
  is obvious.

Never "fix": dialect or spoken forms (`اللي`, `ياهوى`, `راجعين`), names of people/places/events,
style, word choice, grammar you'd merely write differently, missing final full stops, numbers or
dates (those are *facts*: ask). If in doubt, leave it and mention it to Firas.

Every fix goes in the spec's `corrections` list (`{ "from": exact text in source.txt, "to": fixed
text, "why": "…" }`); the body then contains the fixed text. `fidelity` applies the corrections to
the source before comparing, fails if a `from` isn't found, and lists every fix. Show the list to
Firas in the summary (step 7): he approves the fixes together with the rest.
- You may only change *layout*: join lines that are clearly one sentence broken by copy-paste
  (e.g. a line break around a Latin word), split paragraphs where the source has blank lines,
  keep meaningful line breaks inside a paragraph (`\n` in a string becomes a line break), make a
  line a heading when the source clearly uses it as one, bold a label that is clearly a label
  (a date line in a programme), turn clearly tabular data into a table **with the same cells in
  the same order**, place pictures. Collapsing repeated spaces and trimming line ends is fine.
- Every visible field you write yourself (subtitle/dek, kicker) goes in `generated` and must be
  approved by Firas before publishing. Alt text is written by you (it describes the picture for
  blind readers and isn't shown on the page); captions and photo credits only come from Firas.
- The `fidelity` command proves it: it must say **"word for word"** (after the listed typo fixes,
  if any) before you publish.

## Input formats

1. **A folder** `posts/<n>/` (git-ignored) with `post.txt` and pictures. Convention used so far:
   - line 1: the section (e.g. `ثقافة`),
   - next line(s) until the first blank line: the title (it can span 2 lines; join them with a space),
   - then the body.
   Anything missing (genre, tags, subtitle, cover choice…) you fill in.
2. **Text pasted in the chat** plus picture paths (drag a file into the terminal to get its
   path). Pictures pasted directly into the chat have no file path: ask for the file or a folder.
3. Picture URLs: download them first into the post folder (`curl -L -o posts/<n>/img1.jpg <url>`).

If there is no title, ask for one. Don't invent it.

## Steps

1. **Read everything**: `post.txt` (also with `cat -A` to see the real line breaks) and look at
   every picture (Read tool) to understand them.
2. **Live options**: `pnpm -s publish:article options` lists sections (with sub-sections),
   genres, tags and authors from the database. Use only these slugs.
3. **Decide the metadata**:
   - `category`: the section the text names (map the Arabic/French name to its slug). If it names
     a parent and a sub-section clearly fits (e.g. ثقافة + a theatre story → `culture` + extra
     `theatre`), keep the named one as `category` and add the sub-section in `extra_categories`.
     If no section is given, choose the best one.
   - `format` (genre): خبر `news` for announcements and short news, تقرير `report`, حوار
     `interview`, رأي `opinion`, نتائج `results` for scores… pick from the list.
   - `tags`: existing place/club/event tags clearly mentioned (e.g. `nabeul`). Propose new tags
     (`new_tags`) only for clearly important names, and only with Firas's OK.
   - Byline: **`"unsigned": true` by default for now** (Firas asked for no names on the site
     until the legal questions are settled): no «بقلم» line, no author box. Use `authors` (profile
     slugs) or `byline_override` (e.g. «مراسلنا بنابل») only when Firas asks for a signature.
   - `location` (dateline, printed as «قليبية — » before the first paragraph): only if the text
     *starts* with one ("X — …"); then remove it from the first paragraph and set `location`.
     Otherwise leave it empty (the site would print words that aren't in the text).
   - `language`: `ar` or `fr`, by the language of most of the text.
   - `cover`: the most representative picture (main event poster, main photo). Other pictures go
     in the body next to the passage they illustrate (`image`), or together as a `gallery`.
   - `subtitle` (the summary sent with a shared link and shown on the homepage lead; not printed on the article page): if the source has none, write one short factual
     line using only facts from the text, list `"subtitle"` in `generated`, and get approval.
     Firas can also say "no subtitle".
   - `excerpt`, SEO description, slug, reading time: leave empty, the database derives them
     from the text.
   - `status`: `draft` unless Firas says publish now (`published`) or gives a date
     (`scheduled` + `scheduled_for` as `YYYY-MM-DDTHH:MM` Tunis time). `is_breaking`/`is_featured`
     only if asked.
4. **Write the spec** to `posts/<n>/spec.json` (or the scratchpad for pasted text), see the
   format below. Write the original text, without the section line, to `posts/<n>/source.txt`
   (byte-for-byte copy of the rest of `post.txt`, e.g. `tail -n +2 post.txt > source.txt`).
5. **Check**: `pnpm -s publish:article check posts/<n>/spec.json` (validates slugs and images,
   renders the HTML to a preview file, writes nothing).
6. **Fidelity**: `pnpm -s publish:article fidelity posts/<n>/spec.json posts/<n>/source.txt`.
   It must end with "✓ … word for word". If it lists missing or added words, fix the spec (never
   the source) and run it again.
7. **Show Firas a summary** before writing anything: title, subtitle (marked "written by Claude"),
   section(s), genre, tags, byline, status, cover + where each picture goes, alt texts, the layout
   choices you made (joined lines, headings, bold labels, tables), the typo fixes (`corrections`,
   from → to), any other probable error you noticed and left unchanged,
   (left unchanged), and the fidelity result. Ask: draft, publish now, or schedule? Wait for the answer.
8. **Publish**: `pnpm -s publish:article publish posts/<n>/spec.json`. It uploads the pictures
   (WebP 480/960/1600 + original ≤ 2400 px, EXIF removed), inserts the article and its links, and
   prints the admin and public links. Give Firas both links. A published article shows on the
   homepage and lists within about a minute (pages are cached).
9. If something must change after publishing, do it in the admin (link printed), or ask before
   changing the database directly (see `supabase/MODULE.md`). Don't run `publish` twice for the
   same post: it would create a second article.

## Spec format (`spec.json`)

```json
{
  "language": "ar",
  "status": "draft",
  "title": "…exactly as written…",
  "subtitle": "…",
  "generated": ["subtitle"],
  "corrections": [{ "from": "2023.وتولى", "to": "2023. وتولى", "why": "space after full stop" }],
  "category": "culture",
  "extra_categories": ["theatre"],
  "format": "news",
  "tags": ["nabeul"],
  "new_tags": [],
  "unsigned": true,
  "authors": [],
  "location": null,
  "cover": { "file": "posts/1/poster.jpeg", "alt": "…", "caption": "", "credit": "" },
  "body": [
    { "type": "paragraph", "text": "…" },
    { "type": "paragraph", "text": [{ "text": "label", "bold": true }, { "text": "\nline 2\nline 3" }] },
    { "type": "heading", "text": "…", "level": 2 },
    { "type": "quote", "paragraphs": ["…"] },
    { "type": "pullquote", "text": "…" },
    { "type": "list", "ordered": false, "items": ["…", "…"] },
    { "type": "table", "header": true, "rows": [["…", "…"], ["…", "…"]] },
    { "type": "image", "file": "posts/1/photo.jpeg", "alt": "…", "caption": "", "credit": "" },
    { "type": "gallery", "images": [{ "file": "…", "alt": "…" }, { "file": "…", "alt": "…" }] },
    { "type": "embed", "url": "https://www.youtube.com/watch?v=…" },
    { "type": "hr" },
    { "type": "read_also", "href": "/ar/article/12", "title": "…" }
  ]
}
```

Inline text is a string, or a list of runs `{ "text", "bold"?, "italic"?, "link"? }` for bold,
italic and links that exist in the source. `\n` inside a string = line break in the same paragraph.
Embeds: YouTube, Facebook, Instagram, X only.

## Never

- Change or add words in the title or body, beyond the typo fixes listed in `corrections`
  (fidelity must pass).
- Publish without Firas's explicit "publish" (default is `draft`).
- Use demo authors (`demo-*`) or demo tags for real articles.
- Write statistics tables, or touch other articles.
