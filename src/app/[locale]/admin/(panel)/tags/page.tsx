import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { TagsManager, type TagRow } from '@/components/admin/TagsManager';

export default async function TagsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.tags' });
  const db = await sessionClient();
  const [{ data: tags }, { data: links }] = await Promise.all([
    db.from('tags').select('*').order('name_ar'),
    db.from('article_tags').select('tag_id'),
  ]);
  const counts = new Map<string, number>();
  for (const l of links ?? []) counts.set(l.tag_id, (counts.get(l.tag_id) ?? 0) + 1);
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}</h1>
      <TagsManager initial={((tags ?? []) as TagRow[]).map((x) => ({ ...x, count: counts.get(x.id) ?? 0 }))} />
    </div>
  );
}
