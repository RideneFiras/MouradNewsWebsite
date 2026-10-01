# 06 — Admin dashboard and CMS

Path: `/{locale}/admin`, Arabic RTL by default, French available. The main user is a non-technical journalist. Every screen should be understandable without training. Use plain Arabic labels and one helper sentence under any field whose purpose isn't obvious.

## Navigation (sidebar on desktop, bottom/drawer nav on mobile)

| Item (AR / FR) | Route | Roles |
|---|---|---|
| الرئيسية / Accueil | `/admin` | all (authors see their own summary) |
| المقالات / Articles | `/admin/articles` | all |
| مقال جديد / Nouvel article | `/admin/articles/new` | all |
| بانتظار المراجعة / À relire | `/admin/articles?status=in_review` | editor, admin (badge with count) |
| الصور / Médiathèque | `/admin/media` | all |
| الأقسام / Rubriques | `/admin/categories` | editor, admin |
| الوسوم / Mots-clés | `/admin/tags` | editor, admin |
| الأصناف الصحفية / Formats | `/admin/formats` | editor, admin |
| الصفحة الرئيسية / Page d'accueil | `/admin/homepage` | editor, admin |
| القوائم / Menus | `/admin/menus` | editor, admin |
| الصفحات / Pages | `/admin/pages` | editor, admin |
| الإحصائيات / Statistiques | `/admin/stats` | all (authors: own only) |
| الإشهار / Publicité | `/admin/ads` | admin |
| ملف المعلنين / Media kit | `/admin/media-kit` | admin |
| الرسائل / Messages | `/admin/messages` | editor, admin |
| الفريق / Équipe | `/admin/team` | admin |
| الإعدادات / Réglages | `/admin/settings` | admin |
| النظام / Système | `/admin/system` | admin |
| ملفي / Mon profil | `/admin/profile` | all |

Mobile matters: the editor will often publish from his phone at an event. Every screen must work at 375px wide, especially the article editor and media upload.

## Dashboard home (`/admin`)

For editor/admin:
- Four number tiles: page views today, unique visitors today, page views last 7 days (with % change vs previous 7 days), average engaged time last 7 days. Each tile has a tiny sparkline.
- "Right now": page views in the last 30 minutes and the top 5 articles in that window (from raw table).
- Top 10 articles in the last 7 days.
- Traffic sources last 7 days (horizontal bar list: فيسبوك، جوجل، مباشر، واتساب…).
- Queue: articles waiting for review, scheduled articles with times, drafts updated recently.
- Facebook page card: last manually entered numbers and a button «تحديث أرقام فيسبوك».

For authors: their own tiles (views, readers, engaged time for their articles), their drafts, articles sent back with notes.

## Articles list

Table with: title, status chip (مسودة، بانتظار المراجعة، مبرمج، منشور، مؤرشف), section, author(s), language, date, views (7d). Filters: status, section, author, language, date range, search by title. Bulk actions (editor/admin): move to section, archive, add tag. Row actions: edit, preview, view on site, duplicate, create translation.

Authors only see their own articles plus published ones (read-only).

## Article editor (most important screen)

Layout: main column (writing) + side panel (settings). On mobile the side panel becomes a "Publication settings" sheet.

Main column fields, in this order:
1. Language selector (العربية / Français), switches the editor direction.
2. Kicker override (optional, small).
3. **Title** (large Markazi-like input, required).
4. **Subtitle / dek** (optional).
5. **Body**: Tiptap editor with a simple toolbar: paragraph, H2, H3, bold, italic, link, quote, pull quote, bulleted/numbered list, image, gallery, embed (paste a YouTube/Facebook/X link), table, divider, "read also" link (search an article and insert). Also paste-cleaning from Word and Facebook (strip styles, keep paragraphs, bold/italic, links). Direction per paragraph follows content (`dir="auto"`), so a French quote inside Arabic text renders correctly.
6. Location (dateline), with suggestions from `place` tags.

Side panel:
- Section (required) + extra sections
- Format (genre)
- Tags (typeahead with "create new" + kind selector)
- Authors (multi-select, default = current user) and byline override
- Cover image: upload / pick from library, caption, credit, alt text, focal point picker
- Excerpt (auto-filled if empty, with a counter, ideal 150–200 chars)
- Flags: featured («في الواجهة»), breaking («عاجل») + duration (default from settings), sponsored + sponsor name, allow ads
- SEO: title, description (prefilled), Google/Facebook preview card
- Correction note
- "Significant update" checkbox (sets `content_updated_at`)
- Translation: link to the article in the other language or «إنشاء ترجمة» which duplicates metadata into a new draft in the other language

