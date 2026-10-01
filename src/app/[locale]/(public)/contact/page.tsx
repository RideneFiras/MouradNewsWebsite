import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPageByKind, getSettings } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { pageSwitchHref } from '@/lib/public/static-page';
import { pageMetadata } from '@/lib/seo/metadata';
import { StaticPageView } from '@/components/public/StaticPageView';
import { ContactForm } from '@/components/public/ContactForm';

export const revalidate = 60;

// Rendered on first request, then cached (ISR) — nothing is prerendered at build time,
// so building doesn't need database access.
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPageByKind(locale, 'contact');
  const t = await getTranslations({ locale, namespace: 'contact' });
  return pageMetadata({ locale, settings: await getSettings(), title: page?.seo_title || page?.title || t('details'), description: page?.seo_description, path: '/contact' });
}

export default async function ContactPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageByKind(locale, 'contact');
  if (!page) notFound();
  const t = await getTranslations({ locale, namespace: 'contact' });
  const tm = await getTranslations({ locale, namespace: 'masthead' });
  const settings = await getSettings();
  const lm = settings.legal_masthead ?? {};
  const address = (locale === 'fr' ? lm.address_fr : lm.address_ar) || lm.address_ar || '';
  const details: [string, string, string?][] = ([
    [t('address'), address],
    [t('phone'), lm.phone ?? '', lm.phone ? `tel:${lm.phone.replace(/\s/g, '')}` : undefined],
    [tm('email'), lm.email ?? '', lm.email ? `mailto:${lm.email}` : undefined],
    [t('adsContact'), [lm.ads_email, lm.ads_phone].filter(Boolean).join(' · ')],
  ] as [string, string, string?][]).filter(([, v]) => v);
  const labels = Object.fromEntries(
    (['name', 'email', 'subject', 'message', 'send', 'sending', 'sent', 'failed', 'subject_news_tip', 'subject_advertising', 'subject_correction', 'subject_other'] as const).map((k) => [k, t(k)]),
  ) as Parameters<typeof ContactForm>[0]['labels'];
  return (
    <>
      <span hidden data-lang-switch={await pageSwitchHref(page, locale)} />
      <StaticPageView page={page}>
        <div className="mt-8 border-t-2 border-rule-strong pt-6"><ContactForm locale={locale} labels={labels} /></div>
        {details.length > 0 && (
          <section className="mt-10 border-t border-rule pt-6">
            <h2 className="kicker mb-3 text-ink">{t('details')}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-ui text-[15px]">
              {details.map(([k, v, href]) => (
                <div key={k} className="contents">
                  <dt className="text-ink-3">{k}</dt>
                  <dd>{href ? <a href={href} dir="ltr" className="hover:text-accent">{v}</a> : <bdi>{v}</bdi>}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </StaticPageView>
    </>
  );
}
