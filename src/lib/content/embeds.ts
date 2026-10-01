// Embeds are only accepted from an allowlist and are rendered by our own markup,
// never as raw iframes coming from user input (docs/03-architecture.md, Security).

export type EmbedProvider = 'youtube' | 'facebook' | 'x' | 'instagram';

export interface ParsedEmbed {
  provider: EmbedProvider;
  url: string;
  id?: string;
}

const HOSTS: Record<string, EmbedProvider> = {
  'youtube.com': 'youtube',
  'm.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'facebook.com': 'facebook',
  'm.facebook.com': 'facebook',
  'web.facebook.com': 'facebook',
  'fb.watch': 'facebook',
  'x.com': 'x',
  'twitter.com': 'x',
  'mobile.twitter.com': 'x',
  'instagram.com': 'instagram',
};

export function parseEmbed(raw: string): ParsedEmbed | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const provider = HOSTS[host];
  if (!provider) return null;
  if (provider === 'youtube') {
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0] ?? null;
    else if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,20})/);
      id = m?.[1] ?? null;
    }
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    return { provider, url: `https://www.youtube.com/watch?v=${id}`, id };
  }
  return { provider, url: u.toString() };
}
