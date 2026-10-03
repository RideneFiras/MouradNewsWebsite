import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getEventsBetween, getSettings } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { currentTimeMs, formatMonth, tunisDayKey } from '@/lib/format/date';
import { agendaLabels, shiftMonth } from '@/lib/public/agenda';
import { pageMetadata } from '@/lib/seo/metadata';
import { AgendaMonth } from '@/components/public/Agenda';
import { SectionHeader } from '@/components/public/story';

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ locale: AppLocale; month?: string[] }> };

/** "/agenda" = this month (Tunis time); "/agenda/2026-11" = that month. Two years each way. */
function resolveMonth(seg: string[] | undefined): string | null {
  const current = tunisDayKey(currentTimeMs()).slice(0, 7);
  if (!seg?.length) return current;
  if (seg.length !== 1 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(seg[0]!)) return null;
  const [cy] = current.split('-').map(Number) as [number];
  const [y] = seg[0]!.split('-').map(Number) as [number];
  return Math.abs(y - cy) <= 2 ? seg[0]! : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, month: seg } = await params;
  const month = resolveMonth(seg);
  const t = await getTranslations({ locale, namespace: 'agenda' });
  const isCurrent = !seg?.length;
  return pageMetadata({
    locale, settings: await getSettings(),
    title: month ? `${t('title')} — ${formatMonth(month, locale)}` : t('title'),
    description: t('intro'),
    path: isCurrent ? '/agenda' : `/agenda/${month}`,
    noindex: !isCurrent,
  });
}

export default async function AgendaPage({ params }: Params) {
  const { locale, month: seg } = await params;
  setRequestLocale(locale);
  const month = resolveMonth(seg);
  if (!month) notFound();
  const t = await getTranslations({ locale, namespace: 'agenda' });
  const today = tunisDayKey(currentTimeMs());
  const [y, m] = month.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const events = await getEventsBetween(`${month}-01`, last);
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const nav = (
    <p className="meta flex justify-between gap-4">
      <Link prefetch={false} href={`/${locale}/agenda/${prev}`} className="hover:text-accent">
        <span aria-hidden="true" className="inline-block ltr:-scale-x-100">→</span> {formatMonth(prev, locale)}
      </Link>
      <Link prefetch={false} href={`/${locale}/agenda/${next}`} className="hover:text-accent">
        {formatMonth(next, locale)} <span aria-hidden="true" className="inline-block ltr:-scale-x-100">←</span>
      </Link>
    </p>
  );
  return (
    <div className="container-page mt-8">
      <SectionHeader as="h1" title={`${t('title')} — ${formatMonth(month, locale)}`} />
      <p className="dek -mt-1 mb-4">{t('intro')}</p>
      {nav}
      <div className="mt-6">
        {events.length ? (
          <AgendaMonth month={month} events={events} locale={locale} labels={await agendaLabels(locale)} today={today} />
        ) : (
          <p className="dek border-t border-rule py-6">{t('empty')}</p>
        )}
      </div>
      <div className="mt-8 border-t border-rule pt-4">{nav}</div>
    </div>
  );
}
