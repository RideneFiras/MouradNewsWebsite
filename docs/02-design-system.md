# 02 — Design system

Read `research/tunisian-press-notes.md` first. This document turns that research into rules.

## Direction in one paragraph

**A printed Tunisian daily, translated honestly to the screen.** Newsprint-warm paper, black ink, one press red. A calligraphic nameplate over a typeset page. Columns separated by hairline rules instead of cards in boxes. Clear hierarchy: one lead story, a few strong secondary stories, then tight lists of headlines with times. Typography does the work; decoration does not. It should feel like it was designed by someone who has held a newspaper, and be calmer and faster than the national portals.

Test for every screen: *if you printed it on newsprint, would it still look like a newspaper page?* If it would look like a SaaS dashboard or a template, redo it.

## Banned patterns (AI/template tells)

Do not ship any of these on the public site. The admin may use a few sparingly (noted below).

- Rounded "cards" with drop shadows, `rounded-xl/2xl`, floating panels, glassmorphism, blur
- Gradients of any kind (backgrounds, text, buttons, overlays), except a plain dark scrim under text on a photo if strictly needed
- Purple, indigo, teal-to-blue, neon, or "brand" violet palettes
- Emoji anywhere in UI or seeded content (🔴 ✨ 🚀 📰 etc.)
- Generic icon sets used decoratively (a lucide icon next to every heading). Icons are allowed only for: search, menu, close, share targets, play (video), external link. Use thin-stroke icons at 18–20px.
- Hero sections, centered marketing copy, "Welcome to…", big CTA buttons on the homepage
- Equal-sized grids of identical image cards with no hierarchy
- Carousels and auto-advancing sliders
- Skeleton shimmer animations on public pages (server-rendered pages don't need them)
- Placeholder images. **If an article has no image, render it as a text-only item.** Never show a grey box or a logo stand-in.
- Truncating headlines with "…". Let headlines wrap; design for 3–4 line Arabic headlines.
- Pill-shaped badges with pastel backgrounds for categories
- Fonts: Inter, Roboto, Poppins, Montserrat, Cairo, Tajawal, Almarai (overused in template Arabic sites)
- Default Tailwind/shadcn look on the public site. shadcn/ui is allowed in the admin only, restyled with these tokens.
- Copy-protection scripts, "disable right click", or anything that fights the reader
- Dark mode toggle in v1 (see Theme)

## Tokens

Define all tokens as CSS custom properties on `:root`, and map them into Tailwind's theme. Components use tokens only, never raw hex values.

### Colour

| Token | Value | Use |
|---|---|---|
| `--paper` | `#F5F1E8` | Page background (warm newsprint) |
| `--paper-2` | `#ECE6D8` | Sponsored-content background, quote blocks, table stripes |
| `--ink` | `#17140F` | Headlines and body text |
| `--ink-2` | `#4B453B` | Secondary text: deks, excerpts, metadata |
| `--ink-3` | `#7A7264` | Tertiary text: timestamps, captions, credits |
| `--rule` | `#CDC5B4` | Hairlines between items and columns |
| `--rule-strong` | `#17140F` | Section rules, nameplate rules |
| `--accent` | `#A3161C` | Press red: «عاجل», kickers, active nav, link hover, section-rule notch |
| `--accent-ink` | `#FFFFFF` | Text on accent backgrounds (breaking bar only) |
| `--focus` | `#0B5CAD` | Keyboard focus outline (accessibility only) |
| `--ok` / `--warn` / `--danger` | `#2F6B3A` / `#9A6B00` / `#A3161C` | Admin status only |

Rules:
- Body text `--ink` on `--paper` must keep contrast ≥ 7:1. Check `--ink-3` ≥ 4.5:1 for small text.
- **One accent colour.** Category colours exist in the database (editable), but on the public site they are used only as a 3px notch on the section rule and the kicker colour, never as backgrounds. Default all category colours to `--accent`.
- Photos are the only large areas of colour.

### Typography

All fonts from Google Fonts, self-hosted via `next/font` (no external font requests at runtime). **Verify each family name, weight and Arabic subset on Google Fonts before use;** if one is unavailable, pick the closest Naskh-style alternative and log it in `DECISIONS.md`.

| Role | Arabic | French / Latin | Notes |
|---|---|---|---|
| Nameplate (logo text until a real logo exists) | **Aref Ruqaa** 700 | Same, Latin name set small in **Markazi Text** 600 | Calligraphic nameplate = strong newspaper signal. Replace with a commissioned calligraphic logo later (SVG upload in settings). |
| Headlines, section titles, pull quotes | **Markazi Text** 600–700 | **Markazi Text** 600–700 | Naskh-rooted, works for both scripts, gives AR/FR pages one voice |
| Article body, excerpts, deks | **Noto Naskh Arabic** 400/500/700 | **Source Serif 4** 400/600 (opsz on) | Long-form reading faces |
| UI: nav, kickers, metadata, buttons, forms, tables, admin | **IBM Plex Sans Arabic** 400/500/600 | **IBM Plex Sans** 400/500/600 | Small sizes, high legibility |

Type scale (mobile → desktop, line-heights tuned for Arabic, which needs more leading than Latin):

| Style | Size | Line height | Font |
|---|---|---|---|
| `lead-headline` | 30 → 46px | 1.25 | Markazi 700 |
| `headline-1` (article page H1) | 30 → 44px | 1.25 | Markazi 700 |
| `headline-2` (secondary stories) | 22 → 28px | 1.3 | Markazi 600 |
| `headline-3` (list items) | 18 → 20px | 1.4 | Markazi 600 |
| `section-title` | 22 → 26px | 1.2 | Markazi 700 |
| `dek` | 18 → 21px | 1.65 | Noto Naskh 400, `--ink-2` |
| `body` (article) | 19 → 20px | 1.9 (AR), 1.65 (FR) | Noto Naskh / Source Serif |
| `excerpt` | 16 → 17px | 1.75 | Noto Naskh 400, `--ink-2` |
| `kicker` | 13 → 14px | 1.2 | Plex Sans Arabic 600, `--accent` |
| `meta` (byline, time) | 13 → 14px | 1.4 | Plex Sans Arabic 400, `--ink-3` |
| `caption` | 13 → 14px | 1.5 | Plex Sans Arabic 400, `--ink-3` |

Typographic rules:
- `text-align: start` everywhere. **Never justify** on the web (no proper Arabic kashida justification in browsers).
- Article body measure: max ~ 680px (≈ 60–75 characters per line in Arabic at 20px).
- No letter-spacing on Arabic (it breaks joining). Kickers in Latin may use `+0.02em`.
- Use real Arabic punctuation: «» quotation marks, the Arabic comma «،» and question mark «؟». In French: «  » with non-breaking spaces (use `&nbsp;` or `U+202F`), apostrophe «’».
- Mixed-direction strings (a French club name inside Arabic text, a score "3-1", a time "21:38") must render correctly: wrap embedded LTR runs with `<bdi>` or `dir="auto"` in components that display user content (titles, tags, metadata).
- **Digits are always Western (0–9)** on both interfaces, as on Tunisian news sites.

### Dates and times (critical detail)

Implement one `formatDate(date, locale, style)` helper used everywhere.

- Arabic months must be Maghrebi/Tunisian: **جانفي، فيفري، مارس، أفريل، ماي، جوان، جويلية، أوت، سبتمبر، أكتوبر، نوفمبر، ديسمبر**. Do not rely on `Intl` defaults for this; use an explicit month array.
- Arabic weekday names: الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة، السبت.
- Styles:
  - `full`: «الخميس 1 أكتوبر 2026» / «jeudi 1 octobre 2026»
  - `short`: «1 أكتوبر 2026» / «1 oct. 2026»
  - `time`: «21:38» (24h, both languages)
  - `relative` for items under 24h: «منذ 25 دقيقة», «منذ 3 ساعات» / «il y a 25 min»; fall back to `short` after 24h.
- The masthead also shows the Hijri date (computed with `Intl.DateTimeFormat` using `calendar: 'islamic-umalqura'`, with `numberingSystem: 'latn'`), e.g. «19 ربيع الآخر 1448». Hijri date can be turned off in settings. Note that Tunisia's official Hijri date may differ by a day from Umm al-Qura; a small "±1 day" offset setting is enough.
- All dates are stored in UTC and displayed in `Africa/Tunis`.

Unit-test this helper.

### Layout grid

- Container: max-width 1240px, side gutter 16px on mobile, 24px on desktop.
- Desktop grid: 12 columns, 24px column gap. Tablet: 8 columns. Mobile: single column.
- **Vertical hairline rules (`1px solid var(--rule)`) separate columns**; horizontal hairlines separate items. Use these instead of boxes or whitespace-only separation.
- Section header pattern: section title, under it a full-width 2px `--rule-strong` line with a 48px × 3px `--accent` notch at the inline-start end. Optional "المزيد ←" (more) link at inline-end in `meta` style. In RTL the arrow points left «←», in LTR it points right «→». Use logical mirroring (`transform: scaleX(-1)` on `[dir=ltr]` or separate glyphs).
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
- Corners: **0 radius** on the public site (images, buttons, inputs). The admin may use 4px.

### Images

- Aspect ratios: lead 3:2, secondary 3:2, thumbnails in lists 1:1 or 4:3. Crop with `object-fit: cover` and a stored focal point (see `media.focal_x/y`).
- Every image has a caption and/or credit in `caption` style below it, never overlaid.
- No filters, no rounded corners, no borders. A 1px `--rule` outline only on images with white backgrounds (logos in sponsor blocks).
- Lazy-load everything except the LCP image (the lead image on home and the cover on article pages), which gets `fetchpriority="high"`.

### Theme

Light only in v1. Structure tokens so a dark theme can be added later by redefining variables. Don't add `prefers-color-scheme` styles now.

### Motion

Nearly none. Allowed: 150ms colour transitions on hover/focus, the breaking bar crossfading between items every 6s (paused on hover/focus, disabled with `prefers-reduced-motion`). No scroll animations, no parallax, no marquee.

## Components

Build these as the shared vocabulary. Each must work in RTL and LTR, and have a story in a `/dev/components` page (dev-only, excluded from production build or protected).

### Masthead (header)

Top to bottom on desktop:
1. **Utility bar** (32px, `meta` style, `--ink-2`): inline-start: full date + Hijri date. Inline-end: language switch «ع · FR» (current language bold, not a dropdown), search icon, social links as text labels ("فيسبوك", "يوتيوب") or small monochrome icons.
2. **Nameplate**, centered: site name in the nameplate font (or uploaded SVG logo), tagline under it in `meta` style. On desktop, optional small "ears" left and right of the nameplate like a print front page: inline-start ear = "the latest" one-liner (latest article headline, linked), inline-end ear = a configurable short text (e.g. "قليبية · الوطن القبلي"). Ears are hidden on mobile.
3. **Double rule:** 3px `--rule-strong` + 2px gap + 1px `--rule-strong` (classic print rule).
4. **Section nav**: top-level categories flagged `show_in_nav`, in `ui` font 15–16px, 600 weight, active item underlined with a 2px `--accent` line. Sub-categories appear in a simple dropdown panel on hover/focus (desktop) with a 1px border, no shadow.
5. **Breaking bar** (only when an article is flagged breaking and not expired): full-width `--accent` background, «عاجل» label in bold, the headline linked in white. One item at a time.

Mobile: compact nameplate (40px tall) with menu button at inline-start and search at inline-end; section nav becomes a **horizontally scrollable strip** under the nameplate (no hamburger-only navigation, since readers jump between sections); full menu in a full-height sheet with sections, sub-sections, pages, language switch.

Header is not sticky on mobile (saves screen space). On desktop, a slim sticky bar (nameplate small + nav) appears after scrolling past the masthead.

### Story units

- **Lead story:** kicker, `lead-headline`, dek (2–3 lines), byline + time, large 3:2 image. On desktop, image and text can sit side by side (image 7 cols, text 5 cols) or stacked; the homepage section config chooses.
- **Secondary story:** 3:2 image (optional), kicker, `headline-2`, excerpt (max 3 lines, clamp allowed for excerpts only), meta line.
- **List item:** time (in `meta`, fixed width column) + `headline-3` + optional kicker. Separated by hairlines. Used for the latest feed, category lists, most read.
- **Numbered item (most read):** large Markazi numeral (32px, `--ink-3`) at inline-start + `headline-3`.
- **Opinion item:** author's small square portrait (56px, grayscale allowed only here as an editorial convention), author name in kicker style, title in `headline-3`, no image.
- **Text-only fallback:** any unit without an image renders cleanly as text. Test every unit with and without image.

### Meta line

`بقلم مراد ريدان · قليبية · 21:38` in `meta`. Byline prefix «بقلم» in Arabic, «Par» in French. Multiple authors joined with «و» / «et». Sponsored items show «محتوى برعاية [sponsor]» instead of a byline prefix, plus the `--paper-2` background on the unit.

### Kicker

Uppercase-free (Arabic has no case), `kicker` style in `--accent`. Shows the article format (حوار، رأي، تحقيق…) if set and not "خبر", otherwise the category name. Keep it one or two words.

### Article page pieces

- Kicker → H1 → dek → meta row (bylines linked to author pages, published time, "updated" time if edited after publish, reading time «4 دقائق قراءة») → share row → cover image with caption/credit → body.
- Body blocks: paragraph, H2, H3, blockquote, **pull quote** (Markazi 600 26px, with a 3px `--accent` rule at inline-start), image with caption/credit, gallery (simple stacked images, no lightbox in v1, or a minimal one), embed (YouTube, Facebook post/video, X), list, table (for results and standings: zebra rows in `--paper-2`, numbers aligned, `ui` font), divider (centered `* * *` or a short rule), "اقرأ أيضا" inline related link.
- Dateline: if `location` is set, the first paragraph starts with the place in bold followed by « — » (e.g. **قليبية —** …). Render it, don't make authors type it.
- After the body: tags (as plain text links separated by «·»), correction note if any (boxed with a 1px rule, titled «تصويب»), author box (portrait, name, short bio, link), related articles (3 list items), ad slot.
- Share row: Facebook, WhatsApp, X, copy link (and Web Share API on mobile when available). Plain monochrome icons with text labels on desktop. WhatsApp must be prominent; it's how Tunisians share.

### Ad slot

- A labeled container: «إشهار» / «Publicité» in `caption` style above, centered, the creative below. Reserve height (min-height per slot size) to avoid layout shift.
- Separated from content by hairlines, never styled to look like editorial content.
- If a slot has nothing to show, it renders nothing (no empty box), but keeps no reserved space either.

### Buttons and forms (public)

Rectangular, 0 radius, 1px `--ink` border, `ui` font 600. Primary = ink background with paper text. Hover = accent. Inputs: 1px `--rule` border, 44px min height, visible focus ring in `--focus`.

### Footer

Built like a print masthead box:
- Nameplate small + tagline
- Column of sections, column of pages (من نحن، الميثاق التحريري، اتصل بنا، أعلن معنا، سياسة الخصوصية)
- **Legal masthead block** from settings: المدير المسؤول، رئيس التحرير، address, phone, email, ad contact. In French: Directeur de la publication, Rédacteur en chef…
- Social links, RSS link
- «جميع الحقوق محفوظة © 2026 [site name]»

## Admin design

The admin is a work tool, not a magazine. Calm and dense:
- Same tokens, `ui` fonts only (Plex Sans Arabic / Plex Sans), white (`#FFFFFF`) content panels on `--paper` background are allowed here, 4px radius, 1px borders, no shadows.
- shadcn/ui primitives are fine but restyled with these tokens (no default zinc/slate look, no purple focus rings).
- Arabic RTL by default with a toggle to French. The editor is a non-technical user: big clear labels, plain-language helper text under fields, no jargon («الوصف المختصر الذي يظهر تحت العنوان» rather than "dek").
- Charts: line and bar charts only, single accent colour for the main series, `--ink-3` for comparison period, no 3D, no pie charts except a simple traffic-source breakdown (prefer a horizontal bar list).

## Accessibility

- WCAG 2.2 AA. Logical heading order (one H1 per page).
- `lang` and `dir` on `<html>` per locale, and `lang`/`dir` on any content block in the other language.
- Visible focus states everywhere. Skip-to-content link.
- Touch targets ≥ 44px.
- Images: alt text required in the admin (in the image's language), captions are not alt text.

## Acceptance checks for design

- Screenshot home, category, article, author, search, media kit and 404 at 375px and 1280px, in Arabic and French. Store under `docs/screenshots/` and review them against this document and the banned list before closing each phase.
- Test with: no images at all, very long Arabic headlines (25+ words), a French article on the Arabic homepage, a headline mixing Arabic and a Latin club name with a score.
