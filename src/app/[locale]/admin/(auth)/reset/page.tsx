import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/admin/AuthCard';
import { ResetForm } from '@/components/admin/ResetForm';
import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';

export default async function Page({ params,  }: { params: Promise<{ locale: 'ar' | 'fr' }>; }) {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'admin.auth' });
  const settings = await getSettings();
  return (
    <AuthCard title={t('resetTitle')} siteName={pick(settings.site_name, locale)}>
      <ResetForm locale={locale} />
    </AuthCard>
  );
}
