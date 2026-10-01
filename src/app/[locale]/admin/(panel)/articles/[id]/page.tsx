import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { loadEditor } from '@/lib/admin/editor-data';
import { ArticleEditor } from '@/components/admin/editor/ArticleEditor';

export default async function Page({ params }: { params: Promise<{ locale: 'ar' | 'fr'; id: string }> }) {
  const p = await params;
  const locale = p.locale;
  const id = p.id;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const staff = await requireStaff(locale);
  const t = await getTranslations({ locale, namespace: 'admin.nav' });
  const { article, options } = await loadEditor(staff, locale, id);
  return (
    <div>
      <h1 className="a-h1 mb-4">{article.id ? article.title || t('articles') : t('newArticle')}</h1>
      <ArticleEditor key={article.id ?? 'new'} initial={article} options={options} role={staff.role} userId={staff.id} locale={locale} />
    </div>
  );
}