Status actions (buttons at the bottom, sticky):
- Author: «حفظ كمسودة», «إرسال للمراجعة».
- Editor/admin: «حفظ», «معاينة», «نشر الآن», «برمجة النشر» (date-time picker in Africa/Tunis time), «إعادة للكاتب مع ملاحظة» (for in_review), «سحب من النشر» (published → draft), «أرشفة».

Behaviour:
- Autosave every 15s and on blur to the draft (and a local backup in `localStorage` in case the network drops; restore prompt on reopen). Show «تم الحفظ 21:38».
- Every save inserts a revision. «السجل» (history) panel lists revisions with author and time; restore creates a new revision.
- Preview opens the public article layout with a "معاينة" banner, using a signed preview token (works for drafts, `noindex`).
- Publishing validation: title, section, at least one author or byline override, cover alt text if a cover is set, sponsor name if sponsored. Show clear Arabic error messages next to the field.
- On publish: generate `body_html` and `body_text` server-side, compute reading time, set `published_at`/`first_published_at`, revalidate caches, and show a success panel with the public link and share buttons (copy link, Facebook, WhatsApp) so the editor can push it to social media immediately.

## Media library

Grid of thumbnails (square crops, this is admin so a grid is fine), search by caption/credit, filter by uploader and date. Upload multiple images at once, from phone camera too (`accept="image/*"`, `capture` optional). Client-side resize/convert as specified in the architecture doc, with a progress bar. Edit: alt (AR/FR), caption, credit, focal point. Delete is blocked if the image is used (show where it is used).

## Categories (`/admin/categories`)

What the owner asked for: add, remove, modify from the dashboard.

- Tree list with drag-and-drop reordering (within siblings) and nesting (max 2 levels). Also arrow buttons for accessibility and mobile.
- Each row: name AR/FR, slug, article count, toggles "في القائمة" (show_in_nav) and "نشط" (is_active), colour swatch, edit, delete.
- Create/edit form: name AR (required), name FR, slug (auto from FR name or transliterated, editable, warns when changing that old links will redirect), parent, description AR/FR, colour (small palette of 6 muted press colours + custom hex), SEO fields.
- Delete: if the category has articles, open a dialog «هذا القسم يحتوي على 23 مقالا. اختر قسما لنقلها إليه» with a select, then move and delete in one transaction. If it has children, ask to move or delete them first.
- Deactivate instead of delete is offered as the safer option in the same dialog.
- Changes revalidate the navigation and affected pages.

## Tags and formats

- Tags: table with kind filter, merge two tags (moves all article links, creates redirect), edit, delete. Featured toggle.
- Formats: same CRUD as categories without nesting; toggles "show as kicker", "opinion style".

## Homepage builder (`/admin/homepage`)

- Tabs: العربية / Français (each locale has its own composition; sections with `locale = both` appear in both).
- Vertical list of section rows: type icon, title, short summary («قسم الوطن القبلي — 5 مقالات — تصميم: كبير + قائمة»), active toggle, edit, delete, drag handle + arrows.
- «إضافة قسم» opens a picker of section types with a sentence explaining each one.
- Each type has a small config form (zod-validated): choose category/tag/format, count, layout variant, title override, ad slot.
- «معاينة» shows the homepage with unsaved changes (draft config held in state, rendered through the same components in a preview route).
- Saving revalidates the homepage.

## Menus

Footer and utility links: list with drag reorder, add link (to a category, page, tag or external URL), labels AR/FR, active toggle.

## Pages

List of static pages per language with status. Same editor as articles but fewer fields (title, body, SEO, kind, show in footer). The media-kit page body is edited here; its numbers come from the media-kit settings (below).

## Statistics (`/admin/stats`)

See `07-analytics-and-monetization.md` for metrics and definitions. Screens:

