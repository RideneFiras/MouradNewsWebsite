import { getSettings } from '@/lib/data/queries';

export const revalidate = 300;

/** /ads.txt from the admin (الإشهار → AdSense). Empty file until the owner pastes Google's line. */
export async function GET() {
  const settings = await getSettings();
  const body = (settings.ads_txt?.content ?? '').trim();
  return new Response(body ? `${body}\n` : '', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
