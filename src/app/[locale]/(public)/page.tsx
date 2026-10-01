import { setRequestLocale } from 'next-intl/server';
import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import type { AppLocale } from '@/lib/i18n/routing';

export const revalidate = 60;

export default async function Home({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSettings();
  return <h1 className="nameplate text-5xl">{pick(settings.site_name, locale)}</h1>;
}
