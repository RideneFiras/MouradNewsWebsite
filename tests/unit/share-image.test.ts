import { describe, expect, it } from 'vitest';
import { shareLayout } from '@/lib/public/share-image';

describe('shareLayout', () => {
  it('crops a 3:2 photo to 1200:630, centred', () => {
    const l = shareLayout(1500, 1000);
    expect(l.fill).toBe(true);
    expect(l.sw).toBe(1500);
    expect(l.sh).toBe(788);
    expect(l.sy).toBe(106);
  });
  it('keeps the focal point inside the crop', () => {
    expect(shareLayout(1500, 1000, 0.5, 0).sy).toBe(0);
    expect(shareLayout(1500, 1000, 0.5, 1).sy).toBe(1000 - 788);
  });
  it('shows a tall poster whole, centred on paper', () => {
    const l = shareLayout(1080, 1350);
    expect(l.fill).toBe(false);
    expect([l.dw, l.dh, l.dx]).toEqual([504, 630, 348]);
  });
});
