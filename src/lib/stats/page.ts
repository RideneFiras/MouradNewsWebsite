import 'server-only';
import { isEditor, requireStaff, type Staff } from '@/lib/auth/staff';
import { resolveRange, rangeQuery, type StatsRange } from './range';
import { tunisToday } from './data';

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Common setup of a statistics screen: role check, Tunis "today", the selected range. */
export async function statsContext(params: Promise<{ locale: string }>, searchParams: SearchParams, roles?: Staff['role'][]) {
  const { locale: l } = await params;
  const locale = (l === 'fr' ? 'fr' : 'ar') as 'ar' | 'fr';
  const staff = await requireStaff(locale, roles);
  const sp = await searchParams;
  const today = await tunisToday();
  const range: StatsRange = resolveRange({ range: one(sp.range), from: one(sp.from), to: one(sp.to) }, today);
  return { locale, staff, editor: isEditor(staff), sp, today, range, query: rangeQuery(range) };
}
