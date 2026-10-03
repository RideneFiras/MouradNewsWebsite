// Tunisian public holidays, computed here (no outside service).
//
// Civil holidays have fixed dates (same list as the open Nager.Date dataset for TN, checked
// 2026-10-03). Islamic holidays follow the moon: Tunisia fixes them by the Mufti's
// announcement, which no API knows in advance. They are computed from the Umm al-Qura Hijri
// calendar (the same one as the masthead date, with the same day offset) and stored as
// estimates; the editor confirms each one in the admin after the announcement.

export interface HolidaySeed {
  title_ar: string;
  title_fr: string;
  starts_on: string; // YYYY-MM-DD
  ends_on: string | null;
  is_estimate: boolean;
}

const CIVIL: [md: string, ar: string, fr: string][] = [
  ['01-01', 'رأس السنة الميلادية', 'Jour de l’an'],
  ['03-20', 'عيد الاستقلال', 'Fête de l’indépendance'],
  ['04-09', 'عيد الشهداء', 'Journée des martyrs'],
  ['05-01', 'عيد الشغل', 'Fête du travail'],
  ['07-25', 'عيد الجمهورية', 'Fête de la République'],
  ['08-13', 'عيد المرأة', 'Fête de la femme'],
  ['10-15', 'عيد الجلاء', 'Fête de l’évacuation'],
  ['12-17', 'عيد الثورة', 'Fête de la révolution'],
];

// [Hijri month, day, length in days, Arabic, French]
const ISLAMIC: [month: number, day: number, days: number, ar: string, fr: string][] = [
  [1, 1, 1, 'رأس السنة الهجرية', 'Nouvel an de l’Hégire'],
  [3, 12, 1, 'المولد النبوي الشريف', 'Mouled (naissance du Prophète)'],
  [10, 1, 2, 'عيد الفطر', 'Aïd el-Fitr'],
  [12, 10, 2, 'عيد الأضحى', 'Aïd el-Idha'],
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Hijri (Umm al-Qura) month and day of a Gregorian date (UTC noon avoids day shifts). */
export function hijriOf(date: Date): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', month: 'numeric', day: 'numeric' }).formatToParts(date);
  return { month: Number(parts.find((p) => p.type === 'month')?.value), day: Number(parts.find((p) => p.type === 'day')?.value) };
}

/**
 * Every public holiday that starts in the Gregorian `year`. `offsetDays` is the Hijri offset
 * from Settings (dates), so the estimates agree with the masthead date.
 */
export function tunisianHolidays(year: number, offsetDays = 0): HolidaySeed[] {
  const out: HolidaySeed[] = CIVIL.map(([md, ar, fr]) => ({ title_ar: ar, title_fr: fr, starts_on: `${year}-${md}`, ends_on: null, is_estimate: false }));
  for (let t = Date.UTC(year, 0, 1, 12); new Date(t).getUTCFullYear() === year; t += 86400000) {
    const h = hijriOf(new Date(t + offsetDays * 86400000));
    for (const [m, d, days, ar, fr] of ISLAMIC) {
      if (h.month === m && h.day === d) {
        out.push({ title_ar: ar, title_fr: fr, starts_on: iso(new Date(t)), ends_on: days > 1 ? iso(new Date(t + (days - 1) * 86400000)) : null, is_estimate: true });
      }
    }
  }
  return out.sort((a, b) => a.starts_on.localeCompare(b.starts_on));
}
