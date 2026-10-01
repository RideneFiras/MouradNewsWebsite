'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatValue, niceScale, type ValueFormat } from './chart-utils';

export interface LineSeries {
  label: string;
  values: number[];
  /** main = press red, solid · comparison = --ink-3, dashed (secondary encoding besides colour). */
  tone: 'main' | 'comparison';
  /** Tooltip/table date labels for this series when they differ from the x labels (comparison period). */
  pointLabels?: string[];
}

interface Props {
  series: LineSeries[];
  /** Full date label per point (tooltip, table). */
  labels: string[];
  /** Short tick labels per point (first, middle and last are drawn). */
  ticks: string[];
  format?: ValueFormat;
  locale: 'ar' | 'fr';
  title: string;
  tableLabel: string;
  dateHeader: string;
  height?: number;
}

const PAD = { top: 14, bottom: 26, start: 46, end: 58 };

/**
 * Line chart for time series (docs/02: line and bar charts only; accent for the main
 * series, --ink-3 for the comparison period). One y axis. In Arabic the time axis runs
 * right-to-left like the text. Crosshair + tooltip on hover/keyboard, table view below.
 */
export function LineChart({ series, labels, ticks, format = 'int', locale, title, tableLabel, dateHeader, height = 220 }: Props) {
  const rtl = locale === 'ar';
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 640);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = labels.length;
  const all = series.flatMap((s) => s.values);
  const { max, ticks: yTicks } = niceScale(Math.max(1, ...all));
  const plotW = Math.max(40, width - PAD.start - PAD.end);
  const plotH = height - PAD.top - PAD.bottom;
  const xLogical = (i: number) => PAD.start + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const x = (i: number) => (rtl ? width - xLogical(i) : xLogical(i));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const yLabelX = rtl ? width - PAD.start + 6 : PAD.start - 6;
  // The SVG is laid out physically (direction: ltr), so anchors are physical too.
  const anchorStart = rtl ? 'end' : 'start';
  const anchorEnd = rtl ? 'start' : 'end';
  const fmt = (v: number) => formatValue(v, format, locale);

  const indexFromPointer = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = e.clientX - box.left;
    const logical = rtl ? width - px : px;
    const i = n <= 1 ? 0 : Math.round(((logical - PAD.start) / plotW) * (n - 1));
    return Math.min(n - 1, Math.max(0, i));
  };
  const onKey = (e: KeyboardEvent) => {
    const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === back) setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };

  // End labels: value of each series at its last point, nudged apart when they collide.
  const ends = series.map((s, si) => ({ si, v: s.values[n - 1] ?? 0, y: y(s.values[n - 1] ?? 0) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k]!.y - ends[k - 1]!.y < 14) ends[k]!.y = ends[k - 1]!.y + 14;
  const tickIdx = n <= 1 ? [0] : Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1]));
  const tipInline = hover === null ? 0 : rtl ? width - x(hover) : x(hover);
  const tipFlip = tipInline > width - 180;

  return (
    <figure className="m-0">
      {series.length > 1 && (
        <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2" aria-hidden>
          {series.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <svg width="22" height="8" aria-hidden><line x1="1" x2="21" y1="4" y2="4" strokeWidth="2" stroke={s.tone === 'main' ? 'var(--accent)' : 'var(--ink-3)'} strokeDasharray={s.tone === 'main' ? undefined : '5 4'} /></svg>
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div ref={wrap} className="relative" onPointerLeave={() => setHover(null)}>
        <svg width={width} height={height} role="img" aria-labelledby={`${id}-t`} tabIndex={0} onKeyDown={onKey} onBlur={() => setHover(null)} style={{ direction: 'ltr' }} className="block max-w-full focus-visible:outline-2 focus-visible:outline-[var(--focus)]">
          <title id={`${id}-t`}>{title}</title>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={rtl ? PAD.end : PAD.start} x2={rtl ? width - PAD.start : width - PAD.end} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={1} />
              <text x={yLabelX} y={y(t)} dy="0.32em" textAnchor={anchorEnd} fontSize="11" fill="var(--ink-3)" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(t)}</text>
            </g>
          ))}
          {tickIdx.map((i) => (
            <text key={i} x={x(i)} y={height - 8} direction={rtl ? 'rtl' : 'ltr'} style={{ unicodeBidi: 'embed' }} textAnchor={n <= 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="11" fill="var(--ink-3)">{ticks[i]}</text>
          ))}
          {series.map((s) => (
            n > 1 ? (
              <polyline key={s.label} fill="none" strokeLinejoin="round" strokeLinecap="round"
                stroke={s.tone === 'main' ? 'var(--accent)' : 'var(--ink-3)'} strokeWidth={2} strokeDasharray={s.tone === 'main' ? undefined : '5 4'}
                points={s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} />
            ) : (
              <circle key={s.label} cx={x(0)} cy={y(s.values[0] ?? 0)} r={4} fill={s.tone === 'main' ? 'var(--accent)' : 'var(--ink-3)'} />
            )
          ))}
          {ends.map((e) => (
            <text key={e.si} x={rtl ? x(n - 1) - 6 : x(n - 1) + 6} y={e.y} dy="0.32em" textAnchor={anchorStart} fontSize="12" fontWeight={series[e.si]!.tone === 'main' ? 600 : 400} fill={series[e.si]!.tone === 'main' ? 'var(--ink)' : 'var(--ink-2)'} style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(e.v)}</text>
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--ink-3)" strokeWidth={1} />
              {series.map((s) => (
                <circle key={s.label} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4.5} fill={s.tone === 'main' ? 'var(--accent)' : 'var(--ink-3)'} stroke="var(--white)" strokeWidth={2} />
              ))}
            </g>
          )}
          <rect x={rtl ? PAD.end : PAD.start - 8} y={PAD.top} width={plotW + 16} height={plotH} fill="transparent"
            onPointerMove={(e) => setHover(indexFromPointer(e))} onPointerDown={(e) => setHover(indexFromPointer(e))} />
        </svg>
        {hover !== null && (
          <div role="status" className="pointer-events-none absolute top-1 z-10 min-w-36 border border-rule-strong bg-white px-3 py-2 text-[13px]"
            style={tipFlip ? { insetInlineEnd: width - tipInline + 10 } : { insetInlineStart: tipInline + 10 }}>
            <p className="mb-1 font-semibold">{labels[hover]}</p>
            {series.map((s) => (
              <p key={s.label} className="flex items-baseline justify-between gap-4">
                <span className="text-ink-3">{s.label}{s.pointLabels ? ` (${s.pointLabels[hover] ?? ''})` : ''}</span>
                <span className={`tabular-nums ${s.tone === 'main' ? 'font-semibold text-ink' : 'text-ink-2'}`}>{fmt(s.values[hover] ?? 0)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="no-print mt-2 text-[13px]">
        <summary className="cursor-pointer text-ink-2 underline">{tableLabel}</summary>
        <div className="mt-2 max-h-72 overflow-auto">
          <table className="a-table">
            <thead><tr><th>{dateHeader}</th>{series.map((s) => <th key={s.label}>{s.label}</th>)}</tr></thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={i}><td>{l}</td>{series.map((s) => <td key={s.label} className="tabular-nums">{fmt(s.values[i] ?? 0)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
