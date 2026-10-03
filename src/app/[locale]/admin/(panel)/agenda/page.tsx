import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { currentTimeMs, tunisDayKey } from '@/lib/format/date';
import { EventsManager, type EventRow } from '@/components/admin/EventsManager';

export default async function AgendaAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.agenda' });
  const db = await sessionClient();
  const [{ data: events }, { data: towns }] = await Promise.all([
    db.from('events').select('*, article:articles!events_article_id_fkey(public_id, title, status)').order('starts_on', { ascending: true }).limit(1000),
    db.from('tags').select('id, name_ar').eq('kind', 'place').order('name_ar'),
  ]);
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}</h1>
      <EventsManager
        initial={(events ?? []) as EventRow[]}
        towns={(towns ?? []).map((x) => ({ id: x.id as string, name: x.name_ar as string }))}
        today={tunisDayKey(currentTimeMs())}
      />
    </div>
  );
}
