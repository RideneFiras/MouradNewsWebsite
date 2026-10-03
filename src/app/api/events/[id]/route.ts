import { publicClient } from '@/lib/supabase/public';
import { siteUrl } from '@/lib/env';
import { articleHref } from '@/lib/public/links';
import { addDays } from '@/lib/format/date';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const day = (iso: string) => iso.replace(/-/g, '');
const clock = (t: string) => t.slice(0, 8).replace(/:/g, '');

/**
 * "Add to my calendar": one event as an .ics file (opens in the phone's calendar app on
 * Android and iOS, and in Outlook/Google Calendar on a computer). Times are Tunis time.
 * Only events readers can see (RLS) are served.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });
  const { data: e } = await publicClient()
    .from('events')
    .select('id, kind, title_ar, starts_on, ends_on, start_time, end_time, place, updated_at, town:tags!events_town_tag_id_fkey(name_ar), article:articles!events_article_id_fkey(public_id, slug, language)')
    .eq('id', id)
    .maybeSingle();
  if (!e) return new Response('Not found', { status: 404 });
  const ev = e as unknown as {
    id: string; title_ar: string; starts_on: string; ends_on: string | null; start_time: string | null; end_time: string | null; place: string | null; updated_at: string;
    town: { name_ar: string } | null; article: { public_id: number; slug: string | null; language: 'ar' | 'fr' } | null;
  };
  const url = ev.article ? `${siteUrl()}${articleHref(ev.article)}` : `${siteUrl()}/ar/agenda`;
  const lastDay = ev.ends_on ?? ev.starts_on;
  const when = ev.start_time
    ? [`DTSTART;TZID=Africa/Tunis:${day(ev.starts_on)}T${clock(ev.start_time)}`,
       ev.end_time ? `DTEND;TZID=Africa/Tunis:${day(lastDay)}T${clock(ev.end_time)}` : `DURATION:PT2H`]
    : [`DTSTART;VALUE=DATE:${day(ev.starts_on)}`, `DTEND;VALUE=DATE:${day(addDays(lastDay, 1))}`];
  const location = [ev.place, ev.town?.name_ar].filter(Boolean).join('، ');
  const stamp = new Date(ev.updated_at).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//El Borj//Agenda//AR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    // Tunisia: UTC+1 all year, no daylight saving.
    'BEGIN:VTIMEZONE', 'TZID:Africa/Tunis', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'END:STANDARD', 'END:VTIMEZONE',
    'BEGIN:VEVENT', `UID:${ev.id}@elborj`, `DTSTAMP:${stamp}`, ...when, `SUMMARY:${esc(ev.title_ar)}`,
    ...(location ? [`LOCATION:${esc(location)}`] : []), `URL:${url}`, `DESCRIPTION:${esc(url)}`, 'END:VEVENT', 'END:VCALENDAR',
  ];
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="elborj-${ev.starts_on}.ics"`,
      'Cache-Control': 'public, max-age=600',
    },
  });
}
