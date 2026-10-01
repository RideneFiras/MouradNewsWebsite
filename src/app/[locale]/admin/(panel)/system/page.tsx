import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { RegenerateButton } from '@/components/admin/RegenerateButton';

const MB = 1024 * 1024;
const fmt = (b: number) => `${(b / MB).toFixed(1)} MB`;
const pct = (b: number, limit: number) => Math.min(100, Math.round((b / limit) * 100));

export default async function SystemPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale, ['admin']);
  const t = await getTranslations({ locale, namespace: 'admin.system' });
  const db = await sessionClient();
  const { data } = await db.rpc('admin_system_status');
  const s = (data ?? {}) as { db_size_bytes?: number; storage_bytes?: number; raw_pageviews?: number; raw_engagement?: number; last_rollups?: { job: string; started_at: string; status: string; detail: string | null }[]; cron_jobs?: { name: string; schedule: string; active: boolean }[] };
  const bar = (label: string, used: number, limit: number) => (
    <div>
      <p className="mb-1 flex justify-between text-[14px]"><span>{label}</span><span dir="ltr">{fmt(used)} / {fmt(limit)}</span></p>
      <div className="h-2 rounded bg-paper-2"><div className="h-2 rounded bg-ink" style={{ width: `${pct(used, limit)}%` }} /></div>
    </div>
  );
  return (
    <div className="space-y-4">
      <h1 className="a-h1">{t('title')}</h1>
      <section className="a-panel space-y-4 p-4">
        {bar(t('db'), s.db_size_bytes ?? 0, 500 * MB)}
        {bar(t('storage'), s.storage_bytes ?? 0, 1024 * MB)}
        <p className="text-[14px]">{t('rawRows')}: <span className="tabular-nums">{s.raw_pageviews ?? 0}</span> / <span className="tabular-nums">{s.raw_engagement ?? 0}</span></p>
        <p className="a-help">{t('pauseNote')}</p>
      </section>
      <section className="a-panel p-4">
        <h2 className="a-h2 mb-2">{t('rollups')}</h2>
        <table className="a-table"><tbody>
          {(s.last_rollups ?? []).map((r, i) => <tr key={i}><td>{r.job}</td><td dir="ltr">{new Date(r.started_at).toISOString().replace('T', ' ').slice(0, 16)} UTC</td><td>{r.status}</td><td dir="ltr">{r.detail}</td></tr>)}
        </tbody></table>
        <h2 className="a-h2 mt-4 mb-2">{t('cron')}</h2>
        <ul className="text-[14px]" dir="ltr">{(s.cron_jobs ?? []).map((j) => <li key={j.name}>{j.name} — <code>{j.schedule}</code> {j.active ? '' : '(off)'}</li>)}</ul>
      </section>
      <section className="a-panel space-y-3 p-4">
        <p className="text-[14px]">{t('build')}: <span dir="ltr">{process.env.BUILD_ID ?? process.env.NEXT_PUBLIC_BUILD_TIME ?? 'local'}</span></p>
        <RegenerateButton label={t('regenerate')} done={t('regenerated')} />
      </section>
    </div>
  );
}
