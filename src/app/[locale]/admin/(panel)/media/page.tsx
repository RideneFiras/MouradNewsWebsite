import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { listMedia } from '@/lib/admin/media';
import { sessionClient } from '@/lib/supabase/server';
import { MediaLibrary } from '@/components/admin/MediaLibrary';

export default async function MediaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale);
  const t = await getTranslations({ locale, namespace: 'admin.media' });
  const res = await listMedia({ page: 1 });
  const db = await sessionClient();
  const { data: people } = await db.from('profiles').select('id, display_name_ar, display_name_fr').order('display_name_ar');
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}</h1>
      <MediaLibrary initial={res.ok ? res.data!.items : []} total={res.ok ? res.data!.total : 0}
        uploaders={(people ?? []).map((p) => ({ id: p.id, name: (locale === 'fr' ? p.display_name_fr : null) || p.display_name_ar }))} />
    </div>
  );
}
