import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { CategoriesManager, type Cat } from '@/components/admin/CategoriesManager';

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.categories' });
  const db = await sessionClient();
  const [{ data: cats }, { data: counts }] = await Promise.all([
    db.from('categories').select('*').order('position'),
    db.rpc('category_article_counts'),
  ]);
  const map: Record<string, number> = {};
  for (const r of (counts ?? []) as { category_id: string; n: number }[]) map[r.category_id] = Number(r.n);
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}</h1>
      <CategoriesManager initial={(cats ?? []) as Cat[]} counts={map} />
    </div>
  );
}
