# src/lib: shared logic

Server-only modules start with `import 'server-only'`. Anything that can run in the browser
must not import those (the build fails if it does, which is the point).

| Folder / file | What | MODULE.md |
|---|---|---|
| `data/` | Public data layer: cached, tagged Supabase queries; types; settings | yes |
| `admin/` | Server actions for every admin screen | yes |
| `analytics/` | First-party tracker: token, source classification, engagement, consent | yes |
| `stats/` | Read-only statistics for the admin (RPC wrappers, date ranges, CSV) | yes |
| `auth/` | `staff.ts`: `getStaff` (per request), `requireStaff` (pages), `assertStaff` + `run` (actions), `ActionError`, `check`/`one` (Supabase result helpers). `actions.ts`: login, logout, forgot, set new password | |
| `supabase/` | Three clients: `public.ts` (anon key, no cookies; public pages), `server.ts` (`sessionClient`, logged-in user, RLS applies; admin), `admin.ts` (**service role, bypasses RLS**; only tracker/ads/contact routes, invites, previews) | |
| `cache/revalidate.ts` | `expireTags(tags)` / `expireEverything()`; call after every admin mutation | |
| `content/` | `render.ts` Tiptap JSON → HTML (allowlist, paragraph direction), `sanitize.ts` (saved HTML), `embeds.ts` (YouTube/Facebook/… allowlist) | |
| `public/` | Homepage resolver (`homepage.ts`: one pooled query feeds all sections, no repeats), article body chunks with ad positions, labels (kicker, bylines), links, media helpers, route helpers (redirect or 404) | |
| `ads/` | Campaign pick (weighted, client side), campaign status, Tunis local time | |
| `seo/` | Metadata, JSON-LD, sitemaps/feeds data, RSS, XML helpers | |
| `security/` | CSP + security headers, per-isolate rate limiter, client IP | |
| `events/` | `holidays.ts`: Tunisian public holidays (fixed civil list + Islamic ones estimated from the Umm al-Qura calendar) | |
| `format/` | `date.ts` (Tunisian month names, Hijri, relative, Africa/Tunis), `number.ts` (U+202F grouping so digits don't swap in RTL) | |
| `i18n/` | next-intl routing (`ar` default, `fr`), `isLocale`, `dirOf` | |
| `slug.ts` | ASCII slugs with Arabic transliteration; articles use a numeric `public_id` instead | |
| `env.ts` / `env.server.ts` | Public config / server secrets (`serverEnv.serviceRoleKey()`, `trackerSecret()`, `revalidateSecret()`) | |

Conventions: zod for every input crossing a boundary; dates are Africa/Tunis (UTC+1, no DST);
bilingual fields `*_ar` / `*_fr` with French falling back to Arabic (`pick()` in `data/settings.ts`).
