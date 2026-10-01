// Client-side campaign selection (docs/07 "Direct sponsor ads"): pages are cached, so
// the rotation between running campaigns happens in the browser.

export interface Candidate {
  id: string;
  weight: number;
  starts_at: string;
  ends_at: string | null;
}

/** Campaigns running at `now` (the cached page may be older than a start/end time). */
export function running<T extends Candidate>(list: T[], now: number): T[] {
  return list.filter((c) => Date.parse(c.starts_at) <= now && (!c.ends_at || Date.parse(c.ends_at) > now));
}

/** Weighted random pick; `r` in [0, 1). Returns -1 for an empty list. */
export function weightedIndex(weights: number[], r: number): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (!total) return -1;
  let x = r * total;
  for (let i = 0; i < weights.length; i++) {
    x -= Math.max(0, weights[i]!);
    if (x < 0) return i;
  }
  return weights.length - 1;
}

/** Category targeting: no targets = everywhere; otherwise the page's section or its parent. */
export function matchesSection(targets: string[] | null, categoryId: string | null | undefined, parentId: string | null | undefined): boolean {
  if (!targets || targets.length === 0) return true;
  return (!!categoryId && targets.includes(categoryId)) || (!!parentId && targets.includes(parentId));
}
