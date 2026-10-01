import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { PageEditor, type PageData } from '@/components/admin/PageEditor';

export default async function Page({ params }: { params: Promise<{ locale: 'ar' | 'fr' }> }) {
  const p = await params;
  await requireStaff(p.locale, ['editor', 'admin']);
  const t = await getTranslations({ locale: p.locale, namespace: 'admin.pages' });
  const initial: PageData = { id: null, language: p.locale, title: '', slug: '', body_json: null, page_kind: 'standard', show_in_footer: false, status: 'draft', seo_title: '', seo_description: '', translation_group_id: null };

  return (
    <div>
      <h1 className="a-h1 mb-4">{initial.title || t('new')}</h1>
      <PageEditor initial={initial} locale={p.locale} />
    </div>
  );
}
