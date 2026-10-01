import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue';

// Free-plan friendly cache setup (see docs/DECISIONS.md, "Caching"):
// - R2 incremental cache (free tier: 10 GB, 1M writes / 10M reads per month),
//   fronted by the Cache API so most reads never hit R2,
// - D1 tag cache for revalidateTag (free tier: 5M reads / 100k writes per day),
// - SQLite-backed Durable Object queue for background revalidation
//   (available on the Workers Free plan).
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  tagCache: d1NextTagCache,
  queue: doQueue,
});
