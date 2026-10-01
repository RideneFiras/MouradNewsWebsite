'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { bulkArticles, copyArticle } from '@/lib/admin/articles';

export interface Row {
  id: string; public_id: number; title: string; status: string; language: 'ar' | 'fr'; section: string; authors: string;
  date: string; views: number | null; href: string | null; editable: boolean;
}

export function ArticlesTable({ rows, locale, canBulk, categories, tags }: {
  rows: Row[]; locale: string; canBulk: boolean; categories: { id: string; name: string }[]; tags: { id: string; name: string }[];
}) {
  const t = useTranslations('admin.articles');
  const ts = useTranslations('admin.status');
  const tc = useTranslations('admin.common');
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [action, setAction] = useState<'move' | 'archive' | 'tag'>('move');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  if (!rows.length) return <p className="text-ink-3">{t('noResults')}</p>;
  return (
    <div>
      {canBulk && sel.length > 0 && (
        <div className="a-panel mb-3 flex flex-wrap items-center gap-2 p-2">
          <span className="text-[14px]">{t('selected', { count: sel.length })}</span>
          <select className="a-select w-auto" value={action} onChange={(e) => { setAction(e.target.value as 'move'); setValue(''); }} aria-label={t('bulk')}>
            <option value="move">{t('bulkMove')}</option>
            <option value="archive">{t('bulkArchive')}</option>
            <option value="tag">{t('bulkTag')}</option>
          </select>
          {action !== 'archive' && (
            <select className="a-select w-auto" value={value} onChange={(e) => setValue(e.target.value)} aria-label={action === 'move' ? t('bulkMove') : t('bulkTag')}>
              <option value="">—</option>
              {(action === 'move' ? categories : tags).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          )}
          <button type="button" className="a-btn a-btn-sm a-btn-primary" disabled={busy || (action !== 'archive' && !value)} onClick={async () => {
            setBusy(true);
            const r = await bulkArticles(sel, action, value || undefined);
            setBusy(false);
            if (r.ok) { setSel([]); router.refresh(); }
          }}>{t('apply')}</button>
        </div>
      )}
      <div className="a-panel overflow-x-auto">
        <table className="a-table">
          <thead>
            <tr>
              {canBulk && <th><input type="checkbox" aria-label={tc('all')} checked={sel.length === rows.length} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])} /></th>}
              <th>{t('colTitle')}</th><th>{t('colStatus')}</th><th>{t('colSection')}</th><th>{t('colAuthors')}</th>
              <th>{t('colLanguage')}</th><th>{t('colDate')}</th><th>{t('colViews')}</th><th>{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {canBulk && <td><input type="checkbox" aria-label={r.title} checked={sel.includes(r.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))} /></td>}
                <td className="min-w-[260px]" lang={r.language}>
                  <Link href={`/${locale}/admin/articles/${r.id}`} className="font-semibold hover:text-accent">{r.title}</Link>
                  {!r.editable && <span className="ms-2 text-[12px] text-ink-3">({t('readOnly')})</span>}
                </td>
                <td><span className="a-chip" data-status={r.status}>{ts(r.status as 'draft')}</span></td>
                <td>{r.section}</td>
                <td>{r.authors}</td>
                <td>{r.language.toUpperCase()}</td>
                <td dir="ltr" className="whitespace-nowrap text-end">{r.date}</td>
                <td className="text-end tabular-nums">{r.views ?? '—'}</td>
                <td className="whitespace-nowrap">
                  <div className="flex gap-1">
                    <Link className="a-btn a-btn-sm" href={`/${locale}/admin/articles/${r.id}`}>{tc('edit')}</Link>
                    {r.href && <a className="a-btn a-btn-sm" href={r.href} target="_blank" rel="noopener">{t('viewOnSite')}</a>}
                    <button type="button" className="a-btn a-btn-sm" onClick={async () => { const x = await copyArticle(r.id, 'duplicate'); if (x.ok) router.push(`/${locale}/admin/articles/${x.data!.id}`); }}>{t('duplicate')}</button>
                    <button type="button" className="a-btn a-btn-sm" onClick={async () => { const x = await copyArticle(r.id, 'translate'); if (x.ok) router.push(`/${locale}/admin/articles/${x.data!.id}`); }}>{t('translate')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
