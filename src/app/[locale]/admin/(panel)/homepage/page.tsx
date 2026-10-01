import { getTranslations } from 'next-intl/server';
import { requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';
import { HomepageBuilder } from '@/components/admin/HomepageBuilder';
import type { BuilderSection } from '@/lib/admin/homepage-types';

export default async function HomepagePage({ params, searchParams }: { params: Promise<{ locale: 'ar' | 'fr' }>; searchParams: Promise<{ tab?: string }> }) {
  const { locale } = await params;
  const tab = (await searchParams).tab === 'fr' ? 'fr' : (await searchParams).tab === 'ar' ? 'ar' : locale;
  await requireStaff(locale, ['editor', 'admin']);
  const t = await getTranslations({ locale, namespace: 'admin.homepage' });
  const db = await sessionClient();
  const [secs, cats, fmts, tags, slots] = await Promise.all([
    db.from('homepage_sections').select('*').in('locale', [tab, 'both']).order('position'),
    db.from('categories').select('id, name_ar, name_fr, parent_id').order('position'),
    db.from('article_formats').select('id, name_ar, name_fr').order('position'),
    db.from('tags').select('id, name_ar, name_fr').order('name_ar'),
    db.from('ad_slots').select('key, label_ar, label_fr').order('key'),
  ]);
  const nm = (x: { name_ar: string; name_fr: string | null }) => (locale === 'fr' ? x.name_fr || x.name_ar : x.name_ar);
  return (
    <div>
      <h1 className="a-h1 mb-4">{t('title')}</h1>
      <HomepageBuilder key={tab} tab={tab} locale={locale} initial={(secs.data ?? []) as BuilderSection[]}
        categories={(cats.data ?? []).map((c) => ({ id: c.id, name: (c.parent_id ? '— ' : '') + nm(c) }))}
        formats={(fmts.data ?? []).map((f) => ({ id: f.id, name: nm(f) }))}
        tags={(tags.data ?? []).map((x) => ({ id: x.id, name: nm(x) }))}
        adSlots={(slots.data ?? []).map((s) => ({ key: s.key, name: (locale === 'fr' ? s.label_fr : null) || s.label_ar }))} />
    </div>
  );
}