1. **Overview**: date range picker (اليوم، أمس، 7 أيام، 30 يوما، هذا الشهر، الشهر الماضي، custom), comparison to previous period. Line chart of page views and unique visitors. Tiles: page views, unique visitors (for the range: daily-summed for ≤1 day, monthly-unique when the range is a calendar month, otherwise labeled «مجموع الزوار اليوميين»), engaged time, read-through rate, articles published in the range.
2. **Articles**: sortable table (views, unique visitors, avg engaged time, read-through %, main source, published date, author). Click → article detail: daily views chart since publication, sources, countries, devices, referrers (top hosts), how it was shared (facebook vs whatsapp vs search).
3. **Sections**: views by category and sub-category, articles published per section, avg views per article.
4. **Authors**: per author: articles published, total views, avg views per article, avg engaged time, top articles. (Admins/editors see all; authors see only themselves, through the same screen filtered.)
5. **Sources**: social, search, direct, internal, referral, with top referrer hosts and UTM campaigns.
6. **Audience**: countries (Tunisia vs abroad, top countries), Tunisian vs French interface, devices.
7. **Facebook & social**: the manual entries table and a form to add numbers (date, platform, followers, monthly reach, monthly engagement). Clearly labeled «أرقام مدخلة يدويا من إحصائيات فيسبوك».
8. **Export**: CSV for any table; a printable monthly report (one page, styled like the paper) for sponsors.

There is **no edit button anywhere on statistics**. If a number looks wrong, the only tools are: exclude staff traffic (already on), and a documented bot filter.

## Ads (`/admin/ads`)

- **Slots**: list of slots with mode (off / AdSense / direct sponsor / house ad), AdSense slot ID, reserved size; a preview of where the slot appears (small diagram or link to a page with outlined slots `?show_slots=1` for admins).
- **Campaigns**: create sponsor campaign (sponsor name, slot, dates, desktop and mobile creatives, link, weight, target sections, language). Status: upcoming, running, ended.
- **Sponsor report** per campaign: impressions, clicks, CTR by day, as a printable page and CSV. Numbers from `ad_daily_stats` (read-only).
- **AdSense**: client ID, enable toggle, ads.txt editor with a validity hint («يجب أن يحتوي على السطر الذي تعطيه جوجل»).

## Media kit settings (`/admin/media-kit`)

The owner asked for this to be editable. Editable here:
- Which metrics are shown publicly (checkboxes): monthly page views, monthly unique visitors, average engaged time, % mobile, % Tunisia / % abroad, top sections, Facebook followers (manual, labeled), articles per month.
- Period shown: last full month (default), last 30 days, or last 3 months average.
- Rounding: show exact numbers or rounded («أكثر من 12 ألف»). Rounding may only round **down**.
- Ad formats offered (repeatable list): name AR/FR, description, size/placement, price (optional, can be hidden «حسب الطلب»), show/hide.
- Editor's pitch text (AR/FR), contact person, phone, email, a downloadable PDF version (generated from the page via print stylesheet; a "Download PDF" button that triggers `window.print()` with a clean print layout is enough for v1).
- Preview of the public page.

Not editable: the numbers themselves.

## Messages (`/admin/messages`)

Contact form submissions: list, read/unread, subject filter, mark handled, delete. Show sender email as a mailto link.

## Team (`/admin/team`)

List of users with role, status, articles count, last sign-in. Invite by email with role. Change role. Deactivate/reactivate. Edit public profile of anyone (admin). Can't remove the last admin.

## Settings (`/admin/settings`)

Grouped forms over `site_settings`:
- **Identity**: site name AR/FR, tagline AR/FR, logo upload (SVG/PNG) or text nameplate toggle, favicon, default share image.
- **Masthead & footer**: ears text, legal masthead fields, social links.
- **Date display**: Hijri date on/off, day offset.
- **Content**: content mixing toggles between languages, breaking default duration, in-article ad positions.
- **Integrations**: GA4 measurement ID, AdSense client ID + enable, consent mode.
- **Analytics**: raw data retention days (min 35 so a full month of unique visitors can be computed, max 180), exclude logged-in staff (always on; shown as info).

## Profile (`/admin/profile`)

Own public profile: names, title, bio AR/FR, portrait, social links, password change, interface language preference.

## System (`/admin/system`)

Read-only: DB size vs 500 MB, storage vs 1 GB, raw analytics rows, last rollup status, Worker build time/version, a «إعادة توليد الذاكرة المؤقتة» button that revalidates all public tags (admin only).
