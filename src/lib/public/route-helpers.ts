import 'server-only';
import { notFound, permanentRedirect } from 'next/navigation';
import { getRedirect } from '@/lib/data/queries';

/** Old URL (renamed slug)? 301 to the new one. Otherwise 404. */
export async function redirectOr404(path: string): Promise<never> {
  const to = await getRedirect(path);
  if (to && to !== path) permanentRedirect(to);
  notFound();
}

/** Parses the optional [...rest] = ['page', 'N'] segment. Returns null for invalid shapes. */
export function pageFromRest(rest: string[] | undefined): number | null {
  if (!rest || rest.length === 0) return 1;
  if (rest.length === 2 && rest[0] === 'page') {
    const n = Number(rest[1]);
    if (Number.isInteger(n) && n >= 2 && n <= 9999) return n;
  }
  return null;
}

export const PAGE_SIZE = 20;
