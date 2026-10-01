/** Western digits, thin-space grouping (12 345). */
export function formatInt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0, numberingSystem: 'latn' }).format(n).replace(/ | /g, ' ');
}

/** Media-kit style: «12 ألف» / «12 000» for numbers already rounded down. */
export function formatAudience(n: number, locale: 'ar' | 'fr', rounded: boolean): string {
  if (locale === 'ar' && rounded && n >= 1000 && n % 1000 === 0) return `${formatInt(n / 1000)} ألف`;
  return formatInt(n);
}

export function formatDuration(seconds: number, locale: 'ar' | 'fr'): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (locale === 'fr') return m ? `${m} min ${r} s` : `${r} s`;
  return m ? `${m} د ${r} ث` : `${r} ث`;
}
