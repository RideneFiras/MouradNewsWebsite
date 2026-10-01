import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { TeamManager, type Member } from '@/components/admin/TeamManager';

export default async function TeamPage({ params }: { params: Promise<{ locale: 'ar' | 'fr' }> }) {
  const { locale } = await params;
  const me = await requireStaff(locale, ['admin']);
  const t = await getTranslations({ locale, namespace: 'admin.team' });
  const db = await sessionClient();
  const { data } = await db.rpc('admin_list_users');
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}</h1>
      <TeamManager members={(data ?? []) as Member[]} locale={locale} me={me.id} />
    </div>
  );
}
