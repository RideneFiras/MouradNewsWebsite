import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { MenusManager, type MenuRow } from '@/components/admin/MenusManager';

export default async function MenusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.menus' });
  const db = await sessionClient();
  const [m, c, p, tg] = await Promise.all([
    db.from('menu_items').select('*').order('position'),
    db.from('categories').select('id, name_ar').order('position'),
    db.from('pages').select('id, title, language').order('position'),
    db.from('tags').select('id, name_ar').order('name_ar'),
  ]);
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}</h1>
      <MenusManager initial={(m.data ?? []) as MenuRow[]} categories={(c.data ?? []).map((x) => ({ id: x.id, name: x.name_ar }))}
        pages={(p.data ?? []).map((x) => ({ id: x.id, name: `${x.title} (${x.language.toUpperCase()})` }))} tags={(tg.data ?? []).map((x) => ({ id: x.id, name: x.name_ar }))} />
    </div>
  );
}
