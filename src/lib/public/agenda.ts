import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { AgendaLabels } from '@/components/public/Agenda';
import type { Lang } from '@/lib/data/types';

export async function agendaLabels(locale: Lang): Promise<AgendaLabels> {
  const t = await getTranslations({ locale, namespace: 'agenda' });
  return {
    holiday: t('holiday'),
    estimate: t('estimate'),
    readArticle: t('readArticle'),
    addToCalendar: t('addToCalendar'),
    until: t('until'),
    today: t('today'),
    ongoing: t('ongoing'),
    from: t('from'),
    weekdaysShort: t.raw('weekdaysShort') as string[],
  };
}

/** "YYYY-MM" of the month n months after `month`. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
