import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import { mediaUrl } from '@/lib/env';

// Rendered on request (settings cached by tag): the build must not need the database.
export const dynamic = 'force-dynamic';

/**
 * Web app manifest: "Add to Home Screen" (Android, iOS) opens the paper full screen like an
 * app, with the name and icon from the admin (Settings → identity: site name, browser icon).
 * The icon is the square PNG uploaded as the browser icon; its built-in margin keeps it inside
 * Android's round mask, so it is declared for both purposes.
 */
export async function GET() {
  const settings = (await getSettings()) as Awaited<ReturnType<typeof getSettings>> & { favicon_path?: string | null };
  const icon = settings.favicon_path ? mediaUrl(settings.favicon_path) : null;
  const png = !!icon && /\.png$/i.test(settings.favicon_path ?? '');
  const manifest = {
    name: pick(settings.site_name, 'ar'),
    short_name: pick(settings.site_name, 'ar'),
    description: pick(settings.tagline, 'ar'),
    lang: 'ar',
    dir: 'rtl',
    start_url: '/ar?utm_source=homescreen',
    scope: '/',
    id: '/ar',
    display: 'standalone',
    background_color: '#f5f1e8',
    theme_color: '#f5f1e8',
    categories: ['news'],
    icons: icon
      ? [
          { src: icon, sizes: png ? '480x480' : 'any', type: png ? 'image/png' : undefined, purpose: 'any' },
          { src: icon, sizes: png ? '480x480' : 'any', type: png ? 'image/png' : undefined, purpose: 'maskable' },
        ]
      : [],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
