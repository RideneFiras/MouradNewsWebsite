import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue';

// Cache setup on Workers Paid (since 2026-10-03; see docs/DECISIONS.md, "Caching", "Deployment"
// and docs/WORKERS-PAID.md):
// - Pages and data entries (`unstable_cache`): R2 incremental cache, fronted by the Cache API
//   so most reads never hit R2. Shared by every Cloudflare location. (On Free, data entries
//   were kept in isolate memory: the 50-subrequest limit made R2 lookups too expensive.)
// - D1 tag cache for revalidateTag (free tier: 5M reads / 100k writes per day).
// - SQLite-backed Durable Object queue for background revalidation.
// - Cache interception: cached pages are served before Next.js boots, using the page's own
//   revalidate (5 min). Without it, Next only knows a page's lifetime from the prerender
//   manifest (empty here: nothing is prerendered at build) or from an earlier render in the
//   same isolate, so on Workers it treated pages as fresh for 1 s and re-rendered on almost
//   every visit (CPU, and one R2 write per visit).
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  tagCache: d1NextTagCache,
  queue: doQueue,
  enableCacheInterception: true,
});
