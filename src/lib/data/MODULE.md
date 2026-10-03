# src/lib/data: public data layer and caching

Everything the reader site shows comes from here. Pages never call Supabase directly.

| File | What |
|---|---|
| `queries.ts` | All public reads, each wrapped in `cached(fn, key, tags)`: settings, categories, formats, tags, media, menus, pages, homepage sections, redirects, article cards (`listCards`, `getCardsByIds`), article, translations, most read, search, authors, ad data, media kit numbers |
| `cache.ts` | `cached()` = `unstable_cache` with `revalidate: 60` and tags. `TAGS`: `settings, taxonomy, menus, pages, homepage, articles, authors, ads, stats, redirects` |
| `chrome.ts` | `getChrome(locale)`: everything the masthead and footer need, in one place |
| `settings.ts` | Typed `SiteSettings`, `DEFAULT_SETTINGS` (mirror `supabase/seed.sql`), `mergeSettings`, `pick()` (bilingual fallback) |
| `types.ts` | `ArticleCard`, `ArticleFull`, `Category`, `Tag`, `MenuItem`, `StaticPage`, `HomepageSection`… |
| `preview.ts` | Draft for a signed preview link (service role, server only) |

## How caching works (read before changing anything here)

Three layers, configured in `open-next.config.ts` (why: DECISIONS.md → Deployment):

1. **Whole pages**: R2 + Cache API, served by OpenNext's cache interception before Next boots.
   Fresh for 5 min, then rebuilt in the background on the next visit.
2. **Data entries** (`cached()` here): kept in the Worker isolate's memory (max 300). Not R2, because
   on Workers Free each R2/Cache API call counts towards the 50-subrequest limit per request.
3. **Tags**: D1 (`el-borj-tag-cache`). Admin actions call `expireTags([...])`
   (`src/lib/cache/revalidate.ts`), which marks every page and data entry with that tag stale at once.

Rules:
- Read with `publicClient()` (anon key, RLS for anon). Published content comes from the
  `article_cards` view (one row per article with section, genre, cover, bylines), so a page needs
  1–5 queries. **Keep it that way**: every extra query on a cold render is a subrequest (limit 50).
- Give every new cached function a unique key and the right tags, and expire those tags in the
  admin action that changes the data.
- Throw on Supabase errors (`fail()`); a failed render must not be cached as an empty page.
- PostgREST returns at most 1000 rows per request; paginate (see `src/lib/seo/feeds.ts`).
