import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPlaceTags, getSettings } from '@/lib/data/queries';
import type { AppLocale } from '@/lib/i18n/routing';
import { topicHref } from '@/lib/public/links';
import { pageMetadata } from '@/lib/seo/metadata';
import { SectionHeader } from '@/components/public/story';

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'agenda' });
  return pageMetadata({ locale, settings: await getSettings(), title: t('towns'), description: t('townsIntro'), path: '/towns' });
}

/** Every town (place tag), each linking to its own news page (/topic/{slug}). Towns are tags: add or rename them in the admin (الوسوم). */
export default async function TownsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'agenda' });
  const towns = await getPlaceTags();
  const name = (x: (typeof towns)[number]) => (locale === 'fr' ? x.name_fr || x.name_ar : x.name_ar);
  const sorted = [...towns].sort((a, b) => name(a).localeCompare(name(b), locale));
  return (
    <div className="container-page mt-8">
      <SectionHeader as="h1" title={t('towns')} />
      <p className="dek -mt-1 mb-6">{t('townsIntro')}</p>
      <ul className="grid grid-cols-2 border-t border-rule sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((x) => (
          <li key={x.id} className="border-b border-rule">
            <Link prefetch={false} href={topicHref(locale, x.slug)} className="font-headline block py-4 text-[22px] font-bold hover:text-accent">{name(x)}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
