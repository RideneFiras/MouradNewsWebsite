# src/components/public: the reader site

Server components by default. The only client components allowed on public pages
(docs/05 "Performance budget"): mobile menu, breaking bar, share row, language switch, nav
highlight, tracker, ad slot picker, GA4/consent, contact form, print button. Keep it that way:
public JS is measured and the Worker CPU is limited.

| Component | What | Client? |
|---|---|---|
| `Masthead.tsx` | Date line (Gregorian + optional Hijri), nameplate, "ears", nav, search, breaking bar | server |
| `Nameplate.tsx` | Calligraphic «البرج» (Aref Ruqaa); with a logo and the text nameplate on, the logo is a mark above (large) or beside (bars) the name; text nameplate off = the logo image alone | server |
| `BreakingBar.tsx` | Red bar, one item at a time, crossfade every 6 s, pauses on hover/focus | client |
| `MobileMenu.tsx`, `NavActive.tsx`, `LangSwitch.tsx` | Mobile sheet; current-section underline; «ع · FR» switch to the same page in the other language | client |
| `Footer.tsx` | Footer menu (or published pages flagged for the footer), legal masthead, social links | server |
| `HomeSections.tsx` | Renders the resolved homepage sections (lead, latest, category blocks, most read, opinion, ads…) | server |
| `story.tsx` | Story units: `LeadStory`, `SecondaryStory`, `ListItem`, `HeadlineItem`, `NumberedItem`, `OpinionItem`, `Kicker`, `MetaLine`, `SectionHeader` | server |
| `ArticleView.tsx` | Article page body: kicker, title, dek, byline, cover, body chunks with in-article ads, tags, read-also | server |
| `Listing.tsx`, `SideColumn.tsx`, `Pagination.tsx` | Section/topic/author/latest listings; side column (ad + most read); «الأحدث / الأقدم» pagination | server |
| `Img.tsx` | Plain `<img srcset>` from pre-made WebP variants, focal point as `object-position`. No `next/image` (no paid optimisation) | server |
| `ShareRow.tsx` | WhatsApp first, Facebook, X, copy link; share links carry `utm_source` | client |
| `AdSlot.tsx` → `AdSlotClient.tsx` | Server part embeds the running campaigns for the slot (cached view); client picks one (weighted), counts impressions, loads AdSense lazily, collapses unfilled units. Labelled «إشهار» / «Publicité» | both |
| `Tracker.tsx` | First-party beacon to `/api/t` (page view + engaged time/scroll). No cookies | client |
| `Analytics.tsx` | GA4 + Consent Mode v2 defaults, only when a GA4 ID is set in the admin | client |
| `MediaKit.tsx` | Public media kit: live audience numbers (read-only), formats, contact | server |
| `ContactForm.tsx`, `StaticPageView.tsx`, `PrintButton.tsx` | Contact form; CMS page; print | mixed |

Rules: logical properties only (RTL first), tokens only (no raw hex), no rounded cards/shadows/
gradients/emoji (docs/02). Text in the article's own language gets `lang`/`dir` when it differs
from the page (`story.tsx` handles this). Icons only from `src/components/shared/icons.tsx`
(thin-stroke set limited to search, menu, close, share targets, play, external link).
