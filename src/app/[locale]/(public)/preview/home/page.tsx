import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HomeSections } from '@/components/public/HomeSections';
import { getSettings, languagesFor } from '@/lib/data/queries';
import { resolveHomepage } from '@/lib/public/homepage';
import { getStaff, isEditor } from '@/lib/auth/staff';
import type { HomepageSection } from '@/lib/data/types';
import type { AppLocale } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Homepage preview with the builder's unsaved composition (editors only). */
export default async function PreviewHome({ params, searchParams }: { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ d?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const staff = await getStaff();
  if (!staff || !isEditor(staff)) notFound();
  let draft: Omit<HomepageSection, 'id' | 'position' | 'is_active'>[] = [];
  try {
    draft = JSON.parse(Buffer.from((await searchParams).d ?? '', 'base64url').toString('utf8'));
  } catch {
    notFound();
  }
  const sections = draft.slice(0, 40).map((s, i) => ({ ...s, id: `p${i}`, position: i, is_active: true })) as HomepageSection[];
  const settings = await getSettings();
  const t = await getTranslations({ locale, namespace: 'admin.homepage' });
  const resolved = await resolveHomepage(sections, locale, languagesFor(locale, settings));
  return (
    <>
      <p className="bg-ink py-2 text-center font-ui text-[14px] font-semibold text-paper">{t('previewNote')}</p>
      <HomeSections sections={resolved} locale={locale} />
    </>
  );
}
