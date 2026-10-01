# Research notes: how Tunisian news sites look and work

Collected October 2026 to ground the design. These notes summarize what was observed on live homepages. They are not a style to copy; they are the context the design reacts to.

## Sites studied

| Site | Type | Languages | Platform signals |
|---|---|---|---|
| Assabah News (assabahnews.tn) | Online arm of the daily الصباح (Dar Assabah) | AR (+ sister FR paper Le Temps) | Joomla modules, sliders, tabbed listings |
| Al Chourouk (alchourouk.com) | Online arm of the daily الشروق (Dar Al Anwar) | AR | Drupal, carousel, load-more feed |
| La Presse (lapresse.tn) | Online arm of the francophone daily founded 1936 | FR | WordPress + Elementor |
| Inkyfada (inkyfada.com) | Independent non-profit, long-form, data | AR / FR / EN | WordPress, custom theme, membership |
| Nawaat (nawaat.org) | Independent, since 2004, magazine + video | AR / FR / EN mixed feed | WordPress, custom theme, Patreon |

## What the traditional dailies do (Assabah, Chourouk, La Presse)

**Navigation.** Long category bars with nested sub-menus. The recurring top-level set across Arabic dailies:
وطنية · جهات / جهاتنا · سياسة · مجتمع · اقتصاد · عالمية / أخبار العالم · رياضة · ثقافة (فنون، أدب) · فيديو · طقس.
Sport is usually split into كرة قدم / رياضة جماعية / رياضة فردية. Volleyball never has its own section; it sits inside "رياضة جماعية".

**Homepage blocks, in order (typical).**
1. A timestamped "latest news" feed (أحدث الأخبار), each item shown as `HH:MM` + date + category label.
2. A lead slider of 4–10 big stories with image, headline and a 2-line excerpt.
3. Repeated category blocks (الوطنية، اقتصاد و اعمال، اخبار العالم، فيديو، ثقافة، رياضة، تحقيقات), each with 4–6 image cards.
4. The editorial (الافتتاحية) is a named, recurring institution, e.g. Chourouk's daily column "مع الشروق".
5. "Corporate news" (اخبار المؤسسات), i.e. paid or press-release content for banks and telecoms, sits in its own section.
6. A link to buy the PDF/print edition (إشترك في النسخة الرقمية).

**Advertising.** Direct banners from Tunisian banks and telecoms (e.g. a 300×600 skyscraper from a bank on Assabah). Ad contact details (phone, fax, email for إعلانات) are printed in the footer like in print.

**Footer as masthead.** Address, phone, fax, ad desk contact, and the legally responsible people: المفوض / المدير المسؤول and رئيس التحرير. This is a print convention carried online, and readers associate it with a "real" newspaper.

**Dates and numbers.** Tunisian Arabic sites use Western digits (0–9) and Maghrebi month names: جانفي، فيفري، مارس، أفريل، ماي، جوان، جويلية، أوت، سبتمبر، أكتوبر، نوفمبر، ديسمبر. Dates are written like "الأربعاء، 30 سبتمبر 2026" and times as 24h "21:38". Using Levantine/Gulf month names (يونيو، يوليو) or Eastern digits (٢٠٢٦) would immediately look foreign.

**Weak points (what we should not repeat).**
- Everything is a slider or a grid of identical image cards, so nothing has hierarchy.
- Many items have placeholder images ("nophoto.jpg") because the template demands an image for every card.
- Emoji in headlines (🔴 on video titles) and decorative module icons.
- Broken or truncated headlines ("...") because cards have fixed heights.
- Copy-protection scripts ("You cannot copy content of this page").
- Heavy, slow pages: page builders, sliders, multiple tag managers.
- Dead social links (Google+ still listed on Chourouk).

## What the independents do differently (Inkyfada, Nawaat)

- **Genre labels instead of only topics:** تحقيق، روبرتاج، بورتريه، حوار، رسوم بيانية، نقطة نظام. The label sits above the headline like a kicker.
- **Author names are prominent** and link to author pages. Multiple authors are common.
- **Language switch is minimal**: Nawaat uses `Fr · En · ع` in the header. Nawaat mixes languages in one feed; Inkyfada keeps one feed per language and links translations.
- **Recurring named rubrics** (Inkyfada's "سطوشي", Nawaat's "نواة في دقيقة") give readers a reason to come back.
- **Transparency pages:** editorial charter in three languages, finances page, AI-use policy, team page.
- **Most-read list with a stated method** ("in the last seven days").
- **Newsletter signup** and a membership pitch.
- **Long, confident excerpts**: they show 2–4 full sentences rather than truncated one-liners.

## Arabic newspaper typography

- Body text in Arabic newspapers is almost always a Naskh-derived face, because Naskh has been the print standard since the beginning of Arabic printing. Headline faces vary more.
- Commercial newspaper families exist (Boutros Text / Boutros News H1, used by Al-Jazirah; Greta Arabic by Typotheque), but they are paid. Free options on Google Fonts that stay in the Naskh tradition: Noto Naskh Arabic, Markazi Text, Amiri. Kufi-style faces read as "modern/tech" and are overused in template sites.
- Many Arabic mastheads are calligraphic (Thuluth, Diwani, Ruqaa) while everything below is typeset. That contrast is a strong "newspaper" signal.

## Local landscape

No dedicated, well-maintained online newspaper for the Cap Bon (Nabeul governorate) showed up in searches. National sites cover the region under "جهات". This is worth double-checking manually before launch, but it supports a "Cap Bon first, open to everything" positioning.

## Sources

- https://www.assabahnews.tn/ar
- https://www.alchourouk.com/
- https://www.lapresse.tn/
- https://inkyfada.com/ar/
- https://nawaat.org/
- https://www.typotheque.com/articles/the-influences-of-greta-arabic
- https://boutrosfonts.com/Boutros-Text.html
- https://tunisia.mom-rsf.org/en/media/online/
