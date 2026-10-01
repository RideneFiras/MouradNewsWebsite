import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getMediaKitNumbers, getPageByKind, getSettings } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { pageSwitchHref } from '@/lib/public/static-page';
import { pageMetadata } from '@/lib/seo/metadata';
import { StaticPageView } from '@/components/public/StaticPageView';
import { MediaKit } from '@/components/public/MediaKit';

// Numbers are cached for one hour (docs/07); the page itself refreshes every minute.
export const revalidate = 60;

type Params = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPageByKind(locale, 'media_kit');
  if (!page) return {};
  return pageMetadata({ locale, settings: await getSettings(), title: page.seo_title || page.title, description: page.seo_description, path: '/advertise' });
}

export default async function AdvertisePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageByKind(locale, 'media_kit');
  if (!page) notFound();
  const [settings, numbers] = await Promise.all([getSettings(), getMediaKitNumbers()]);
  return (
    <>
      <span hidden data-lang-switch={await pageSwitchHref(page, locale)} />
      <StaticPageView page={page}>
        <MediaKit locale={locale} numbers={numbers} cfg={settings.media_kit} />
      </StaticPageView>
    </>
  );
}
