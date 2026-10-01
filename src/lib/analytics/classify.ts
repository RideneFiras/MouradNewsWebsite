// Traffic source classification (docs/07-analytics-and-monetization.md).
// First matching rule wins.

export type TrafficSource =
  | 'direct' | 'facebook' | 'instagram' | 'whatsapp' | 'x' | 'google' | 'other_search'
  | 'newsletter' | 'internal' | 'referral' | 'other_social';

export interface SourceInput {
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  ownHost?: string | null;
}

const FACEBOOK_HOSTS = new Set(['facebook.com', 'm.facebook.com', 'l.facebook.com', 'lm.facebook.com', 'fb.com', 'web.facebook.com', 'mbasic.facebook.com']);
const INSTAGRAM_HOSTS = new Set(['instagram.com', 'l.instagram.com']);
const X_HOSTS = new Set(['t.co', 'x.com', 'twitter.com', 'mobile.twitter.com']);
const OTHER_SEARCH = [/^(www\.)?bing\.com$/, /^(.+\.)?duckduckgo\.com$/, /^(.+\.)?yahoo\.[a-z.]+$/, /^(.+\.)?yandex\.[a-z.]+$/, /^(www\.)?ecosia\.org$/, /^(www\.)?qwant\.com$/];
const OTHER_SOCIAL = new Set(['tiktok.com', 'linkedin.com', 'lnkd.in', 'youtube.com', 'm.youtube.com', 't.me', 'telegram.org', 'reddit.com', 'old.reddit.com']);

/** Host of a URL, lowercase, without "www.". Null when not a valid http(s) URL. */
export function referrerHost(referrer?: string | null): string | null {
  if (!referrer) return null;
  try {
    const u = new URL(referrer);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.hostname.toLowerCase().replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

const stripWww = (h: string) => h.replace(/^www\./, '');

export function classifySource({ referrer, utmSource, utmMedium, ownHost }: SourceInput): TrafficSource {
  const src = (utmSource ?? '').trim().toLowerCase();
  const medium = (utmMedium ?? '').trim().toLowerCase();
  const host = referrerHost(referrer);
  const own = ownHost ? stripWww(ownHost.toLowerCase()) : null;

  if (medium === 'newsletter' || src.includes('newsletter')) return 'newsletter';
  if (src === 'facebook' || src === 'fb' || (host && FACEBOOK_HOSTS.has(host))) return 'facebook';
  if (host && INSTAGRAM_HOSTS.has(host)) return 'instagram';
  if (src === 'whatsapp' || (host && host.includes('whatsapp')) || (referrer ?? '').toLowerCase().includes('whatsapp')) return 'whatsapp';
  if (host && X_HOSTS.has(host)) return 'x';
  if (host && /^(.+\.)?google\.[a-z.]+$/.test(host)) return 'google';
  if (host && OTHER_SEARCH.some((re) => re.test(host))) return 'other_search';
  if (host && own && (host === own || host.endsWith('.' + own))) return 'internal';
  if (host && OTHER_SOCIAL.has(host)) return 'other_social';
  if (host) return 'referral';
  return 'direct';
}
