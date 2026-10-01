# 05 — Public site

All pages: server-rendered, Arabic RTL by default, French LTR at `/fr`. Components and visual rules come from `02-design-system.md`.

## Page map

| Route | Page |
|---|---|
| `/{locale}` | Homepage (built from `homepage_sections`) |
| `/{locale}/latest` | «آخر الأخبار» / «Dernières infos»: chronological feed, all sections |
| `/{locale}/section/{slug}` | Category page (top-level or sub-category) |
| `/{locale}/article/{public_id}/{slug?}` | Article |
| `/{locale}/author/{slug}` | Author page |
| `/{locale}/topic/{slug}` | Tag page (topic, place, club, person, competition, event share this route; the kind changes the intro) |
| `/{locale}/format/{slug}` | All articles of a format (e.g. all interviews) |
| `/{locale}/search?q=` | Search |
| `/{locale}/p/{slug}` | Static page (about, charter, privacy, legal…) |
| `/{locale}/advertise` | Media kit (page of kind `media_kit`, with live stats component) |
| `/{locale}/contact` | Contact page with form |
| `/{locale}/rss.xml`, `/{locale}/section/{slug}/rss.xml` | RSS 2.0 |
| `/sitemap.xml`, `/news-sitemap.xml`, `/robots.txt`, `/ads.txt` | See SEO doc |

Route segment names stay in English for both locales (simpler, stable). Labels are translated.

If `{slug}` in an article URL doesn't match the current slug, 301 to the canonical URL. If the article's language doesn't match the locale, 301 to the right locale (see i18n rules).

## Homepage

Rendered from active `homepage_sections` for the locale (or `both`), ordered by `position`. Each section type has one component:

| Type | Renders |
|---|---|
| `breaking_ticker` | Breaking bar (only if a breaking article is active) |
| `lead` | Lead story + N secondary stories. Lead source: newest `is_featured` published in the last 48h, else newest published. Secondary: next featured or newest, excluding the lead. Desktop layout: lead 8 cols, and if the next section is `latest_list` it sits in the remaining 4 cols on the same row (a "front page" composition). |
| `latest_list` | Time-stamped list (`HH:MM` today, `short date` before), with category kicker, link «كل الأخبار» → `/latest` |
| `category_block` | Section header + layout variant: `one_big_four_list` (default), `feature_plus_list`, `three_columns` (three secondary units with vertical rules), `list_only` |
| `editor_picks` | Featured articles, 3–4 secondary units |
| `most_read` | Numbered list from analytics rollups (window from config), falls back to latest if no data yet |
| `opinion` | Opinion items (format `is_opinion`) with author portraits |
| `format_block` | e.g. all interviews |
| `tag_block` | e.g. a club or a town |
| `ad_slot` | Ad slot component |
| `text_block` | Short editorial text (e.g. a note from the editor), Markdown-lite from settings |

Deduplicate: an article shown in the lead area isn't repeated in blocks lower on the page (keep a `shownIds` set during render; blocks fill with the next articles).

Empty sections (no articles) render nothing.

## Category page

- Header: category name (section-title, large), description, sub-category links as a simple inline list separated by «·».
- First page: one lead unit for the newest article, then a two-column layout on desktop: main column = list of secondary units (image at inline-start, text beside), side column = most read in this category (last 30 days) + ad slot `sidebar_top`.
- Pagination: «الأقدم» / «الأحدث» numbered pages (`?page=2`), 20 per page, `rel=next/prev` links. No infinite scroll.
- A sub-category page lists its own articles; a parent page lists articles in the parent and all its children.

## Article page

Layout (desktop): body column 680px centered in an 8-col main area, side column (4 cols) with: ad `sidebar_top`, «الأكثر قراءة», more from the same section. The side column is sticky only if it's shorter than the article. Mobile: single column; side content moves below the article.

Order of elements is defined in the design system (kicker → H1 → dek → meta → share → cover → body → tags → correction → author box → related → ad).

