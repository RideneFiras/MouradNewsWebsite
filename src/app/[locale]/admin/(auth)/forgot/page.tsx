import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/admin/AuthCard';
import { ForgotForm } from '@/components/admin/ForgotForm';
import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';

export default async function Page({ params,  }: { params: Promise<{ locale: 'ar' | 'fr' }>; }) {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: 'admin.auth' });
  const settings = await getSettings();
  return (
    <AuthCard title={t('forgotTitle')} siteName={pick(settings.site_name, locale)}>
      <ForgotForm locale={locale} />
    </AuthCard>
  );
}
