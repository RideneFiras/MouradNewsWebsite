import { describe, expect, it } from 'vitest';
import { formatDate, formatHijri, formatListTime, tunisDayKey } from '@/lib/format/date';

// 2026-10-01T20:38:00Z = Thursday 1 October 2026, 21:38 in Tunis (UTC+1, no DST).
const D = new Date('2026-10-01T20:38:00Z');

describe('formatDate', () => {
  it('full, Arabic, Tunisian month and weekday', () => {
    expect(formatDate(D, 'ar', 'full')).toBe('الخميس 1 أكتوبر 2026');
  });
  it('full, French', () => {
    expect(formatDate(D, 'fr', 'full')).toBe('jeudi 1 octobre 2026');
  });
  it('short', () => {
    expect(formatDate(D, 'ar', 'short')).toBe('1 أكتوبر 2026');
    expect(formatDate(D, 'fr', 'short')).toBe('1 oct. 2026');
  });
  it('time is 24h in Tunis time', () => {
    expect(formatDate(D, 'ar', 'time')).toBe('21:38');
    expect(formatDate(D, 'fr', 'time')).toBe('21:38');
  });
  it('uses every Maghrebi month name', () => {
    const months = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    months.forEach((m, i) => {
      expect(formatDate(new Date(Date.UTC(2026, i, 15, 12)), 'ar', 'short')).toBe(`15 ${m} 2026`);
    });
  });
  it('never uses Eastern Arabic digits or Levantine months', () => {
    const s = formatDate(D, 'ar', 'full');
    expect(s).not.toMatch(/[٠-٩]/);
    expect(s).not.toMatch(/يونيو|يوليو|أغسطس/);
  });
  it('day boundary follows Africa/Tunis, not UTC', () => {
    // 23:30 UTC on 30 Sep = 00:30 on 1 Oct in Tunis.
    expect(tunisDayKey(new Date('2026-09-30T23:30:00Z'))).toBe('2026-10-01');
  });
});

describe('relative dates', () => {
  const now = new Date('2026-10-01T21:00:00Z');
  const ago = (min: number) => new Date(now.getTime() - min * 60000);
  it('Arabic plural forms', () => {
    expect(formatDate(ago(0.5), 'ar', 'relative', { now })).toBe('الآن');
    expect(formatDate(ago(1), 'ar', 'relative', { now })).toBe('منذ دقيقة');
    expect(formatDate(ago(2), 'ar', 'relative', { now })).toBe('منذ دقيقتين');
    expect(formatDate(ago(3), 'ar', 'relative', { now })).toBe('منذ 3 دقائق');
    expect(formatDate(ago(25), 'ar', 'relative', { now })).toBe('منذ 25 دقيقة');
    expect(formatDate(ago(60), 'ar', 'relative', { now })).toBe('منذ ساعة');
    expect(formatDate(ago(120), 'ar', 'relative', { now })).toBe('منذ ساعتين');
    expect(formatDate(ago(180), 'ar', 'relative', { now })).toBe('منذ 3 ساعات');
    expect(formatDate(ago(11 * 60), 'ar', 'relative', { now })).toBe('منذ 11 ساعة');
  });
  it('French', () => {
    expect(formatDate(ago(25), 'fr', 'relative', { now })).toBe('il y a 25 min');
    expect(formatDate(ago(180), 'fr', 'relative', { now })).toBe('il y a 3 h');
  });
  it('falls back to short after 24h', () => {
    expect(formatDate(ago(25 * 60), 'ar', 'relative', { now })).toBe('30 سبتمبر 2026');
  });
});

describe('list time', () => {
  it('HH:MM today, short date before', () => {
    const now = new Date('2026-10-01T22:00:00Z');
    expect(formatListTime(D, 'ar', now)).toBe('21:38');
    expect(formatListTime(new Date('2026-09-29T10:00:00Z'), 'ar', now)).toBe('29 سبتمبر');
    expect(formatListTime(new Date('2025-12-29T10:00:00Z'), 'ar', now)).toBe('29 ديسمبر 2025');
  });
});

describe('Hijri date', () => {
  it('Umm al-Qura with Western digits and no era suffix', () => {
    const h = formatHijri(D, 'ar');
    expect(h).toMatch(/^\d{1,2} \S.* 14\d\d$/);
    expect(h).not.toMatch(/[٠-٩]|هـ/);
  });
  it('offset shifts by whole days', () => {
    const a = formatHijri(D, 'ar', 0);
    const b = formatHijri(D, 'ar', 1);
    expect(a).not.toBe(b);
  });
});
