import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { MessagesList, type Msg } from '@/components/admin/MessagesList';

export default async function MessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.messages' });
  const db = await sessionClient();
  const { data } = await db.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(300);
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}</h1>
      <MessagesList initial={(data ?? []) as Msg[]} />
    </div>
  );
}
