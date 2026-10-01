import { describe, expect, it } from 'vitest';
import { EngagementClock, scrollPercent } from '@/lib/analytics/engagement';
import { deviceFromUA } from '@/lib/analytics/device';
import { makeToken, verifyToken, BUCKET_SECONDS } from '@/lib/analytics/token';

describe('EngagementClock', () => {
  it('counts time only while active (15 s window) and visible', () => {
    const c = new EngagementClock(0);
    c.tick(10_000);
    expect(c.seconds).toBe(10);
    c.tick(60_000); // idle after 15 s
    expect(c.seconds).toBe(15);
    c.activity(60_000);
    c.tick(65_000);
    expect(c.seconds).toBe(20);
    c.setVisible(65_000, false);
    c.tick(120_000); // hidden: nothing
    expect(c.seconds).toBe(20);
    c.setVisible(120_000, true);
    c.tick(125_000);
    expect(c.seconds).toBe(25);
  });
  it('caps at 1800 s', () => {
    const c = new EngagementClock(0);
    for (let t = 0; t <= 3_600_000; t += 10_000) c.activity(t);
    expect(c.seconds).toBe(1800);
  });
  it('keeps the maximum scroll depth', () => {
    const c = new EngagementClock(0);
    c.scroll(40);
    c.scroll(90);
    c.scroll(20);
    c.scroll(150);
    expect(c.scrollPct).toBe(100);
    expect(scrollPercent(100, 1000, 850)).toBe(75);
    expect(scrollPercent(0, 0, 500)).toBe(0);
  });
});

describe('deviceFromUA', () => {
  it('classifies common user agents', () => {
    expect(deviceFromUA('Mozilla/5.0 (Linux; Android 14; SM-A145F) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36')).toBe('mobile');
    expect(deviceFromUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)')).toBe('mobile');
    expect(deviceFromUA('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)')).toBe('tablet');
    expect(deviceFromUA('Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/128 Safari/537.36')).toBe('tablet');
    expect(deviceFromUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128')).toBe('desktop');
    expect(deviceFromUA('')).toBe('other');
  });
});

describe('page token', () => {
  const secret = 'test-secret';
  it('accepts a fresh token, rejects forged and expired ones', async () => {
    const now = Date.UTC(2026, 9, 1, 12);
    const tok = await makeToken(secret, now);
    expect(await verifyToken(secret, tok, now)).toBe(true);
    expect(await verifyToken(secret, tok, now + 3 * 3600_000)).toBe(true);
    expect(await verifyToken(secret, tok, now + 25 * 3600_000)).toBe(false);
    expect(await verifyToken('other-secret', tok, now)).toBe(false);
    expect(await verifyToken(secret, tok.slice(0, -2) + 'xx', now)).toBe(false);
    expect(await verifyToken(secret, `${Math.floor(now / 1000 / BUCKET_SECONDS) + 50}.abc`, now)).toBe(false);
    expect(await verifyToken(secret, undefined, now)).toBe(false);
  });
});
