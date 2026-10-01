import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { isEditor, requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { articleHref } from '@/lib/public/links';
import { daysAgoIso } from '@/lib/format/date';
import { ArticlesTable, type Row } from '@/components/admin/ArticlesTable';

const PER = 50;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '');

export default async function ArticlesPage({ params, searchParams }: { params: Promise<{ locale: 'ar' | 'fr' }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const staff = await requireStaff(locale);
  const t = await getTranslations({ locale, namespace: 'admin.articles' });
  const ts = await getTranslations({ locale, namespace: 'admin.status' });
  const tc = await getTranslations({ locale, namespace: 'admin.common' });
  const db = await sessionClient();
  const f = { status: one(sp.status), section: one(sp.section), author: one(sp.author), lang: one(sp.lang), q: one(sp.q), from: one(sp.from), to: one(sp.to) };
  const page = Math.max(1, Number(one(sp.page)) || 1);

  let q = db.from('articles')
    .select('id, public_id, title, status, language, slug, category_id, published_at, updated_at, created_by, article_authors(profile_id)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range((page - 1) * PER, page * PER - 1);
  if (f.status) q = q.eq('status', f.status);
  if (f.section) q = q.eq('category_id', f.section);
  if (f.lang === 'ar' || f.lang === 'fr') q = q.eq('language', f.lang);
  if (f.q) q = q.ilike('title', `%${f.q.replace(/[%_]/g, '')}%`);
  if (f.from) q = q.gte('updated_at', `${f.from}T00:00:00+01:00`);
  if (f.to) q = q.lte('updated_at', `${f.to}T23:59:59+01:00`);
  if (f.author) {
    const { data: ids } = await db.from('article_authors').select('article_id').eq('profile_id', f.author);
    q = q.in('id', (ids ?? []).map((x) => x.article_id).concat('00000000-0000-0000-0000-000000000000'));
  }
  const [{ data, count }, cats, people, tags] = await Promise.all([
    q,
    db.from('categories').select('id, name_ar, name_fr, parent_id').order('position'),
    db.from('profiles').select('id, display_name_ar, display_name_fr').order('display_name_ar'),
    db.from('tags').select('id, name_ar, name_fr').order('name_ar').limit(500),
  ]);
  const nm = (x: { name_ar?: string; name_fr?: string | null; display_name_ar?: string; display_name_fr?: string | null }) =>
    (locale === 'fr' ? x.name_fr ?? x.display_name_fr : null) || x.name_ar || x.display_name_ar || '';
  const catMap = new Map((cats.data ?? []).map((c) => [c.id, nm(c)]));
  const pplMap = new Map((people.data ?? []).map((p) => [p.id, nm(p)]));

  // 7-day views (editors/admins can read the rollups).
  const views = new Map<string, number>();
  if (isEditor(staff) && data?.length) {
    const since = daysAgoIso(7).slice(0, 10);
    const { data: v } = await db.from('analytics_daily_article').select('article_id, pageviews').gte('date', since).in('article_id', data.map((r) => r.id));
    for (const r of v ?? []) views.set(r.article_id, (views.get(r.article_id) ?? 0) + r.pageviews);
  }

  const rows: Row[] = (data ?? []).map((r) => {
    const authorIds = ((r.article_authors ?? []) as { profile_id: string }[]).map((x) => x.profile_id);
    const mine = r.created_by === staff.id || authorIds.includes(staff.id);
    return {
      id: r.id, public_id: r.public_id, title: r.title, status: r.status, language: r.language,
      section: catMap.get(r.category_id) ?? '', authors: authorIds.map((id) => pplMap.get(id) ?? '').join('، '),
      date: fmt(r.published_at ?? r.updated_at), views: isEditor(staff) ? views.get(r.id) ?? 0 : null,
      href: r.status === 'published' ? articleHref({ public_id: r.public_id, slug: r.slug, language: r.language }) : null,
      editable: isEditor(staff) || (mine && ['draft', 'in_review'].includes(r.status)),
    };
  });
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PER));
  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
    if (p > 1) u.set('page', String(p));
    return `?${u.toString()}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="a-h1">{f.status === 'in_review' ? ts('in_review') : t('title')}</h1>
        <Link href={`/${locale}/admin/articles/new`} className="a-btn a-btn-primary">{t('new')}</Link>
      </div>
      <form className="a-panel mb-4 grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4" method="get">
        <input name="q" defaultValue={f.q} className="a-input" placeholder={t('searchTitle')} aria-label={t('searchTitle')} />
        <select name="status" defaultValue={f.status} className="a-select" aria-label={t('colStatus')}>
          <option value="">{t('allStatuses')}</option>
          {['draft', 'in_review', 'scheduled', 'published', 'archived'].map((s) => <option key={s} value={s}>{ts(s as 'draft')}</option>)}
        </select>
        <select name="section" defaultValue={f.section} className="a-select" aria-label={t('colSection')}>
          <option value="">{t('allSections')}</option>
          {(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.parent_id ? '— ' : ''}{nm(c)}</option>)}
        </select>
        <select name="author" defaultValue={f.author} className="a-select" aria-label={t('colAuthors')}>
          <option value="">{t('allAuthors')}</option>
          {(people.data ?? []).map((p) => <option key={p.id} value={p.id}>{nm(p)}</option>)}
        </select>
        <select name="lang" defaultValue={f.lang} className="a-select" aria-label={t('colLanguage')}>
          <option value="">{t('allLanguages')}</option>
          <option value="ar">{tc('arabic')}</option>
          <option value="fr">{tc('french')}</option>
        </select>
        <label className="flex items-center gap-2 text-[14px]">{t('from')}<input type="date" name="from" defaultValue={f.from} className="a-input" dir="ltr" /></label>
        <label className="flex items-center gap-2 text-[14px]">{t('to')}<input type="date" name="to" defaultValue={f.to} className="a-input" dir="ltr" /></label>
        <button type="submit" className="a-btn">{tc('filter')}</button>
      </form>
      <ArticlesTable rows={rows} locale={locale} canBulk={isEditor(staff)}
        categories={(cats.data ?? []).map((c) => ({ id: c.id, name: nm(c) }))} tags={(tags.data ?? []).map((x) => ({ id: x.id, name: nm(x) }))} />
      {totalPages > 1 && (
        <nav className="mt-4 flex items-center gap-3 text-[14px]" aria-label="pagination">
          {page > 1 && <Link className="a-btn a-btn-sm" href={qs(page - 1)}>{tc('previous')}</Link>}
          <span>{tc('page', { n: page })} {tc('of')} {totalPages}</span>
          {page < totalPages && <Link className="a-btn a-btn-sm" href={qs(page + 1)}>{tc('next')}</Link>}
        </nav>
      )}
    </div>
  );
}
