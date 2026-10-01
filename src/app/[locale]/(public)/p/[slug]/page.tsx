import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getPage, getSettings } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { redirectOr404 } from '@/lib/public/route-helpers';
import { pageSwitchHref } from '@/lib/public/static-page';
import { pageMetadata } from '@/lib/seo/metadata';
import { StaticPageView } from '@/components/public/StaticPageView';

export const revalidate = 60;

type Params = { params: Promise<{ locale: AppLocale; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getPage(locale, slug);
  if (!page) return {};
  return pageMetadata({ locale, settings: await getSettings(), title: page.seo_title || page.title, description: page.seo_description, path: `/p/${slug}`, bothLanguages: false });
}

export default async function StaticPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = await getPage(locale, slug);
  if (!page) return redirectOr404(`/${locale}/p/${slug}`);
  if (page.page_kind === 'media_kit') permanentRedirect(`/${locale}/advertise`);
  if (page.page_kind === 'contact') permanentRedirect(`/${locale}/contact`);
  return (
    <>
      <span hidden data-lang-switch={await pageSwitchHref(page, locale)} />
      <StaticPageView page={page} />
    </>
  );
}
