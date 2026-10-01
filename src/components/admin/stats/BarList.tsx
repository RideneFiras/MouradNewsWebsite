import type { ReactNode } from 'react';
import { formatValue, type ValueFormat } from './chart-utils';

export interface BarRow {
  key: string;
  label: ReactNode;
  value: number;
  /** Share of the total (0–1), printed next to the value. */
  share?: number | null;
}

/**
 * Horizontal bar list (docs/02: preferred over pie charts for breakdowns). One series,
 * press red, bars grow from inline-start; every row is labelled with its value, so the
 * list is its own table.
 */
export function BarList({ rows, locale, format = 'int', empty }: { rows: BarRow[]; locale: 'ar' | 'fr'; format?: ValueFormat; empty: string }) {
  if (!rows.length) return <p className="text-[14px] text-ink-3">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} title={r.share != null ? `${formatValue(r.value, format, locale)} · ${(r.share * 100).toFixed(1)}%` : undefined}>
          <p className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className="min-w-0">{r.label}</span>
            <span className="shrink-0 tabular-nums">
              <bdi>{formatValue(r.value, format, locale)}</bdi>
              {r.share != null && <bdi className="ms-2 inline-block min-w-9 text-ink-3">{Math.round(r.share * 100)}%</bdi>}
            </span>
          </p>
          <div className="mt-1 h-1.5" aria-hidden>
            <div className="h-1.5 rounded-e-[2px] bg-accent" style={{ inlineSize: `${Math.max(0.5, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
