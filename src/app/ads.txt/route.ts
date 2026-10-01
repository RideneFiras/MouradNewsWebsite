import { getSettings } from '@/lib/data/queries';

// Rendered on request (data cached by tag): the build must not need the database.
export const dynamic = 'force-dynamic';

/** /ads.txt from the admin (الإشهار → AdSense). Empty file until the owner pastes Google's line. */
export async function GET() {
  const settings = await getSettings();
  const body = (settings.ads_txt?.content ?? '').trim();
  return new Response(body ? `${body}\n` : '', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
