# 01 — Product

## One sentence

An independent, Arabic-first online newspaper founded and run by a veteran Tunisian journalist, rooted in the Cap Bon (Nabeul governorate) and Tunisian volleyball, open to any subject he and his contributors want to write about.

## Working name

**البرج — El Borj** (working title, to be confirmed by the owner).

- Reference: the Borj (fortress) of Kélibia, the landmark of the town where the editor lives. Also "watchtower": a place you watch from. A good metaphor for a newspaper, and not limited to one region or topic.
- Tagline (editable): «جريدة إلكترونية مستقلّة» / «Journal électronique indépendant».
- Alternatives the owner may prefer: «الشّراع» (the sail), «المنارة» (the lighthouse).
- **The name, tagline and logo come from `site_settings`.** Nothing in code may contain the name. Renaming the paper must be a settings change, not a code change.

## The editor

- Tunisian journalist with more than 15 years of bylines in national dailies and news sites (print and online), writing mainly in Arabic.
- Beats: culture (theatre, music, books, visual arts, heritage, festivals), sport, and above all **Tunisian volleyball**. Based in Kélibia, Cap Bon.
- Credible and followed locally. His name and reputation are the paper's main asset.
- Not technical. The admin must be usable by someone comfortable with Facebook and Word, nothing more.

Do not put biographical claims about him in seed data beyond: name «مراد ريدان» / «Mourad Ridene», role «رئيس التحرير» / «Rédacteur en chef». He will write his own bio in the admin.

## Positioning

- **A newspaper, not a blog or a portfolio.** It publishes new reporting. It is not an archive of his past work.
- **Cap Bon first:** local news, culture and sport from Kélibia, Nabeul, Menzel Temime, Korba, Hammamet, etc., which national outlets only cover under "جهات".
- **Volleyball as a signature section:** a top-level section, which no national site has.
- **National and anything else** the editor wants: society, economy, opinion, interviews.
- **Credibility as the brand:** transparent masthead, editorial charter, corrections, honest stats.

## Audiences

1. **Readers** in Cap Bon and across Tunisia, plus the diaspora (France especially). Mostly mobile, mostly arriving from Facebook and WhatsApp, on mid-range Android phones and sometimes slow connections.
2. **Contributors**: local correspondents and columnists who publish under their own bylines, with the editor approving.
3. **Advertisers and sponsors**: local businesses, festivals, clubs, municipalities, regional brands. They need believable audience numbers.
4. **The editor**, who runs everything from the admin.

## Business model (in order of expected importance)

1. **Direct sponsorships and ads** sold to local and regional advertisers, backed by a public media kit with live numbers.
2. **Google AdSense** in a few fixed slots, as a baseline.
3. **Sponsored content**, always labeled «محتوى برعاية» / «Contenu sponsorisé».
4. Later: newsletter sponsorship, event coverage packages.

## Languages

- **Arabic (default, RTL)** for UI and most content.
- **French (LTR)** as a full second interface, and for articles written in French.
- Content language is per article. An article can have a linked translation, but doesn't need one. See `03-architecture.md` § i18n.

## Roles

| Role | Who | Can |
|---|---|---|
| `admin` | Editor-in-chief (and Firas as technical admin) | Everything, including settings, users, ads and all stats |
| `editor` | Trusted deputy | Write, edit and publish any article; manage categories, tags, homepage, pages; see all stats; cannot manage users, ads or site settings |
| `author` | Contributors / correspondents | Write their own articles and submit them for review; edit their own drafts; see **their own** stats only; cannot publish |

## Scope

### In scope for v1

- Public site: home, category, sub-category, article, author, tag (topic/place/club), latest feed, search, static pages, media kit, RSS, sitemaps
- Admin: article editor with review workflow and scheduling, media library, categories (add, remove, edit, reorder, nest), tags, formats/genres, homepage builder, menus, static pages, site settings, users and roles, ad slots and campaigns, analytics dashboards (site, category, article, author), manual Facebook page stats, media-kit configuration
- First-party analytics + GA4 + AdSense, consent handling for EEA visitors
- Arabic and French interfaces

### Later (Phase 6, optional)

- Newsletter, reader tips inbox («راسلنا بخبر»), volleyball results and standings module, PWA/offline, web push

### Out of scope

- Reader accounts, comments (readers comment on Facebook), paywall, e-commerce, native apps

## Success criteria for launch

- The editor can publish an article with a photo from his phone in under 5 minutes without help.
- The homepage looks like a Tunisian newspaper, not a startup landing page or a WordPress theme.
- Mobile Lighthouse: Performance ≥ 90, Accessibility ≥ 95, SEO = 100 on home and article pages.
- The media kit page shows real, live audience numbers that nobody can edit by hand.
- Total running cost: 0 TND/month on free tiers (domain excepted), with a clear upgrade path.
