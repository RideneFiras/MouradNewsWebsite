import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { FormatsManager, type FormatRow } from '@/components/admin/FormatsManager';

export default async function FormatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.formats' });
  const db = await sessionClient();
  const { data } = await db.from('article_formats').select('*').order('position');
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}</h1>
      <FormatsManager initial={(data ?? []) as FormatRow[]} />
    </div>
  );
}
