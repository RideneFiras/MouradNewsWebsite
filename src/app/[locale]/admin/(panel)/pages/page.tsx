import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { pageHref } from '@/lib/public/links';

export default async function PagesList({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.pages' });
  const ts = await getTranslations({ locale, namespace: 'admin.status' });
  const tc = await getTranslations({ locale, namespace: 'admin.common' });
  const db = await sessionClient();
  const { data } = await db.from('pages').select('id, slug, language, title, status, page_kind, show_in_footer').order('language').order('position');
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><h1 className="a-h1">{t('title')}</h1><Link prefetch={false} className="a-btn a-btn-primary" href={`/${locale}/admin/pages/new`}>{t('new')}</Link></div>
      <div className="a-panel overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>{tc('language')}</th><th>{tc('titleAr')}</th><th>{t('kind')}</th><th>{t('showInFooter')}</th><th>{tc('actions')}</th></tr></thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id}>
                <td>{p.language.toUpperCase()}</td>
                <td lang={p.language}><Link prefetch={false} className="font-semibold hover:text-accent" href={`/${locale}/admin/pages/${p.id}`}>{p.title}</Link> <span className="a-chip ms-2" data-status={p.status}>{ts(p.status as 'draft')}</span></td>
                <td>{t(`kind_${p.page_kind}` as 'kind_about')}</td>
                <td>{p.show_in_footer ? '✓' : ''}</td>
                <td>{p.status === 'published' && <a className="a-btn a-btn-sm" target="_blank" rel="noopener" href={pageHref(p.language, p.slug, p.page_kind)}>{tc('open')}</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
