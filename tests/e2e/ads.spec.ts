import { expect, test, type Page } from '@playwright/test';
import { revalidate, service } from './helpers';
// @ts-expect-error plain ESM helper without types
import { routeRemoteImages } from '../support/route-images.mjs';

const PASSWORD = 'local-dev-password';
const db = service();
const SPONSOR = `[تجريبي] معلن اختبار ${Date.now()}`;
const CLICK_URL = 'https://sponsor.example/landing';
let campaignId = '';
let articlePath = '';

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/ar/admin/login');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await Promise.all([page.waitForURL(/\/ar\/admin(?!\/login)/), page.click('button[type=submit]')]);
}

async function stats() {
  const { data } = await db.from('ad_daily_stats').select('impressions, clicks').eq('campaign_id', campaignId);
  return (data ?? []).reduce((s, r) => ({ i: s.i + r.impressions, c: s.c + r.clicks }), { i: 0, c: 0 });
}

async function waitStats(pred: (s: { i: number; c: number }) => boolean) {
  for (let k = 0; k < 40; k++) {
    const s = await stats();
    if (pred(s)) return s;
    await new Promise((r) => setTimeout(r, 250));
  }
  return stats();
}

test.describe.serial('sponsor ads', () => {
  test.beforeAll(async () => {
    const { data } = await db.from('article_cards').select('public_id, slug, language').eq('language', 'ar').eq('is_sponsored', false).limit(1).single();
    articlePath = `/ar/article/${data!.public_id}/${encodeURIComponent(data!.slug)}`;
  });

  test.afterAll(async () => {
    if (campaignId) {
      await db.from('ad_daily_stats').delete().eq('campaign_id', campaignId);
      await db.from('ad_campaigns').delete().eq('id', campaignId);
    }
    await db.from('ad_slots').update({ mode: 'off' }).eq('key', 'sidebar_top');
  });

  test('admin turns a slot on and creates a campaign', async ({ page }) => {
    await routeRemoteImages(page);
    await login(page, 'admin@elborj.test');
    await page.goto('/ar/admin/ads');
    const row = page.locator('form', { hasText: 'sidebar_top' });
    await row.locator('select').selectOption('direct');
    await row.getByRole('button', { name: 'حفظ' }).click();
    await expect(row.getByText('تم الحفظ')).toBeVisible();

    await page.goto('/ar/admin/ads/campaigns/new');
    await page.fill('#c-sponsor', SPONSOR);
    await page.selectOption('#c-slot', 'sidebar_top');
    await page.getByRole('button', { name: 'اختيار صورة' }).first().click();
    await page.locator('dialog[open] ul button').first().click();
    await page.fill('#c-link', 'http://not-https.example');
    await page.getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('الرابط يجب أن يبدأ بـ https://')).toBeVisible();
    await page.fill('#c-link', CLICK_URL);
    await Promise.all([page.waitForURL(/\/ar\/admin\/ads$/), page.getByRole('button', { name: 'حفظ' }).click()]);
    await expect(page.getByRole('link', { name: SPONSOR })).toBeVisible();
    const { data } = await db.from('ad_campaigns').select('id').eq('sponsor_name', SPONSOR).single();
    campaignId = data!.id;
  });

  test('a reader sees it; one view = one impression; a click is counted and redirected', async ({ page, baseURL }) => {
    await revalidate(baseURL!, ['ads']);
    await routeRemoteImages(page);
    await page.goto(articlePath);
    const slot = page.locator('aside.ad-slot[data-slot="sidebar_top"]');
    await expect(slot.locator('.ad-label')).toHaveText('إشهار');
    const creative = slot.locator(`a.ad-creative[data-campaign="${campaignId}"]`);
    await expect(creative).toBeVisible();
    await expect(creative).toHaveAttribute('rel', 'sponsored noopener');
    await creative.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    // Scrolling away and back within the same page view doesn't count again.
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(300);
    await creative.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    expect((await waitStats((s) => s.i >= 1)).i).toBe(1);

    // The browser follows the 302 in a new tab (Playwright can't route redirect targets, so
    // assert on the redirect response itself).
    const [redirect] = await Promise.all([
      page.context().waitForEvent('response', (r) => r.url().includes(`/api/ads/c/${campaignId}`)),
      creative.click(),
    ]);
    expect(redirect.status()).toBe(302);
    expect(redirect.headers().location).toBe(CLICK_URL);
    expect((await waitStats((s) => s.c >= 1)).c).toBe(1);
  });

  test('bots, staff and forged tokens are not counted', async ({ page, request }) => {
    const before = await stats();
    await request.post('/api/ads/i', { data: { campaign_id: campaignId, slot: 'sidebar_top', ts_token: '1.forged' } });
    await request.get(`/api/ads/c/${campaignId}`, { maxRedirects: 0, headers: { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' } });
    await login(page, 'editor@elborj.test');
    const res = await page.request.get(`/api/ads/c/${campaignId}`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers().location).toBe(CLICK_URL);
    await page.waitForTimeout(1000);
    expect(await stats()).toEqual(before);
  });

  test('the sponsor report shows the numbers and the campaign cannot be deleted', async ({ page }) => {
    await login(page, 'admin@elborj.test');
    await page.goto(`/ar/admin/ads/campaigns/${campaignId}/report`);
    const totals = page.locator('article dl');
    await expect(totals).toContainText('الظهور');
    await expect(totals.locator('dd').nth(0)).toHaveText('1');
    await expect(totals.locator('dd').nth(1)).toHaveText('1');
    await expect(totals.locator('dd').nth(2)).toHaveText('100.00%');
    const csv = await page.request.get(`/ar/admin/ads/campaigns/${campaignId}/report/csv`);
    expect(await csv.text()).toContain(',1,1,1.0000');
    await page.goto(`/ar/admin/ads/campaigns/${campaignId}`);
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'حذف الحملة' }).click();
    await expect(page.getByText('لا يمكن حذف حملة ظهرت للقراء')).toBeVisible();
  });

  test('ads.txt is served from the admin setting', async ({ request }) => {
    const res = await request.get('/ads.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');
  });
});
