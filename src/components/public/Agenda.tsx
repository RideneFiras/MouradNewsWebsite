import Link from 'next/link';
import type { CalendarEvent, Lang } from '@/lib/data/types';
import { addDays, formatCalendarDay, formatClock, formatDayWithWeekday, weekdayOfDay } from '@/lib/format/date';
import { articleHref, topicHref } from '@/lib/public/links';

export interface AgendaLabels {
  holiday: string;
  estimate: string;
  readArticle: string;
  addToCalendar: string;
  until: string;
  today: string;
  ongoing: string;
  from: string;
  weekdaysShort: string[]; // Monday first
}

const title = (e: CalendarEvent, locale: Lang) => (locale === 'fr' ? e.title_fr || e.title_ar : e.title_ar);
const townName = (e: CalendarEvent, locale: Lang) => (e.town ? (locale === 'fr' ? e.town.name_fr || e.town.name_ar : e.town.name_ar) : '');

/** Days an event covers inside [from, to]. */
function daysOf(e: CalendarEvent, from: string, to: string): string[] {
  const out: string[] = [];
  const end = e.ends_on && e.ends_on > e.starts_on ? e.ends_on : e.starts_on;
  for (let d = e.starts_on < from ? from : e.starts_on; d <= end && d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const multiDay = (e: CalendarEvent) => !!e.ends_on && e.ends_on > e.starts_on;

/**
 * One calendar line: time, title (linked to its article), place and town, labels.
 * "Add to my calendar": a full button in the article's box; in the agenda only for entries
 * without an article (the others open their article, which has the button).
 */
export function EventLine({ e, locale, labels, showDate = false, calendar }: {
  e: CalendarEvent; locale: Lang; labels: AgendaLabels; showDate?: boolean; calendar?: 'none' | 'link' | 'button';
}) {
  const t = title(e, locale);
  const time = [formatClock(e.start_time), formatClock(e.end_time)].filter(Boolean).join('–');
  const cal = e.kind !== 'event' ? 'none' : calendar ?? (e.article ? 'none' : 'link');
  const range = multiDay(e)
    ? showDate ? `${labels.from} ${formatCalendarDay(e.starts_on, locale)} ${labels.until} ${formatCalendarDay(e.ends_on!, locale)}` : `${labels.until} ${formatCalendarDay(e.ends_on!, locale)}`
    : '';
  const foreignArticle = e.article && e.article.language !== locale ? e.article.language : undefined;
  return (
    <div className="min-w-0">
      {(e.kind === 'holiday' || e.is_estimate) && (
        <p className="kicker mb-1">
          {e.kind === 'holiday' && <span>{labels.holiday}</span>}
          {e.kind === 'holiday' && e.is_estimate && <span aria-hidden="true"> · </span>}
          {e.is_estimate && <span className="text-ink-3">{labels.estimate}</span>}
        </p>
      )}
      <h3 className="headline-3">
        {e.article ? (
          <Link prefetch={false} href={articleHref(e.article)} className="hover:text-accent" lang={foreignArticle}>{t}</Link>
        ) : (
          t
        )}
      </h3>
      <p className="meta mt-1 flex flex-wrap gap-x-2">
        {showDate && !range && <span>{formatDayWithWeekday(e.starts_on, locale)}</span>}
        {range && <span>{range}</span>}
        {time && <span dir="ltr" className="tabular-nums">{time}</span>}
        {e.place && <bdi>{e.place}</bdi>}
        {e.town && <Link prefetch={false} href={topicHref(locale, e.town.slug)} className="hover:text-accent">{townName(e, locale)}</Link>}
        {cal === 'link' && (
          <a href={`/api/events/${e.id}`} rel="nofollow" className="-my-3 inline-flex min-h-11 items-center underline decoration-rule underline-offset-4 hover:text-accent">{labels.addToCalendar}</a>
        )}
      </p>
      {cal === 'button' && (
        <a href={`/api/events/${e.id}`} rel="nofollow" className="btn mt-3">{labels.addToCalendar}</a>
      )}
    </div>
  );
}

/** Day heading + its events (agenda page). */
function DayBlock({ day, events, locale, labels, today }: { day: string; events: CalendarEvent[]; locale: Lang; labels: AgendaLabels; today: string }) {
  const past = day < today;
  return (
    <section id={`d-${day}`} className={`scroll-mt-20 border-t border-rule py-4 ${past ? 'opacity-60' : ''}`} aria-labelledby={`h-${day}`}>
      <h2 id={`h-${day}`} className="mb-3 flex items-baseline gap-3">
        <span className="font-headline text-[34px] leading-none font-bold tabular-nums">{Number(day.slice(8))}</span>
        <span className="font-ui text-[15px] font-semibold">{formatDayWithWeekday(day, locale)}</span>
        {day === today && <span className="kicker">{labels.today}</span>}
      </h2>
      <ul className="hairline-list">
        {events.map((e) => <li key={e.id} className="py-2"><EventLine e={e} locale={locale} labels={labels} /></li>)}
      </ul>
    </section>
  );
}

/**
 * Month view: a compact month grid (days with events link to their day) and the list of
 * days below it. On phones the list is the main thing; the grid stays small.
 */
export function AgendaMonth({ month, events, locale, labels, today }: { month: string; events: CalendarEvent[]; locale: Lang; labels: AgendaLabels; today: string }) {
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  // A multi-day event is listed once in the strip at the top, and under the day it starts and
  // the day it ends (not on every day in between: a festival filled the whole week).
  const byDay = new Map<string, CalendarEvent[]>();
  const add = (d: string, e: CalendarEvent) => byDay.set(d, [...(byDay.get(d) ?? []), e]);
  for (const e of events) {
    if (!multiDay(e)) { for (const d of daysOf(e, first, last)) add(d, e); continue; }
    if (e.starts_on >= first && e.starts_on <= last) add(e.starts_on, e);
    if (e.ends_on! >= first && e.ends_on! <= last) add(e.ends_on!, e);
  }
  const spanning = events.filter(multiDay);
  const lead = (weekdayOfDay(first) + 6) % 7; // Monday first
  const cells: (string | null)[] = [...Array<null>(lead).fill(null)];
  for (let d = first; d <= last; d = addDays(d, 1)) cells.push(d);
  const days = [...byDay.keys()].sort();

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-16">
          <div className="grid grid-cols-7 text-center font-ui text-[13px] text-ink-3">
            {labels.weekdaysShort.map((w) => <span key={w} className="py-1">{w}</span>)}
          </div>
          <div className="grid grid-cols-7 border-t border-rule text-center font-ui text-[15px] tabular-nums">
            {cells.map((d, i) => {
              if (!d) return <span key={`x${i}`} />;
              const has = byDay.get(d);
              const holiday = has?.some((e) => e.kind === 'holiday');
              const cls = `flex h-10 flex-col items-center justify-center ${d === today ? 'outline outline-1 -outline-offset-1 outline-ink' : ''} ${d < today ? 'text-ink-3' : ''}`;
              const n = Number(d.slice(8));
              return has ? (
                <a key={d} href={`#d-${d}`} className={`${cls} font-bold hover:text-accent`} aria-label={formatDayWithWeekday(d, locale)}>
                  <span className={holiday ? 'text-accent' : ''}>{n}</span>
                  <span aria-hidden="true" className="mt-0.5 h-[3px] w-4 bg-accent" />
                </a>
              ) : (
                <span key={d} className={cls}>{n}</span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="lg:col-span-8">
        {spanning.length > 0 && (
          <section className="mb-2 border-y-2 border-rule-strong py-3" aria-labelledby="h-ongoing">
            <h2 id="h-ongoing" className="kicker mb-2">{labels.ongoing}</h2>
            <ul className="hairline-list">
              {spanning.map((e) => <li key={e.id} className="py-2"><EventLine e={e} locale={locale} labels={labels} showDate /></li>)}
            </ul>
          </section>
        )}
        {days.map((d) => <DayBlock key={d} day={d} events={byDay.get(d)!} locale={locale} labels={labels} today={today} />)}
      </div>
    </div>
  );
}

/** Next events, for the homepage block and the article sidebar: date column + line. */
export function UpcomingList({ events, locale, labels }: { events: CalendarEvent[]; locale: Lang; labels: AgendaLabels }) {
  return (
    <ul className="hairline-list -mt-3">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3 py-3">
          <p className="w-14 shrink-0 text-center">
            <span className="font-headline block text-[28px] leading-none font-bold tabular-nums">{Number(e.starts_on.slice(8))}</span>
            <span className="meta block">{formatCalendarDay(e.starts_on, locale).split(' ').slice(1).join(' ')}</span>
          </p>
          <EventLine e={e} locale={locale} labels={labels} />
        </li>
      ))}
    </ul>
  );
}

/** Box on an article page: the dates this article announces. */
export function ArticleEvents({ events, locale, labels, heading }: { events: CalendarEvent[]; locale: Lang; labels: AgendaLabels; heading: string }) {
  if (!events.length) return null;
  return (
    <aside className="my-8 border-y-2 border-rule-strong py-4" aria-label={heading}>
      <p className="kicker mb-2">{heading}</p>
      <ul className="hairline-list">
        {events.map((e) => (
          <li key={e.id} className="py-2">
            <EventLine e={{ ...e, article: null }} locale={locale} labels={labels} showDate calendar="button" />
          </li>
        ))}
      </ul>
    </aside>
  );
}
