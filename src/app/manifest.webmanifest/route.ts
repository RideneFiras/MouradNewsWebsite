import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';

// Rendered on request (settings cached by tag): the build must not need the database.
export const dynamic = 'force-dynamic';

/**
 * Web app manifest: "Add to Home Screen" / "Install app" (Android, iOS) opens the paper full
 * screen like an app, with the name and tagline from the admin (Settings → identity).
 * Icons are the site's own files in public/icons (Chrome only offers to install with a 192 px
 * and a 512 px icon on the same site; regenerate them with `node design/icon/render.mjs` if
 * the mark changes). The service worker (public/sw.js) is registered by InstallBanner.
 */
export async function GET() {
  const settings = await getSettings();
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
    prefer_related_applications: false,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
