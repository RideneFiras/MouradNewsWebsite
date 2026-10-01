import { describe, expect, it } from 'vitest';
import { classifySource, referrerHost } from '@/lib/analytics/classify';

const own = 'elborj.tn';
const c = (referrer: string | null, utmSource?: string, utmMedium?: string) =>
  classifySource({ referrer, utmSource, utmMedium, ownHost: own });

describe('classifySource', () => {
  it('newsletter first', () => {
    expect(c('https://m.facebook.com/', 'facebook', 'newsletter')).toBe('newsletter');
    expect(c(null, 'weekly-newsletter')).toBe('newsletter');
  });
  it('facebook by utm or referrer', () => {
    expect(c(null, 'fb')).toBe('facebook');
    expect(c('https://l.facebook.com/l.php?u=x')).toBe('facebook');
    expect(c('https://lm.facebook.com/')).toBe('facebook');
  });
  it('instagram', () => expect(c('https://l.instagram.com/')).toBe('instagram'));
  it('whatsapp via share utm', () => expect(c(null, 'whatsapp', 'share')).toBe('whatsapp'));
  it('whatsapp via referrer', () => expect(c('https://web.whatsapp.com/')).toBe('whatsapp'));
  it('x', () => {
    expect(c('https://t.co/abc')).toBe('x');
    expect(c('https://twitter.com/')).toBe('x');
  });
  it('google any tld', () => {
    expect(c('https://www.google.com/')).toBe('google');
    expect(c('https://www.google.com.tn/')).toBe('google');
    expect(c('https://news.google.fr/')).toBe('google');
  });
  it('other search engines', () => {
    expect(c('https://www.bing.com/search')).toBe('other_search');
    expect(c('https://duckduckgo.com/')).toBe('other_search');
    expect(c('https://fr.search.yahoo.com/')).toBe('other_search');
    expect(c('https://yandex.ru/')).toBe('other_search');
    expect(c('https://www.qwant.com/')).toBe('other_search');
  });
  it('internal', () => {
    expect(c('https://elborj.tn/ar/section/sport')).toBe('internal');
    expect(c('https://www.elborj.tn/ar')).toBe('internal');
  });
  it('other social', () => {
    expect(c('https://www.youtube.com/')).toBe('other_social');
    expect(c('https://t.me/channel')).toBe('other_social');
    expect(c('https://lnkd.in/x')).toBe('other_social');
  });
  it('referral and direct', () => {
    expect(c('https://www.mosaiquefm.net/x')).toBe('referral');
    expect(c(null)).toBe('direct');
    expect(c('')).toBe('direct');
    expect(c('android-app://com.google.android.gm/')).toBe('direct');
  });
});

describe('referrerHost', () => {
  it('host only, no path, no www', () => {
    expect(referrerHost('https://www.Example.com/a/b?c=d')).toBe('example.com');
    expect(referrerHost('not a url')).toBeNull();
  });
});
