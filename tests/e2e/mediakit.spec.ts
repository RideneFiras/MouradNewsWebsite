import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ANON_KEY, SUPABASE_URL, revalidate, service } from './helpers';

const db = service();
const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const group = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n).replace(/\s/g, ' ');
let original: unknown;
let pageStatus: string | null = null;

test.describe.serial('media kit', () => {
  test.beforeAll(async () => {
    original = (await db.from('site_settings').select('value').eq('key', 'media_kit').single()).data!.value;
    // The seeded «أعلن معنا» page is a draft until the owner reviews it.
    pageStatus = (await db.from('pages').select('status').eq('page_kind', 'media_kit').eq('language', 'ar').single()).data!.status;
    await db.from('pages').update({ status: 'published' }).eq('page_kind', 'media_kit').eq('language', 'ar');
  });
  test.afterAll(async () => {
    await db.from('site_settings').update({ value: original }).eq('key', 'media_kit');
    if (pageStatus) await db.from('pages').update({ status: pageStatus }).eq('page_kind', 'media_kit').eq('language', 'ar');
  });

  test('admin hides a metric and rounds down; the public page follows', async ({ page, baseURL }) => {
    await page.goto('/ar/admin/login');
    await page.fill('#email', 'admin@elborj.test');
    await page.fill('#password', 'local-dev-password');
    await Promise.all([page.waitForURL(/\/ar\/admin(?!\/login)/), page.click('button[type=submit]')]);
    await page.goto('/ar/admin/media-kit');
    await page.getByLabel('متوسط مدة القراءة الفعلية').uncheck();
    await page.getByLabel('مشاهدات الصفحات الشهرية').check();
    await page.getByLabel(/أرقام مقرّبة إلى الأسفل/).check();
    await page.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('تم الحفظ')).toBeVisible();

    // The numbers come only from media_kit_public(): engaged time is gone, page views rounded down.
    const { data: rounded } = await anon.rpc('media_kit_public');
    const r = rounded as Record<string, unknown>;
    expect(r.engaged_avg_seconds).toBeUndefined();
    const { data: exactRow } = await db.from('analytics_daily').select('pageviews, date').eq('dimension', 'site').gte('date', String(r.from)).lte('date', String(r.to));
    const exact = (exactRow ?? []).reduce((s, x) => s + x.pageviews, 0);
    expect(Number(r.monthly_pageviews)).toBeLessThanOrEqual(exact);

    await page.context().clearCookies();
    await revalidate(baseURL!, ['stats', 'settings', 'pages']);
    await page.goto('/ar/advertise');
    await expect(page.getByText('مدة القراءة الفعلية')).toHaveCount(0);
    if (exact > 0) {
      const pv = Number(r.monthly_pageviews);
      const shown = pv >= 1000 && pv % 1000 === 0 ? `${group(pv / 1000)} ألف` : group(pv);
      await expect(page.locator('dd', { hasText: shown }).first()).toBeVisible();
      await expect(page.getByText(/أكثر من/).first()).toBeVisible();
    }
  });
});
