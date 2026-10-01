import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { isAdmin, requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { ProfileForm, type ProfileData } from '@/components/admin/ProfileForm';

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ user?: string }> }) {
  const { locale } = await params;
  const me = await requireStaff(locale);
  const target = (await searchParams).user;
  const id = target && isAdmin(me) && /^[0-9a-f-]{36}$/.test(target) ? target : me.id;
  const t = await getTranslations({ locale, namespace: 'admin.profile' });
  const db = await sessionClient();
  const { data } = await db.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  let avatar: string | null = null;
  if (data.avatar_media_id) {
    const { data: m } = await db.from('media').select('storage_path, variants').eq('id', data.avatar_media_id).maybeSingle();
    avatar = m ? ((m.variants as Record<string, string>)?.['480'] ?? m.storage_path) : null;
  }
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}{id !== me.id ? ` — ${data.display_name_ar}` : ''}</h1>
      <ProfileForm self={id === me.id} initial={{ ...(data as ProfileData), social: data.social ?? {}, avatar_path: avatar }} />
    </div>
  );
}
