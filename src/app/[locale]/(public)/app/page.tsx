import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import type { AppLocale } from '@/lib/i18n/routing';
import { pageMetadata } from '@/lib/seo/metadata';
import { InstallApp } from '@/components/public/InstallApp';

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSettings();
  const t = await getTranslations({ locale, namespace: 'app' });
  return pageMetadata({ locale, settings, title: t('title', { site: pick(settings.site_name, locale) }), description: t('intro', { site: pick(settings.site_name, locale) }), path: '/app' });
}

/** /{locale}/app: how to put the paper on the phone's home screen (no app store). */
export default async function AppPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSettings();
  const site = pick(settings.site_name, locale);
  const t = await getTranslations({ locale, namespace: 'app' });
  return (
    <div className="container-page mt-8">
      <article className="mx-auto max-w-[var(--measure)]">
        <h1 className="headline-1 pb-2">{t('title', { site })}</h1>
        <div className="section-rule mb-6" />
        <p className="dek mb-4">{t('intro', { site })}</p>
        <p className="mb-8 border-s-[3px] border-accent ps-4 font-ui text-[16px] leading-relaxed">{t('inApp')}</p>
        <InstallApp labels={{
          install: t('install', { site }),
          installed: t('installed', { site }),
          androidTitle: t('androidTitle'),
          androidSteps: [t('android1'), t('android2')],
          iosTitle: t('iosTitle'),
          iosSteps: [t('ios1'), t('ios2'), t('ios3')],
        }} />
        <p className="meta mt-10 border-t border-rule pt-4">{t('privacy')}</p>
      </article>
    </div>
  );
}
