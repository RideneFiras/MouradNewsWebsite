import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ANON_KEY, SUPABASE_URL, service } from './helpers';

const PASSWORD = 'local-dev-password';
const db = service();

async function rowsFor(campaign: string) {
  const { data } = await db.from('pageviews_raw').select('pv_id, article_id, source, device, utm_campaign, locale').eq('utm_campaign', campaign);
  return data ?? [];
}

async function waitFor<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 10_000): Promise<T> {
  const until = Date.now() + ms;
  let v = await fn();
  while (!ok(v) && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 250));
    v = await fn();
  }
  return v;
}

async function firstArticlePath() {
  const { data } = await db.from('article_cards').select('public_id, slug, language').eq('language', 'ar').limit(1).single();
  return `/ar/article/${data!.public_id}/${encodeURIComponent(data!.slug)}`;
}

test.describe.serial('first-party analytics', () => {
  test('a page view and its engagement are recorded, UTM stripped from the address bar', async ({ page }) => {
    const campaign = `e2e-${Date.now()}`;
    const path = await firstArticlePath();
    await page.goto(`${path}?utm_source=facebook&utm_medium=social&utm_campaign=${campaign}`);
    await expect(page).not.toHaveURL(/utm_/);
    const rows = await waitFor(() => rowsFor(campaign), (r) => r.length === 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.article_id).not.toBeNull();
    expect(rows[0]!.source).toBe('facebook');

    await page.mouse.wheel(0, 20_000);
    await page.waitForTimeout(1500);
    await page.goto('/ar/latest'); // client unmount + pagehide flush the engagement beacon
    const eng = await waitFor(
      async () => (await db.from('engagement_raw').select('max_scroll_pct').eq('pv_id', rows[0]!.pv_id)).data ?? [],
      (r) => r.length === 1,
    );
    expect(eng).toHaveLength(1);
    expect(eng[0]!.max_scroll_pct).toBeGreaterThan(50);
  });

  test('bots and logged-in staff are not counted; forged tokens are dropped', async ({ page, request, baseURL }) => {
    const path = await firstArticlePath();
    const html = await (await request.get(path)).text();
    const token = html.match(/"token":"(\d+\.[A-Za-z0-9_-]+)"/)?.[1] ?? html.match(/token\\?":\\?"(\d+\.[A-Za-z0-9_-]+)/)?.[1];
    expect(token, 'page token embedded in the page').toBeTruthy();
    const beacon = (campaign: string, tsToken = token!) => ({
      type: 'pv', pv_id: crypto.randomUUID(), path, locale: 'ar', referrer: null, utm_source: 'x', utm_medium: 'y',
      utm_campaign: campaign, screen_w: 400, ts_token: tsToken,
    });

    const human = `e2e-human-${Date.now()}`;
    await request.post('/api/t', { data: beacon(human), headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' } });
    expect(await waitFor(() => rowsFor(human), (r) => r.length === 1)).toHaveLength(1);

    const bot = `e2e-bot-${Date.now()}`;
    const botRes = await request.post('/api/t', { data: beacon(bot), headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } });
    expect(botRes.status()).toBe(204);

    const forged = `e2e-forged-${Date.now()}`;
    await request.post('/api/t', { data: beacon(forged, '1.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') });

    // Staff: log in through the admin, then browse the public site in the same browser.
    await page.goto('/ar/admin/login');
    await page.fill('#email', 'editor@elborj.test');
    await page.fill('#password', PASSWORD);
    await Promise.all([page.waitForURL(/\/ar\/admin(?!\/login)/), page.click('button[type=submit]')]);
    const staff = `e2e-staff-${Date.now()}`;
    await page.goto(`${baseURL}${path}?utm_source=x&utm_campaign=${staff}`);
    await expect(page).not.toHaveURL(/utm_/);

    await page.waitForTimeout(2500);
    expect(await rowsFor(bot)).toHaveLength(0);
    expect(await rowsFor(forged)).toHaveLength(0);
    expect(await rowsFor(staff)).toHaveLength(0);
  });

  test('the rollup turns raw hits into daily numbers', async () => {
    const { data: today } = await db.rpc('tunis_today');
    const before = (await db.from('analytics_daily').select('pageviews').eq('date', today).eq('dimension', 'site').maybeSingle()).data?.pageviews ?? 0;
    const { count } = await db.from('pageviews_raw').select('pv_id', { count: 'exact', head: true }).gte('occurred_at', new Date(Date.now() - 3 * 3600_000).toISOString());
    expect(count).toBeGreaterThan(0);
    const { error } = await db.rpc('rollup_day', { p_day: today });
    expect(error).toBeNull();
    const after = (await db.from('analytics_daily').select('pageviews').eq('date', today).eq('dimension', 'site').single()).data!.pageviews;
    expect(after).toBeGreaterThanOrEqual(Math.max(before, 2));
  });

  test('no role can write statistics through the API, admin included', async () => {
    for (const email of ['admin@elborj.test', 'editor@elborj.test', 'author@elborj.test', null]) {
      const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
      if (email) {
        const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
        expect(error).toBeNull();
      }
      const ins = await client.from('analytics_daily').insert({ date: '2020-01-01', dimension: 'site', dimension_value: 'all', pageviews: 999999 });
      expect(ins.error, `${email ?? 'anon'} insert analytics_daily`).not.toBeNull();
      const pv = await client.from('pageviews_raw').insert({ pv_id: crypto.randomUUID(), path: '/ar', locale: 'ar', visitor_hash: '\\x00' });
      expect(pv.error, `${email ?? 'anon'} insert pageviews_raw`).not.toBeNull();
      const upd = await client.from('analytics_daily').update({ pageviews: 999999 }).eq('dimension', 'site').select();
      expect(upd.error !== null || (upd.data ?? []).length === 0, `${email ?? 'anon'} update analytics_daily`).toBe(true);
      const del = await client.from('analytics_daily_article').delete().gte('pageviews', 0).select();
      expect(del.error !== null || (del.data ?? []).length === 0, `${email ?? 'anon'} delete analytics_daily_article`).toBe(true);
      const ads = await client.from('ad_daily_stats').update({ impressions: 999999 }).gte('impressions', 0).select();
      expect(ads.error !== null || (ads.data ?? []).length === 0, `${email ?? 'anon'} update ad_daily_stats`).toBe(true);
      const rpc = await client.rpc('track_pageview', {
        p_pv_id: crypto.randomUUID(), p_path: '/ar', p_article_public_id: null, p_category_slug: null, p_locale: 'ar', p_source: 'direct',
        p_referrer_host: null, p_utm_source: null, p_utm_medium: null, p_utm_campaign: 'forged-rpc', p_country: 'TN', p_device: 'mobile', p_ip: '1', p_ua: 'x',
      });
      expect(rpc.error, `${email ?? 'anon'} call track_pageview`).not.toBeNull();
    }
    expect(await rowsFor('forged-rpc')).toHaveLength(0);
  });
});

test.describe('statistics screens', () => {
  async function loginAs(page: import('@playwright/test').Page, email: string) {
    await page.context().clearCookies();
    await page.goto('/ar/admin/login');
    await page.fill('#email', email);
    await page.fill('#password', PASSWORD);
    await Promise.all([page.waitForURL(/\/ar\/admin(?!\/login)/), page.click('button[type=submit]')]);
  }

  test('editor sees the overview with charts, tooltip and CSV export', async ({ page }) => {
    await loginAs(page, 'editor@elborj.test');
    await page.goto('/ar/admin/stats?range=30d');
    await expect(page.getByRole('heading', { name: 'الإحصائيات' })).toBeVisible();
    const chart = page.locator('figure svg[role=img]').first();
    await expect(chart).toBeVisible();
    const box = (await chart.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('figure [role=status]').first()).toBeVisible();
    const csv = await page.request.get('/ar/admin/stats/export?range=30d&table=articles');
    expect(csv.status()).toBe(200);
    expect(csv.headers()['content-type']).toContain('text/csv');
    expect((await csv.text()).split('\r\n')[0]).toContain('pageviews');
    // No edit control anywhere on statistics.
    await expect(page.locator('main').getByRole('button', { name: /تعديل/ })).toHaveCount(0);
  });

  test('authors only get their own numbers', async ({ page }) => {
    await loginAs(page, 'author@elborj.test');
    await page.goto('/ar/admin/stats');
    await expect(page.getByRole('heading', { name: 'أرقام مقالاتي' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'المصادر' })).toHaveCount(0);
    const csv = await page.request.get('/ar/admin/stats/export?table=sources');
    expect(csv.status()).toBe(403);
  });

  test('editor adds manual Facebook numbers, labelled as manual', async ({ page }) => {
    await loginAs(page, 'editor@elborj.test');
    await page.goto('/ar/admin/stats/social');
    const followers = String(40000 + Math.floor(Math.random() * 9999));
    await page.fill('#s-followers', followers);
    await page.click('button:has-text("إضافة الأرقام")');
    await expect(page.getByText('أضيفت الأرقام.')).toBeVisible();
    await expect(page.getByText('أرقام مدخلة يدويا من إحصائيات فيسبوك')).toBeVisible();
    const { data } = await db.from('social_stats').select('followers').eq('followers', Number(followers));
    expect(data).toHaveLength(1);
    await db.from('social_stats').delete().eq('followers', Number(followers));
  });
});
