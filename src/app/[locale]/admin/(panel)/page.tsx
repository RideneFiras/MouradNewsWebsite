import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { isEditor, requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { DashboardStats } from '@/components/admin/stats/DashboardStats';

const fmt = (iso: string | null) => (iso ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '');

type A = { id: string; title: string; language: string; updated_at: string; scheduled_for: string | null; review_note: string | null };

function List({ title, items, locale, empty, showSchedule = false }: { title: string; items: A[]; locale: string; empty: string; showSchedule?: boolean }) {
  return (
    <section className="a-panel p-4">
      <h2 className="a-h2 mb-2">{title} <span className="text-ink-3">({items.length})</span></h2>
      {items.length === 0 ? <p className="text-[14px] text-ink-3">{empty}</p> : (
        <ul className="divide-y divide-rule text-[14px]">
          {items.map((a) => (
            <li key={a.id} className="py-2">
              <Link prefetch={false} href={`/${locale}/admin/articles/${a.id}`} className="font-semibold hover:text-accent" lang={a.language}>{a.title}</Link>
              <span className="ms-2 text-ink-3" dir="ltr">{fmt(showSchedule ? a.scheduled_for : a.updated_at)}</span>
              {a.review_note && <p className="mt-1 text-warn">{a.review_note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Dashboard({ params }: { params: Promise<{ locale: 'ar' | 'fr' }> }) {
  const { locale } = await params;
  const staff = await requireStaff(locale);
  const t = await getTranslations({ locale, namespace: 'admin.dashboard' });
  const db = await sessionClient();
  const sel = 'id, title, language, updated_at, scheduled_for, review_note';
  const name = (locale === 'fr' ? staff.display_name_fr : null) || staff.display_name_ar;
  if (isEditor(staff)) {
    const [review, scheduled, drafts] = await Promise.all([
      db.from('articles').select(sel).eq('status', 'in_review').order('updated_at', { ascending: false }).limit(20),
      db.from('articles').select(sel).eq('status', 'scheduled').order('scheduled_for').limit(20),
      db.from('articles').select(sel).eq('status', 'draft').order('updated_at', { ascending: false }).limit(10),
    ]);
    return (
      <div className="space-y-6">
        <h1 className="a-h1">{t('hello', { name })}</h1>
        <DashboardStats locale={locale} scope="site" />
        <h2 className="a-h2">{t('queue')}</h2>
        <div className="grid gap-4 xl:grid-cols-3">
          <List title={t('waitingReview')} items={(review.data ?? []) as A[]} locale={locale} empty={t('nothing')} />
          <List title={t('scheduled')} items={(scheduled.data ?? []) as A[]} locale={locale} empty={t('nothing')} showSchedule />
          <List title={t('recentDrafts')} items={(drafts.data ?? []) as A[]} locale={locale} empty={t('nothing')} />
        </div>
      </div>
    );
  }
  const { data: mine } = await db.from('articles').select(sel + ', created_by').eq('status', 'draft').eq('created_by', staff.id).order('updated_at', { ascending: false }).limit(30);
  const rows = (mine ?? []) as unknown as A[];
  return (
    <div className="space-y-6">
      <h1 className="a-h1">{t('hello', { name })}</h1>
      <DashboardStats locale={locale} scope="me" />
      <div className="grid gap-4 xl:grid-cols-2">
        <List title={t('sentBack')} items={rows.filter((a) => a.review_note)} locale={locale} empty={t('nothing')} />
        <List title={t('myDrafts')} items={rows.filter((a) => !a.review_note)} locale={locale} empty={t('nothing')} />
      </div>
    </div>
  );
}
