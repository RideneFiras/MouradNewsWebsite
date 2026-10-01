import { describe, expect, it } from 'vitest';
import { addDays, monthEnd, pctChange, resolveRange } from '@/lib/stats/range';

const today = '2026-03-10';

describe('resolveRange', () => {
  it('defaults to the last 7 days with the 7 days before as comparison', () => {
    const r = resolveRange({}, today);
    expect(r).toMatchObject({ key: '7d', from: '2026-03-04', to: today, prevFrom: '2026-02-25', prevTo: '2026-03-03', days: 7, isMonth: false });
  });
  it('handles today and yesterday', () => {
    expect(resolveRange({ range: 'today' }, today)).toMatchObject({ from: today, to: today, prevFrom: '2026-03-09', prevTo: '2026-03-09' });
    expect(resolveRange({ range: 'yesterday' }, today)).toMatchObject({ from: '2026-03-09', to: '2026-03-09' });
  });
  it('compares a calendar month with the previous calendar month', () => {
    const r = resolveRange({ range: 'lastmonth' }, today);
    expect(r).toMatchObject({ from: '2026-02-01', to: '2026-02-28', prevFrom: '2026-01-01', prevTo: '2026-01-31', isMonth: true });
    expect(resolveRange({ range: 'month' }, today)).toMatchObject({ from: '2026-03-01', to: '2026-03-31', isMonth: true });
  });
  it('sanitises custom ranges', () => {
    expect(resolveRange({ range: 'custom', from: '2026-03-05', to: '2026-03-01' }, today)).toMatchObject({ from: '2026-03-01', to: '2026-03-05', days: 5 });
    expect(resolveRange({ range: 'custom', from: '2026-03-01', to: '2027-01-01' }, today).to).toBe(today);
    expect(resolveRange({ range: 'custom', from: 'x', to: '2026-03-01' }, today).key).toBe('custom');
    expect(resolveRange({ range: 'custom', from: '2020-01-01', to: today }, today).days).toBe(400);
  });
  it('date helpers', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(monthEnd('2024-02-10')).toBe('2024-02-29');
    expect(pctChange(110, 100)).toBe(10);
    expect(pctChange(5, 0)).toBeNull();
  });
});

describe('formatInt', () => {
  it('groups with U+202F so numbers stay whole in RTL text', async () => {
    const { formatInt } = await import('@/lib/format/number');
    expect(formatInt(17175)).toBe('17 175');
    expect(formatInt(1234567)).toBe('1 234 567');
  });
});

describe('toCsv', () => {
  it('quotes, escapes and neutralises formulas', async () => {
    const { toCsv } = await import('@/lib/stats/csv');
    const out = toCsv(['a', 'b'], [['قليبية, نابل', '=HYPERLINK("x")'], [-3, null]]);
    expect(out.startsWith('﻿a,b\r\n')).toBe(true);
    expect(out).toContain('"قليبية, نابل"');
    expect(out).toContain(`"'=HYPERLINK(""x"")"`);
    expect(out).toContain('-3,\r\n');
  });
});
