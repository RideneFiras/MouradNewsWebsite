# src/lib/admin: server actions for the admin

Every file is `'use server'` (except client-side helpers noted below). Each exported action
follows the same pattern:

```ts
export async function saveThing(input: unknown): Promise<ActionResult<...>> {
  return run(async () => {
    await assertStaff(['editor', 'admin']);          // role check (throws ActionError)
    const v = Schema.parse(input);                     // zod validation
    const db = await sessionClient();                  // logged-in user: RLS applies
    check(await db.from('things').upsert(v));          // throw on DB error
    expireTags(['taxonomy', 'articles']);              // refresh the public site
  });
}
```

`run()` turns role errors, zod errors and DB/RLS errors into `{ ok: false, error }` for the UI
(`src/lib/auth/staff.ts`). The role is checked here **and** again by RLS in the database.

| File | Actions |
|---|---|
| `articles.ts` | `saveArticle` (draft/review/publish/schedule; renders + sanitizes HTML from editor JSON on save), `deleteDraft`, revisions, `copyArticle` (translation), `bulkArticles`, `createTag`, `searchArticlesForLink` |
| `article-schema.ts` | zod schema of the article form |
| `editor-data.ts` | `loadEditor` (everything the editor screen needs) |
| `taxonomy.ts` | Categories (save, reorder, delete with move), tags (save, delete, merge), formats |
| `site.ts` | Menus, static pages, settings, team (invite, role, deactivate), profile, password, contact messages |
| `homepage.ts`, `homepage-config.ts`, `homepage-types.ts` | Homepage builder save; section config schema; client-safe constants |
| `media.ts` | Signed upload URLs, create/update/delete media, usage check |
| `image-process.ts` | **Client side**: resize to WebP 480/960/1600 + original ≤ 2400 px, drops EXIF |
| `ads.ts` | Ad slots and sponsor campaigns (admin only). Campaigns with numbers can't be deleted, only paused |
| `social.ts` | Manual Facebook/Instagram numbers (the only human-entered statistics, labelled as such) |
| `preview-token.ts` | HMAC-signed draft preview links (7 days) |

Rules:
- Use `sessionClient()` so RLS applies. Use `adminClient()` (service role) only where RLS
  can't express it (invites/deactivation via the Auth admin API), never to bypass a role check.
- After any write that changes what readers see, call `expireTags` with every affected tag.
- Never add an action that writes analytics tables or `ad_daily_stats`.
- Stored HTML is sanitized on save, and the DB trigger `html_is_safe` refuses unsafe HTML anyway.
