# src/components/admin: the admin (CMS) screens

Client components rendered by the server pages in `src/app/[locale]/admin/(panel)/`. They call
server actions from `src/lib/admin/` and show `ActionResult` errors (`{ ok: false, error }`)
with messages from `src/messages/admin.{ar,fr}.json`. Arabic UI by default (`profiles.ui_locale`).

Look: white panels, 4 px radius, 1 px borders, no shadows. Hand-written primitives in
`globals.css` (`.a-panel`, `.a-btn`, `.a-input`, `.a-select`, `.a-label`); native `<dialog>`
(`Dialog.tsx`). No shadcn/ui, no drag-and-drop library (`Sortable.tsx`: HTML5 drag + ▲/▼ buttons).

| Area | Components |
|---|---|
| Shell | `Sidebar.tsx`, `Dialog.tsx`, `Sortable.tsx`, `RegenerateButton.tsx` (expire all caches) |
| Auth | `AuthCard.tsx`, `LoginForm.tsx`, `ForgotForm.tsx`, `ResetForm.tsx` |
| Articles | `ArticlesTable.tsx` (list, bulk actions), `editor/ArticleEditor.tsx` (the editor: autosave every 15 s, local backup, publish/schedule, revisions, preview link, share after publish), `editor/RichText.tsx` (Tiptap, word/Facebook paste cleaning), `editor/nodes.tsx` (pull quote, figure, gallery, embed, read-also) |
| Media | `MediaLibrary.tsx`, `MediaPicker.tsx`, `FocalPicker.tsx`, `useUpload.ts` (resize to WebP in the browser, signed upload URLs, no Supabase JS in the browser) |
| Taxonomy & site | `CategoriesManager.tsx`, `TagsManager.tsx`, `EventsManager.tsx` (الأجندة: events, holidays), `FormatsManager.tsx`, `MenusManager.tsx`, `PageEditor.tsx`, `HomepageBuilder.tsx`, `SettingsForm.tsx`, `MediaKitForm.tsx`, `TeamManager.tsx`, `ProfileForm.tsx`, `MessagesList.tsx` |
| Ads | `ads/SlotsManager.tsx`, `ads/CampaignForm.tsx`, `ads/AdsenseForm.tsx` (AdSense ID + ads.txt) |
| Statistics | `stats/ui.tsx` (tabs, tiles, range picker, metric definitions via Popover API), `stats/LineChart.tsx` (SVG, mirrored right-to-left in Arabic, keyboard crosshair, table view), `stats/TrendCharts.tsx`, `stats/Sparkline.tsx`, `stats/BarList.tsx`, `stats/ArticleStatsTable.tsx`, `stats/DashboardStats.tsx`, `stats/SocialManager.tsx` (the only manual numbers, always labelled as such) |

Rules:
- **Tiptap is client-only** (`next/dynamic`, `ssr: false`) so it never enters the Worker bundle.
  Check `pnpm bundle:size` after adding any dependency here.
- Statistics components are **read-only**. No input may change a computed number.
- Authors see only their own articles and stats; the server and RLS enforce it, the UI just hides.
- Admin `<Link>`s use `prefetch={false}`.
