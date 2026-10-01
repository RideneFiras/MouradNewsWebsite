import { formatDuration, formatInt } from '@/lib/format/number';

export type ValueFormat = 'int' | 'duration' | 'percent';

export function formatValue(v: number, format: ValueFormat, locale: 'ar' | 'fr'): string {
  if (format === 'duration') return formatDuration(v, locale);
  if (format === 'percent') return `${formatInt(Math.round(v * 100))}%`;
  return formatInt(v);
}

/** A "nice" axis maximum and 3–5 round ticks starting at zero. */
export function niceScale(maxValue: number): { max: number; ticks: number[] } {
  const raw = maxValue / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  const max = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks: number[] = [];
  for (let t = 0; t <= max + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return { max, ticks };
}
