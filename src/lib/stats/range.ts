// Date ranges for the statistics screens. Dates are Africa/Tunis calendar days as
// YYYY-MM-DD strings; arithmetic is done in UTC on those strings (no DST issues).

export const RANGE_KEYS = ['today', 'yesterday', '7d', '30d', 'month', 'lastmonth', 'custom'] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export interface StatsRange {
  key: RangeKey;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  days: number;
  /** The range is exactly one calendar month (monthly unique visitors are meaningful). */
  isMonth: boolean;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 400;

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

export const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
export function monthEnd(iso: string): string {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

const valid = (s: string | undefined): s is string => !!s && ISO.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export function resolveRange(params: { range?: string; from?: string; to?: string }, today: string): StatsRange {
  const key = (RANGE_KEYS as readonly string[]).includes(params.range ?? '') ? (params.range as RangeKey) : '7d';
  let from: string;
  let to: string;
  switch (key) {
    case 'today':
      from = to = today;
      break;
    case 'yesterday':
      from = to = addDays(today, -1);
      break;
    case '30d':
      from = addDays(today, -29);
      to = today;
      break;
    case 'month':
      from = monthStart(today);
      to = monthEnd(today);
      break;
    case 'lastmonth':
      to = addDays(monthStart(today), -1);
      from = monthStart(to);
      break;
    case 'custom': {
      if (valid(params.from) && valid(params.to)) {
        from = params.from <= params.to ? params.from : params.to;
        to = params.from <= params.to ? params.to : params.from;
        if (to > today) to = today;
        if (from > to) from = to;
        if (daysBetween(from, to) > MAX_DAYS) from = addDays(to, -(MAX_DAYS - 1));
      } else {
        from = addDays(today, -6);
        to = today;
      }
      break;
    }
    default:
      from = addDays(today, -6);
      to = today;
  }
  const isMonth = from === monthStart(from) && to === monthEnd(from);
  const days = daysBetween(from, to);
  let prevFrom: string;
  let prevTo: string;
  if (isMonth) {
    prevTo = addDays(from, -1);
    prevFrom = monthStart(prevTo);
  } else {
    prevTo = addDays(from, -1);
    prevFrom = addDays(from, -days);
  }
  return { key, from, to, prevFrom, prevTo, days, isMonth };
}

/** Query string that keeps the current range when moving between stats tabs. */
export function rangeQuery(r: Pick<StatsRange, 'key' | 'from' | 'to'>): string {
  return r.key === 'custom' ? `?range=custom&from=${r.from}&to=${r.to}` : `?range=${r.key}`;
}

/** Relative change in percent, or null when there is no base to compare with. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
