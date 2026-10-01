import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { toTunisLocal } from '@/lib/ads/status';
import { CampaignForm } from '@/components/admin/ads/CampaignForm';
import { campaignFormData } from '../editor-data';

export default async function EditCampaign({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: l, id } = await params;
  const locale = l === 'fr' ? 'fr' : 'ar';
  await requireStaff(locale, ['admin']);
  const t = await getTranslations({ locale, namespace: 'admin.ads' });
  const db = await sessionClient();
  const { data: c } = await db.from('ad_campaigns').select('*').eq('id', id).maybeSingle();
  if (!c) notFound();
  const data = await campaignFormData(locale, [c.creative_desktop_media_id, c.creative_mobile_media_id]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="a-h1">{t('editCampaign')}</h1>
        <Link prefetch={false} href={`/${locale}/admin/ads/campaigns/${id}/report`} className="underline">{t('report')}</Link>
      </div>
      <CampaignForm locale={locale} {...data} initial={{
        id: c.id, sponsor_name: c.sponsor_name, slot_key: c.slot_key, locale: c.locale,
        creative_desktop_media_id: c.creative_desktop_media_id, creative_mobile_media_id: c.creative_mobile_media_id,
        click_url: c.click_url, alt_text: c.alt_text ?? '', starts_at: toTunisLocal(c.starts_at), ends_at: toTunisLocal(c.ends_at),
        weight: c.weight, category_ids: c.category_ids ?? [], is_active: c.is_active, notes: c.notes ?? '',
      }} />
    </div>
  );
}
