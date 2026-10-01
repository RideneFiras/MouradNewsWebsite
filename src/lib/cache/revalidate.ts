import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { ALL_TAGS } from '@/lib/data/cache';

/** Expire cache tags immediately (next request renders fresh data). */
export function expireTags(tags: readonly string[]) {
  for (const t of tags) revalidateTag(t, { expire: 0 });
}

/** Everything public: used by "regenerate cache" in the admin system page. */
export function expireEverything() {
  expireTags(ALL_TAGS);
  revalidatePath('/', 'layout');
}
