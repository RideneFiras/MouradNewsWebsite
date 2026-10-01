import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { DEFAULT_SETTINGS, type MediaKitSettings } from '@/lib/data/settings';
import { MediaKitForm } from '@/components/admin/MediaKitForm';

export default async function MediaKitSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: l } = await params;
  const locale = l === 'fr' ? 'fr' : 'ar';
  await requireStaff(locale, ['admin']);
  const t = await getTranslations({ locale, namespace: 'admin.mediaKit' });
  const db = await sessionClient();
  const [{ data: row }, { data: page }] = await Promise.all([
    db.from('site_settings').select('value').eq('key', 'media_kit').maybeSingle(),
    db.from('pages').select('id').eq('page_kind', 'media_kit').eq('language', locale).maybeSingle(),
  ]);
  const cfg = { ...DEFAULT_SETTINGS.media_kit, ...((row?.value ?? {}) as Partial<MediaKitSettings>) };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="a-h1">{t('title')}</h1>
        <a href={`/${locale}/advertise`} target="_blank" rel="noopener" className="a-btn a-btn-sm">{t('preview')}</a>
      </div>
      <p className="a-notice">{t('help')}</p>
      <p className="text-[14px]">
        {t('pitchHelp')}{' '}
        {page && <Link prefetch={false} href={`/${locale}/admin/pages/${page.id}`} className="underline">{t('editPitch')}</Link>}
      </p>
      <MediaKitForm initial={cfg} />
    </div>
  );
}
