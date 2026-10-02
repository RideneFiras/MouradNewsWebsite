import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue';

// Free-plan friendly cache setup (see docs/DECISIONS.md, "Caching" and "Deployment"):
// - Rendered pages: R2 incremental cache (free tier: 10 GB, 1M writes / 10M reads per
//   month), fronted by the Cache API so most reads never hit R2.
// - Data entries (`unstable_cache`, cache type "fetch"): kept in the Worker isolate's
//   memory. The Workers Free plan allows 50 subrequests per request and every Cache API /
//   R2 call counts; storing each data entry in R2 + Cache API cost ~5 subrequests per
//   lookup and the homepage went over 50 on its first render. Memory costs none. Entries
//   are still checked against the D1 tag cache (admin edits show at once) and expire
//   after their revalidate time. On Workers Paid, see docs/WORKERS-PAID.md to switch back.
// - D1 tag cache for revalidateTag (free tier: 5M reads / 100k writes per day).
// - SQLite-backed Durable Object queue for background revalidation (Workers Free).
// - Cache interception: cached pages are served before Next.js boots, using the page's own
//   revalidate (60 s). Without it, Next only knows a page's lifetime from the prerender
//   manifest (empty here: nothing is prerendered at build) or from an earlier render in the
//   same isolate, so on Workers it treated pages as fresh for 1 s and re-rendered on almost
//   every visit (CPU, and one R2 write per visit).
const pageCache = withRegionalCache(r2IncrementalCache, { mode: 'long-lived' });

type IncrementalCache = Parameters<typeof withRegionalCache>[0];
type DataEntry = { value: unknown; lastModified: number };
const MAX_DATA_ENTRIES = 300;
const dataEntries = new Map<string, DataEntry>();

// The generic signatures of IncrementalCache don't narrow per cache type, hence the cast.
const incrementalCache = {
  name: `memory-data+${pageCache.name}`,
  async get(key: string, cacheType?: 'cache' | 'fetch' | 'composable') {
    if (cacheType !== 'fetch') return pageCache.get(key, cacheType as 'cache');
    const entry = dataEntries.get(key);
    return entry ? { ...entry } : null;
  },
  async set(key: string, value: Parameters<IncrementalCache['set']>[1], cacheType?: 'cache' | 'fetch' | 'composable') {
    if (cacheType !== 'fetch') return pageCache.set(key, value, cacheType as 'cache');
    dataEntries.delete(key);
    dataEntries.set(key, { value, lastModified: Date.now() });
    // Oldest first: drop the least recently written entry.
    if (dataEntries.size > MAX_DATA_ENTRIES) dataEntries.delete(dataEntries.keys().next().value as string);
  },
  async delete(key: string) {
    dataEntries.delete(key);
    return pageCache.delete(key);
  },
} as unknown as IncrementalCache;

export default defineCloudflareConfig({
  incrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
  enableCacheInterception: true,
});
