import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { HomeEmpty, HomeSections } from '@/components/public/HomeSections';
import { getHomepageSections, getSettings, languagesFor } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import { resolveHomepage } from '@/lib/public/homepage';
import type { AppLocale } from '@/lib/i18n/routing';
import { homeMetadata } from '@/lib/seo/metadata';
import { homeJsonLd, JsonLd } from '@/lib/seo/jsonld';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const { locale } = await params;
  return homeMetadata(locale, await getSettings());
}

export default async function Home({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSettings();
  const sections = await resolveHomepage(await getHomepageSections(locale), locale, languagesFor(locale, settings));
  return (
    <>
      <h1 className="sr-only">{pick(settings.site_name, locale)} — {pick(settings.tagline, locale)}</h1>
      {sections.length ? <HomeSections sections={sections} locale={locale} /> : <HomeEmpty locale={locale} />}
      <JsonLd data={homeJsonLd(locale, settings)} />
    </>
  );
}
