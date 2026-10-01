import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { PageEditor, type PageData } from '@/components/admin/PageEditor';

export default async function Page({ params }: { params: Promise<{ locale: 'ar' | 'fr'; id: string }> }) {
  const p = await params;
  await requireStaff(p.locale, ['editor', 'admin']);
  const t = await getTranslations({ locale: p.locale, namespace: 'admin.pages' });
  let initial: PageData = { id: null, language: p.locale, title: '', slug: '', body_json: null, page_kind: 'standard', show_in_footer: false, status: 'draft', seo_title: '', seo_description: '', translation_group_id: null };
  if (!/^[0-9a-f-]{36}$/.test(p.id)) notFound();
  const db = await sessionClient();
  const { data } = await db.from('pages').select('*').eq('id', p.id).maybeSingle();
  if (!data) notFound();
  initial = { id: data.id, language: data.language, title: data.title, slug: data.slug, body_json: data.body_json, page_kind: data.page_kind, show_in_footer: data.show_in_footer, status: data.status, seo_title: data.seo_title ?? '', seo_description: data.seo_description ?? '', translation_group_id: data.translation_group_id };

  return (
    <div>
      <h1 className="a-h1 mb-4">{initial.title || t('new')}</h1>
      <PageEditor initial={initial} locale={p.locale} />
    </div>
  );
}
