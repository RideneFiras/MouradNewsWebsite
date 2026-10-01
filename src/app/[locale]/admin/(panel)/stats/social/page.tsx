import { connection } from 'next/server';
import { currentTimeMs } from '@/lib/format/date';
import { getSocial } from '@/lib/stats/data';
import { statsContext, type SearchParams } from '@/lib/stats/page';
import { SocialManager } from '@/components/admin/stats/SocialManager';
import { StatsHeader } from '@/components/admin/stats/ui';

export default async function StatsSocial({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale, editor, range, staff, today } = await statsContext(params, searchParams, ['editor', 'admin']);
  await connection();
  const rows = await getSocial(100);
  const nowMs = currentTimeMs();
  return (
    <div className="space-y-6">
      <StatsHeader locale={locale} tab="social" range={range} isEditor={editor} showRange={false} />
      <SocialManager me={staff.id} today={today} nowMs={nowMs}
        initial={rows.map(({ profiles, ...r }) => ({ ...r, entered_by_name: profiles?.display_name_ar ?? null }))} />
    </div>
  );
}
