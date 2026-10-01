import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/admin/AuthCard';
import { LoginForm } from '@/components/admin/LoginForm';
import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';

export default async function Page({ params, searchParams, }: { params: Promise<{ locale: 'ar' | 'fr' }>; searchParams: Promise<Record<string, string | string[] | undefined>>; }) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'admin.auth' });
  const settings = await getSettings();
  return (
    <AuthCard title={t('loginTitle')} siteName={pick(settings.site_name, locale)}>
      <LoginForm locale={locale} next={typeof sp.next === 'string' ? sp.next : undefined} />
    </AuthCard>
  );
}
