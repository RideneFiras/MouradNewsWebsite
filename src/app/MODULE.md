# src/app: routes (Next.js 16 App Router)

Every page lives under `[locale]` (`ar` default, RTL; `fr`, LTR). `src/middleware.ts` handles
`/` → `/ar` (or `/fr` from the `NEXT_LOCALE` cookie), trailing slashes, `?page=N` → `/page/N`
rewrites (keeps listings cacheable), and the admin session (login redirect, `no-store`).
It's still `middleware.ts`, not `proxy.ts`: OpenNext doesn't support Node middleware yet (DECISIONS.md).

## Layout

```
app/
  layout.tsx            root (minimal); fonts.ts + fonts/ = self-hosted Arabic subsets
  not-found.tsx         global 404
  [locale]/layout.tsx   <html lang dir>, metadata, favicon from settings; notFound() for unknown locales
  [locale]/(public)/    reader site (masthead, footer, tracker, ad slots in layout.tsx)
  [locale]/admin/       (auth)/ login, forgot, reset · (panel)/ everything else
  [locale]/rss.xml      feeds
  api/                  see api/MODULE.md
  robots.txt, sitemap.xml, news-sitemap.xml, sitemaps/[file], ads.txt   route handlers
```

## Public pages (`[locale]/(public)/`)

| Route | Page |
|---|---|
| `page.tsx` | Homepage, built from `homepage_sections` (`src/lib/public/homepage.ts`) |
| `article/[id]/[[...slug]]` | Article. URL key is the numeric `public_id`; a wrong or old slug 301s to the right one, a wrong-language URL to the translation |
| `section/[slug]/[[...rest]]`, `topic/[slug]`, `format/[slug]`, `author/[slug]`, `latest` | Listings (`/page/N` in `rest`) |
| `section/[slug]/rss.xml` | Section feed |
| `search` | Search (`search_articles` RPC); the only listing that renders per request |
| `p/[slug]` | Static pages from the CMS |
| `advertise` | Media kit (live numbers from `media_kit_public()`) |
| `contact` | Contact form → `/api/contact` |
| `preview/article/[id]`, `preview/home` | Signed draft preview, homepage-builder preview (noindex) |
| `[...rest]` | Anything else: redirect from `redirects` table, or 404 |
| `dev/components` | Component gallery for development |

**Caching:** every public route has `export const revalidate = 60` and
`generateStaticParams() { return [] }`. Nothing is prerendered at build; pages render on first
request, then are served from the R2/Cache API page cache (`open-next.config.ts`) and rebuilt in
the background at most every 60 s. Admin edits expire cache tags at once. Don't read
`searchParams`/`cookies()`/`headers()` in a public page: that makes it render on every request
(CPU on the Workers free plan). The public layout checks the locale itself because layouts render in
parallel (`/favicon.ico` used to reach the database as a "language").

## Admin (`[locale]/admin/(panel)/`)

Server components that call `requireStaff(locale, roles?)` (`src/lib/auth/staff.ts`) and render
client components from `src/components/admin/`. Mutations are server actions in `src/lib/admin/`.

| Screen | Roles |
|---|---|
| dashboard (`page.tsx`), articles, articles/[id] (editor), media, profile | all staff (authors see their own) |
| stats (overview), stats/articles, stats/authors, stats/article/[id] | all staff (authors: own articles only, enforced in the RPCs) |
| categories, tags, formats, menus, pages, homepage, messages, stats/audience, sections, sources, social, report | editor, admin |
| settings, ads (+ campaigns, reports), media-kit, team, system | admin |

`stats/export` and `ads/campaigns/[id]/report/csv` are route handlers (CSV, UTF-8 BOM).
Admin links use `prefetch={false}` (each prefetch is a Worker request).

## Adding a public page

1. `[locale]/(public)/<name>/page.tsx` with `revalidate = 60`, `generateStaticParams`, metadata from `src/lib/seo/metadata.ts`.
2. Data through `src/lib/data/queries.ts` (cached, tagged), never a raw Supabase call in the page.
3. Strings in `src/messages/{ar,fr}.json`; RTL first, logical CSS; check the banned list in docs/02.
4. Add it to the sitemap (`sitemaps/[file]`) if it should be indexed.
