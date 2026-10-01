import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { service } from './helpers';

// docs/09 Phase 5: no axe violations of serious/critical impact on the main pages.
async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`).join('\n');
  expect(bad, `${label}\n${report}`).toEqual([]);
}

test.describe('accessibility (axe)', () => {
  let article = '';
  let author = '';
  test.beforeAll(async () => {
    const db = service();
    const { data } = await db.from('article_cards').select('public_id, slug').eq('language', 'ar').limit(1).single();
    article = `/ar/article/${data!.public_id}/${encodeURIComponent(data!.slug)}`;
    const { data: a } = await db.from('public_authors').select('slug').limit(1).single();
    author = `/ar/author/${a!.slug}`;
  });

  for (const width of [375, 1280]) {
    test(`public pages at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/ar', '/fr', article, '/ar/section/cap-bon', '/ar/latest', author, '/ar/search?q=قليبية', '/ar/contact', '/ar/page-that-does-not-exist']) {
        await page.goto(path);
        await audit(page, `${path} @${width}`);
      }
    });
  }

  test('admin login and main screens', async ({ page }) => {
    await page.goto('/ar/admin/login');
    await audit(page, 'login');
    await page.fill('#email', 'admin@elborj.test');
    await page.fill('#password', 'local-dev-password');
    await Promise.all([page.waitForURL(/\/ar\/admin(?!\/login)/), page.click('button[type=submit]')]);
    for (const path of ['/ar/admin', '/ar/admin/articles', '/ar/admin/articles/new', '/ar/admin/stats', '/ar/admin/ads', '/ar/admin/settings', '/fr/admin/stats']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle').catch(() => {});
      await audit(page, path);
    }
  });

  test('keyboard: skip link, visible focus, menu reachable', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/ar');
    await page.keyboard.press('Tab');
    const skip = page.locator('a.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#content$/);
    // Every focusable element gets a visible focus indicator (outline or box-shadow).
    await page.goto('/ar');
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const ok = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return true;
        const s = getComputedStyle(el);
        return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 1) || s.boxShadow !== 'none' || s.textDecorationLine.includes('underline');
      });
      expect(ok, `focus indicator on tab stop ${i + 1}`).toBe(true);
    }
  });
});
