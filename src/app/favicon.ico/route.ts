import { getSettings } from '@/lib/data/queries';
import { mediaUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Old browsers, feed readers and crawlers ask for /favicon.ico: send them to the browser icon
 *  chosen in the admin (a PNG works at this address). 404 while none is set. */
export async function GET() {
  const settings = (await getSettings()) as Awaited<ReturnType<typeof getSettings>> & { favicon_path?: string | null };
  const icon = settings.favicon_path ? mediaUrl(settings.favicon_path) : null;
  if (!icon) return new Response('Not found', { status: 404 });
  return new Response(null, { status: 302, headers: { Location: icon, 'Cache-Control': 'public, max-age=86400' } });
}
