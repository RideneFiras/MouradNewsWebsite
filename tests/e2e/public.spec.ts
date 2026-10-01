import { expect, test } from '@playwright/test';
import { revalidate, service } from './helpers';

test.describe('public site', () => {
  test('home renders in Arabic (RTL) and French (LTR)', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('.masthead-nav')).toContainText('الكرة الطائرة');
    await expect(page.locator('main h2, main h3').first()).toBeVisible();
    await page.goto('/fr');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('.masthead-nav')).toContainText('Volley-ball');
  });

  test('/ redirects to /ar', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar$/);
  });

  test('article page: JSON-LD, dir, Tunisian month, dateline', async ({ page }) => {
    await page.goto('/ar/section/cap-bon');
    await page.locator('main a[href*="/ar/article/"]').first().click();
    await expect(page).toHaveURL(/\/ar\/article\/\d+\/.+/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join('')).toContain('"NewsArticle"');
    const meta = await page.locator('article time').first().textContent();
    expect(meta).toMatch(/جانفي|فيفري|مارس|أفريل|ماي|جوان|جويلية|أوت|سبتمبر|أكتوبر|نوفمبر|ديسمبر/);
    expect(meta).not.toMatch(/[٠-٩]/);
    await expect(page.locator('.prose-article .dateline').first()).toContainText('—');
  });

  test('article under the wrong locale or slug redirects to the canonical URL', async ({ page }) => {
    await page.goto('/ar/section/cap-bon');
    const href = (await page.locator('main a[href*="/ar/article/"]').first().getAttribute('href'))!;
    const id = href.match(/article\/(\d+)/)![1];
    await page.goto(`/ar/article/${id}/wrong-slug`);
    await expect(page).toHaveURL(new RegExp(`/ar/article/${id}/(?!wrong-slug)`));
    await page.goto(`/fr/article/${id}`);
    await expect(page).toHaveURL(new RegExp(`/ar/article/${id}`));
  });

  test('category pagination', async ({ page, baseURL }) => {
    const db = service();
    const { data: cat } = await db.from('categories').select('id').eq('slug', 'economy').single();
    const rows = Array.from({ length: 25 }, (_, i) => ({
      title: `[تجريبي] مقال اختبار الترقيم ${i + 1}`, category_id: cat!.id, status: 'published',
      published_at: new Date(Date.now() - (100 + i) * 3600_000).toISOString(), is_demo: true, body_text: 'نص',
    }));
    const { data: inserted, error } = await db.from('articles').insert(rows).select('id');
    expect(error).toBeNull();
    try {
      await revalidate(baseURL!);
      await page.goto('/ar/section/economy');
      await expect(page.locator('nav[aria-label="pagination"]')).toBeVisible();
      await page.locator('a[rel="next"]').click();
      await expect(page).toHaveURL(/\/ar\/section\/economy\?page=2/);
      await expect(page.locator('main a[href*="/ar/article/"]').first()).toBeVisible();
      await expect(page.locator('a[rel="prev"]')).toBeVisible();
    } finally {
      await db.from('articles').delete().in('id', inserted!.map((r) => r.id));
      await revalidate(baseURL!);
    }
  });

  test('search finds a demo article with and without diacritics', async ({ page }) => {
    await page.goto('/ar/search?q=' + encodeURIComponent('الكورنيش'));
    await expect(page.locator('main h2 a').first()).toContainText('الكورنيش');
    await page.goto('/ar/search?q=' + encodeURIComponent('الكُورْنِيش'));
    await expect(page.locator('main h2 a').first()).toContainText('الكورنيش');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('404 page', async ({ page }) => {
    const res = await page.goto('/ar/this-page-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('الصفحة غير موجودة');
    await expect(page.locator('form[role="search"]').last()).toBeVisible();
  });

  test('text-only items have no placeholder image', async ({ page }) => {
    await page.goto('/ar/latest');
    // Every <img> on the page is a real photo with a src; no grey boxes or logo stand-ins.
    const srcs = await page.locator('main img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute('src') ?? ''));
    for (const s of srcs) expect(s).toMatch(/^https?:\/\//);
  });
});
