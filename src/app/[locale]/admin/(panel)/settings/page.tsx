import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { DEFAULT_SETTINGS } from '@/lib/data/settings';
import { SettingsForm } from '@/components/admin/SettingsForm';

const KEYS = ['site_name', 'tagline', 'logo', 'favicon_media_id', 'default_og_media_id', 'masthead_ears', 'legal_masthead', 'social_links', 'show_hijri_date',
  'breaking', 'content_mixing', 'ga4', 'adsense', 'consent', 'in_article_ads', 'analytics', 'home_text_block'];

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale, ['admin']);
  const t = await getTranslations({ locale, namespace: 'admin.settings' });
  const db = await sessionClient();
  const { data } = await db.from('site_settings').select('key, value').in('key', KEYS);
  const values: Record<string, unknown> = {};
  for (const k of KEYS) values[k] = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[k] ?? null;
  values.analytics = { raw_retention_days: 60, exclude_staff: true };
  for (const r of data ?? []) values[r.key] = typeof r.value === 'object' && r.value && !Array.isArray(r.value) ? { ...(values[r.key] as object), ...r.value } : r.value;
  const ids = [(values.logo as { media_id?: string })?.media_id, values.favicon_media_id, values.default_og_media_id].filter(Boolean) as string[];
  const media: Record<string, string> = {};
  if (ids.length) {
    const { data: m } = await db.from('media').select('id, storage_path, variants').in('id', ids);
    for (const x of m ?? []) media[x.id] = (x.variants as Record<string, string>)?.['480'] ?? x.storage_path;
  }
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}</h1>
      <SettingsForm initial={values as Record<string, Record<string, unknown> | string | null>} media={media} />
    </div>
  );
}
