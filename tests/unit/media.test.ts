import { describe, expect, it } from 'vitest';
import { objectPosition } from '@/lib/public/media';

describe('objectPosition', () => {
  it('wide picture, default focal: centre', () => {
    expect(objectPosition({ width: 1600, height: 900, focal_x: 0.5, focal_y: 0.5 })).toBe('50% 50%');
  });
  it('tall picture, default focal: near the top (faces, poster titles)', () => {
    expect(objectPosition({ width: 1024, height: 1402, focal_x: 0.5, focal_y: 0.5 })).toBe('50% 10%');
  });
  it('tall picture, focal set in the editor: kept', () => {
    expect(objectPosition({ width: 1024, height: 1402, focal_x: 0.4, focal_y: 0.7 })).toBe('40% 70%');
  });
  it('unknown size: centre', () => {
    expect(objectPosition({ width: null, height: null, focal_x: 0.5, focal_y: 0.5 })).toBe('50% 50%');
  });
});
