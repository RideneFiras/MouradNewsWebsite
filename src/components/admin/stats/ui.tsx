import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { formatInt } from '@/lib/format/number';
import { formatCalendarDay } from '@/lib/format/date';
import { RANGE_KEYS, rangeQuery, type StatsRange } from '@/lib/stats/range';
import { Sparkline } from './Sparkline';

export type StatsTab = 'overview' | 'articles' | 'sections' | 'authors' | 'sources' | 'audience' | 'social' | 'report';
const EDITOR_TABS: StatsTab[] = ['overview', 'articles', 'sections', 'authors', 'sources', 'audience', 'social', 'report'];
const AUTHOR_TABS: StatsTab[] = ['overview', 'articles', 'authors'];

/** A metric name that opens its definition (docs/07 "Metric definitions"); no JS, Popover API. */
export function Defined({ id, label, definition }: { id: string; label: string; definition: string }) {
  return (
    <>
      <button type="button" popoverTarget={id} className="cursor-help text-start underline decoration-dotted decoration-1 underline-offset-4">
        {label}
      </button>
      <span id={id} popover="auto" role="tooltip" className="m-auto max-w-80 border border-rule-strong bg-white p-3 text-[14px] leading-relaxed text-ink">
        {definition}
      </span>
    </>
  );
}

export function Change({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-ink-3">—</span>;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return (
    <span className="tabular-nums text-ink-2" title={label}>
      <bdi dir="ltr">{`${sign}${Math.abs(value).toFixed(Math.abs(value) < 10 ? 1 : 0)}%`}</bdi>
    </span>
  );
}

export function Tile({ id, label, definition, value, change, changeLabel, spark, rtl, foot }: {
  id: string; label: string; definition: string; value: string; change?: number | null; changeLabel?: string; spark?: number[]; rtl?: boolean; foot?: ReactNode;
}) {
  return (
    <div className="a-panel flex flex-col gap-1 p-4">
      <p className="text-[14px] text-ink-2"><Defined id={id} label={label} definition={definition} /></p>
      <p className="text-[30px] leading-tight font-semibold tabular-nums">{value}</p>
      <div className="flex items-end justify-between gap-2 text-[13px]">
        {change !== undefined ? <Change value={change} label={changeLabel ?? ''} /> : <span />}
        {spark && spark.length > 1 && <Sparkline values={spark} rtl={!!rtl} />}
      </div>
      {foot && <p className="text-[12px] text-ink-3">{foot}</p>}
    </div>
  );
}

export function Panel({ title, children, action, className = '' }: { title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`a-panel min-w-0 p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          {title ? <h2 className="a-h2">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Title, tabs and range picker shared by every statistics screen. */
export async function StatsHeader({ locale, tab, range, isEditor, showRange = true, csv }: {
  locale: 'ar' | 'fr'; tab: StatsTab; range: StatsRange; isEditor: boolean; showRange?: boolean; csv?: string;
}) {
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const base = `/${locale}/admin/stats`;
  const q = rangeQuery(range);
  const tabs = isEditor ? EDITOR_TABS : AUTHOR_TABS;
  const href = (k: StatsTab) => (k === 'overview' ? base : `${base}/${k}`) + (k === 'report' || k === 'social' ? '' : q);
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="a-h1">{isEditor ? t('title') : t('my.title')}</h1>
        {csv && <a href={csv} className="a-btn a-btn-sm" download>{t('exportCsv')}</a>}
      </div>
      <nav aria-label={t('title')} className="-mx-1 flex gap-1 overflow-x-auto border-b border-rule-strong">
        {tabs.map((k) => (
          <Link key={k} prefetch={false} href={href(k)} aria-current={k === tab ? 'page' : undefined}
            className={`shrink-0 border-b-[3px] px-3 py-2 text-[15px] whitespace-nowrap ${k === tab ? 'border-accent font-semibold text-ink' : 'border-transparent text-ink-2 hover:text-accent'}`}>
            {t(`tabs.${k}`)}
          </Link>
        ))}
      </nav>
      {showRange && <RangePicker locale={locale} range={range} path={tab === 'overview' ? base : `${base}/${tab}`} />}
      {!isEditor && <p className="a-help">{t('my.note')}</p>}
    </header>
  );
}

export async function RangePicker({ locale, range, path, extra }: { locale: 'ar' | 'fr'; range: StatsRange; path: string; extra?: Record<string, string> }) {
  const t = await getTranslations({ locale, namespace: 'admin.stats' });
  const keep = extra ? Object.entries(extra).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('') : '';
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <ul className="flex flex-wrap gap-1" aria-label={t('rangeLabel')}>
        {RANGE_KEYS.filter((k) => k !== 'custom').map((k) => (
          <li key={k}>
            <Link prefetch={false} href={`${path}?range=${k}${keep}`} aria-current={range.key === k ? 'true' : undefined}
              className={`a-btn a-btn-sm ${range.key === k ? 'a-btn-primary' : ''}`}>{t(`ranges.${k}`)}</Link>
          </li>
        ))}
      </ul>
      <form method="get" action={path} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="range" value="custom" />
        {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <label className="text-[13px]">
          <span className="block text-ink-3">{t('from')}</span>
          <input type="date" name="from" defaultValue={range.from} className="a-input min-h-8 py-1" dir="ltr" />
        </label>
        <label className="text-[13px]">
          <span className="block text-ink-3">{t('to')}</span>
          <input type="date" name="to" defaultValue={range.to} className="a-input min-h-8 py-1" dir="ltr" />
        </label>
        <button className="a-btn a-btn-sm">{t('apply')}</button>
      </form>
      <p className="w-full text-[13px] text-ink-3">
        {t('period', { from: formatCalendarDay(range.from, locale, true), to: formatCalendarDay(range.to, locale, true) })}
      </p>
    </div>
  );
}

export const fmtInt = (n: number | null | undefined) => (n == null ? '—' : formatInt(n));
export const fmtPct = (r: number | null | undefined) => (r == null ? '—' : `${Math.round(r * 100)}%`);
