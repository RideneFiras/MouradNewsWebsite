import { describe, expect, it } from 'vitest';
import { matchesSection, running, weightedIndex } from '@/lib/ads/pick';

describe('ad selection', () => {
  it('weighted pick follows the weights', () => {
    expect(weightedIndex([], 0.5)).toBe(-1);
    expect(weightedIndex([1, 3], 0)).toBe(0);
    expect(weightedIndex([1, 3], 0.24)).toBe(0);
    expect(weightedIndex([1, 3], 0.26)).toBe(1);
    expect(weightedIndex([1, 3], 0.999)).toBe(1);
    const counts = [0, 0];
    for (let i = 0; i < 4000; i++) counts[weightedIndex([1, 3], i / 4000)]!++;
    expect(counts).toEqual([1000, 3000]);
  });
  it('drops campaigns not running any more (cached pages)', () => {
    const now = Date.parse('2026-05-10T12:00:00Z');
    const list = [
      { id: 'a', weight: 1, starts_at: '2026-05-01T00:00:00Z', ends_at: null },
      { id: 'b', weight: 1, starts_at: '2026-05-01T00:00:00Z', ends_at: '2026-05-10T11:00:00Z' },
      { id: 'c', weight: 1, starts_at: '2026-05-11T00:00:00Z', ends_at: null },
    ];
    expect(running(list, now).map((c) => c.id)).toEqual(['a']);
  });
  it('targets a section or its parent', () => {
    expect(matchesSection(null, null, null)).toBe(true);
    expect(matchesSection(['s'], 's', null)).toBe(true);
    expect(matchesSection(['p'], 'child', 'p')).toBe(true);
    expect(matchesSection(['x'], 'child', 'p')).toBe(false);
    expect(matchesSection(['x'], null, null)).toBe(false);
  });
});
