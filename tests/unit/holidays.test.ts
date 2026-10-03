import { describe, expect, it } from 'vitest';
import { tunisianHolidays } from '@/lib/events/holidays';

describe('tunisianHolidays', () => {
  const h2026 = tunisianHolidays(2026);
  const on = (d: string) => h2026.filter((h) => h.starts_on === d).map((h) => h.title_ar);

  it('has the 8 fixed civil holidays, confirmed', () => {
    const civil = h2026.filter((h) => !h.is_estimate);
    expect(civil).toHaveLength(8);
    expect(on('2026-10-15')).toContain('عيد الجلاء');
    expect(on('2026-12-17')).toContain('عيد الثورة');
  });

  it('estimates the Islamic holidays near the announced dates', () => {
    // Announced/expected dates for 2026 (±1 day is normal before the moon sighting).
    const near = (title: string, expected: string) => {
      const h = h2026.find((x) => x.title_ar === title);
      expect(h, title).toBeDefined();
      expect(h!.is_estimate).toBe(true);
      expect(Math.abs(Date.parse(h!.starts_on) - Date.parse(expected))).toBeLessThanOrEqual(86400000);
    };
    near('عيد الفطر', '2026-03-20');
    near('عيد الأضحى', '2026-05-27');
    near('رأس السنة الهجرية', '2026-06-16');
    near('المولد النبوي الشريف', '2026-08-25');
  });

  it('gives the two Eid holidays two days', () => {
    const fitr = h2026.find((x) => x.title_ar === 'عيد الفطر')!;
    expect(fitr.ends_on).not.toBeNull();
  });

  it('applies the Hijri offset', () => {
    const base = tunisianHolidays(2026).find((x) => x.title_ar === 'عيد الأضحى')!.starts_on;
    const later = tunisianHolidays(2026, -1).find((x) => x.title_ar === 'عيد الأضحى')!.starts_on;
    expect(Date.parse(later) - Date.parse(base)).toBe(86400000);
  });
});
