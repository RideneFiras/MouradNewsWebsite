# src/lib/stats: statistics for the admin (read-only)

| File | What |
|---|---|
| `data.ts` | Typed wrappers around the stats RPCs (`stats_overview`, `stats_timeseries`, `stats_top_articles`, `stats_breakdown`, `stats_categories`, `stats_authors`, `stats_article_detail`, `stats_realtime`, `my_summary`, …). Called with `sessionClient()`; every RPC checks the caller's role and limits authors to their own articles |
| `range.ts` | Date ranges (today, yesterday, 7d, 30d, this month, last month, custom) as Africa/Tunis calendar days; comparison period; `pctChange` |
| `page.ts` | `statsContext()`: role check + "today" in Tunis + selected range, for every stats screen |
| `csv.ts` | CSV export (UTF-8 BOM for Excel; cells starting with `= + - @` are prefixed against CSV injection) |

Numbers come from rollups (`analytics_daily*`), refreshed hourly and nightly by cron, so "today"
can lag by up to an hour; `stats_realtime` reads raw rows for the last minutes.
Definitions shown in the UI (page views, visitors, engaged time, read rate) are in
`docs/07-analytics-and-monetization.md`; keep the UI text and the SQL in sync.
Nothing here writes. `run_rollup` (admin «النظام») only recomputes from raw data.