Details:
- In-article ad slots `in_article_1` and `in_article_2` are inserted after the paragraph numbers in `site_settings.in_article_ads`, only if the article has at least `min_paragraphs` paragraphs and `allow_ads` is true. Never inside quotes, lists, tables or embeds.
- Sponsored articles: «محتوى برعاية [sponsor]» banner above the title with `--paper-2` background; no ads; `rel="sponsored"` on outbound links.
- "Updated" line appears only if `content_updated_at` is set: «نُشر في … · حُدّث في …».
- Reading time: «4 دقائق قراءة» / «4 min de lecture». Arabic plural rules matter: use ICU plural messages (`one`, `two`, `few`, `many`, `other`) in next-intl for minutes, articles, etc. (e.g. «دقيقة واحدة»، «دقيقتان»، «3 دقائق»، «11 دقيقة»).
- Related articles: same tags first, then same category, excluding the current one, published in the last 180 days.
- Tracking beacon (see analytics doc).
- JSON-LD `NewsArticle` (see SEO doc).
- Print stylesheet: hide nav, ads, share, side column; keep nameplate small, title, meta, body, image captions. A newspaper article should print like one.

## Latest feed (`/latest`)

Pure chronological list grouped by day with day headers («اليوم»، «أمس»، then full dates). Each item: time, kicker, headline, optional small thumbnail at inline-end on desktop only. Paginated by 40.

## Author page

Portrait (square, 120px), name, title («رئيس التحرير»), bio, social links, then their articles (list of secondary units, paginated). Opinion columns first if the author writes a regular column. Hidden if `show_public_page = false` (404).

## Tag page

- Name, kind label («مدينة»، «نادٍ»، «مسابقة»…), optional description and image.
- List of articles, paginated.
- For `club` tags in volleyball, show a small header with the club name and a placeholder for future results (Phase 6); for now just the article list.

## Search

- Single search field (also accessible from the header icon, opening a full-width search bar under the masthead).
- Results: list items with highlighted matches (use `ts_headline` or simple client-side mark on the title), filters: language, section, date range («آخر أسبوع»، «آخر شهر»، «آخر سنة»).
- Empty state: a sentence and links to the main sections. No illustration.
- `noindex` on search result pages.

## Static pages

Render `pages.body_html` in the article body style. Page kinds with extra components:
- `contact`: contact form (name, email, subject select: «خبر أو معلومة»، «إشهار»، «تصويب»، «أخرى», message, honeypot field + time-based check, Cloudflare Turnstile if easily added on free tier). Submissions are stored in a `contact_messages` table (add it in Phase 2; staff can read in admin) and optionally emailed later. Also show the masthead contact details.
- `media_kit`: see analytics doc. The page body (editable text) wraps live components: audience numbers, audience breakdown, ad formats/prices from settings, contact CTA.

## 404 and errors

Styled like the rest: nameplate, a short sentence «الصفحة غير موجودة», search field, links to latest news. No illustrations or jokes. 500 page similarly minimal.

## Consent and third-party scripts

- Our own analytics is cookieless and runs for everyone (see analytics doc).
- GA4 and AdSense load according to `site_settings.consent`:
  - Default mode `google_cmp`: Google's own consent message (configured by the owner in the AdSense "Privacy & messaging" section) handles EEA/UK/Switzerland visitors. GA4 uses Consent Mode v2 with default `denied` for EEA regions and `granted` elsewhere (region-specific defaults).
  - Verify Google's current requirements for consent in the EEA at build time and log what you implemented in `DECISIONS.md`.
- Load third-party scripts after the page is interactive (`strategy="afterInteractive"` or `lazyOnload`); they must not hurt LCP.

## Performance budget

- Public page JS: as close to zero client JS as possible. Allowed client components: mobile menu, search toggle, breaking bar rotation, share button (Web Share API), tracker, ad loader, consent.
- LCP < 2.5s, CLS < 0.05, INP < 200ms on a mid-range Android over 4G (Lighthouse mobile).
- Fonts: subset Arabic + Latin, `font-display: swap`, preload only the headline and body weights used above the fold.
