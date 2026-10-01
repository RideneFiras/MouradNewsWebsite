import { connection } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { currentTimeMs } from '@/lib/format/date';
import { toTunisLocal } from '@/lib/ads/status';
import { CampaignForm } from '@/components/admin/ads/CampaignForm';
import { campaignFormData } from '../editor-data';

export default async function NewCampaign({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: l } = await params;
  const locale = l === 'fr' ? 'fr' : 'ar';
  await requireStaff(locale, ['admin']);
  await connection();
  const t = await getTranslations({ locale, namespace: 'admin.ads' });
  const data = await campaignFormData(locale, []);
  const start = toTunisLocal(new Date(currentTimeMs()).toISOString());
  return (
    <div className="space-y-4">
      <h1 className="a-h1">{t('newCampaign')}</h1>
      <CampaignForm locale={locale} {...data} initial={{
        sponsor_name: '', slot_key: data.slots.find((s) => s.key === 'sidebar_top')?.key ?? data.slots[0]?.key ?? '', locale: 'both',
        creative_desktop_media_id: null, creative_mobile_media_id: null, click_url: '', alt_text: '',
        starts_at: start, ends_at: '', weight: 1, category_ids: [], is_active: true, notes: '',
      }} />
    </div>
  );
}
