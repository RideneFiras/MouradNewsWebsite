// One date helper for the whole site (docs/02-design-system.md, "Dates and times").
// Tunisian (Maghrebi) month names, Western digits, Africa/Tunis time zone.

export type Locale = 'ar' | 'fr';
export type DateStyle = 'full' | 'short' | 'time' | 'relative' | 'day';

export const TIME_ZONE = 'Africa/Tunis';

const AR_MONTHS = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const AR_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const FR_MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const FR_WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export interface TunisParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  weekday: 'short',
  hourCycle: 'h23',
});
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

/** Calendar parts of an instant, as seen in Tunisia. */
export function tunisParts(input: Date | string | number): TunisParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(toDate(input))) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    weekday: WEEKDAY_INDEX[map.weekday ?? 'Sun'] ?? 0,
  };
}

/** "YYYY-MM-DD" of the Tunisian calendar day. */
export function tunisDayKey(input: Date | string | number): string {
  const p = tunisParts(input);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

function arPlural(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  const mod = n % 100;
  if (mod >= 3 && mod <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

function relative(date: Date, locale: Locale, now: Date): string | null {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0 || diffMs >= 24 * 3600 * 1000) return null;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return locale === 'ar' ? 'الآن' : 'à l’instant';
  if (minutes < 60) {
    return locale === 'ar'
      ? `منذ ${arPlural(minutes, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة')}`
      : `il y a ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  return locale === 'ar' ? `منذ ${arPlural(hours, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}` : `il y a ${hours} h`;
}

export function formatDate(
  input: Date | string | number,
  locale: Locale,
  style: DateStyle = 'short',
  opts: { now?: Date } = {},
): string {
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return '';
  const p = tunisParts(date);
  switch (style) {
    case 'time':
      return `${pad(p.hour)}:${pad(p.minute)}`;
    case 'relative': {
      const rel = relative(date, locale, opts.now ?? new Date());
      return rel ?? formatDate(date, locale, 'short');
    }
    case 'full':
      return locale === 'ar'
        ? `${AR_WEEKDAYS[p.weekday]} ${p.day} ${AR_MONTHS[p.month - 1]} ${p.year}`
        : `${FR_WEEKDAYS[p.weekday]} ${p.day} ${FR_MONTHS[p.month - 1]} ${p.year}`;
    case 'day':
      // Day header without the year when it is the current year.
      return locale === 'ar'
        ? `${AR_WEEKDAYS[p.weekday]} ${p.day} ${AR_MONTHS[p.month - 1]}`
        : `${FR_WEEKDAYS[p.weekday]} ${p.day} ${FR_MONTHS[p.month - 1]}`;
    case 'short':
    default:
      return locale === 'ar'
        ? `${p.day} ${AR_MONTHS[p.month - 1]} ${p.year}`
        : `${p.day} ${FR_MONTHS_SHORT[p.month - 1]} ${p.year}`;
  }
}

/** "HH:MM" today (Tunis), otherwise the short date — used in headline lists. */
export function formatListTime(input: Date | string | number, locale: Locale, now: Date = new Date()): string {
  return tunisDayKey(input) === tunisDayKey(now) ? formatDate(input, locale, 'time') : formatDate(input, locale, 'short');
}

/**
 * Hijri date (Umm al-Qura) with Western digits, e.g. «19 ربيع الآخر 1448».
 * Tunisia's official Hijri date can differ by a day: offsetDays (−2..2) corrects it.
 */
export function formatHijri(input: Date | string | number, locale: Locale, offsetDays = 0): string {
  const date = new Date(toDate(input).getTime() + Math.max(-2, Math.min(2, offsetDays)) * 86400000);
  try {
    const fmt = new Intl.DateTimeFormat(`${locale === 'ar' ? 'ar' : 'fr'}-u-ca-islamic-umalqura-nu-latn`, {
      timeZone: TIME_ZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const parts = fmt.formatToParts(date);
    const day = parts.find((x) => x.type === 'day')?.value ?? '';
    const month = parts.find((x) => x.type === 'month')?.value ?? '';
    const year = (parts.find((x) => x.type === 'year')?.value ?? '').replace(/[^\d]/g, '');
    if (!day || !month || !year) return '';
    return `${day} ${month} ${year}`;
  } catch {
    return '';
  }
}

/** ISO timestamp n days before now (kept out of components: render must stay pure). */
export function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

/** Tunisian day keys for today and yesterday. */
export function todayAndYesterday(): { today: string; yesterday: string } {
  const now = Date.now();
  return { today: tunisDayKey(now), yesterday: tunisDayKey(now - 86400000) };
}
