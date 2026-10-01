import { expect, test, type Page } from '@playwright/test';

async function wellFormed(page: Page, xml: string): Promise<string | null> {
  return page.evaluate((src) => {
    const doc = new DOMParser().parseFromString(src, 'application/xml');
    const err = doc.getElementsByTagName('parsererror')[0];
    return err ? err.textContent : null;
  }, xml);
}

test.describe('SEO, sitemaps and feeds', () => {
  test('robots.txt blocks admin, api and search and points to the sitemaps', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text();
    expect(body).toContain('Disallow: /*/admin');
    expect(body).toContain('Disallow: /api/');
    expect(body).toContain('Disallow: /*/search');
    expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
    expect(body).toMatch(/Sitemap: .*\/news-sitemap\.xml/);
  });

  test('sitemap index and every child sitemap are valid XML with absolute URLs', async ({ request, page, baseURL }) => {
    await page.goto('/ar');
    const index = await (await request.get('/sitemap.xml')).text();
    expect(await wellFormed(page, index)).toBeNull();
    const locs = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
    expect(locs.some((l) => /articles-\d{4}-\d{2}\.xml$/.test(l))).toBe(true);
    let urls = 0;
    for (const loc of locs) {
      const res = await request.get(loc.replace(/^https?:\/\/[^/]+/, baseURL!));
      expect(res.status(), loc).toBe(200);
      const xml = await res.text();
      expect(await wellFormed(page, xml), loc).toBeNull();
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        expect(m[1]).toMatch(/^https?:\/\/[^\s]+$/);
        urls++;
      }
    }
    expect(urls).toBeGreaterThan(10);
  });

  test('news sitemap and RSS feeds are valid', async ({ request, page }) => {
    await page.goto('/ar');
    for (const path of ['/news-sitemap.xml', '/ar/rss.xml', '/fr/rss.xml', '/ar/section/cap-bon/rss.xml']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const xml = await res.text();
      expect(await wellFormed(page, xml), path).toBeNull();
    }
    const feed = await (await request.get('/ar/rss.xml')).text();
    expect((feed.match(/<item>/g) ?? []).length).toBeGreaterThan(5);
    expect(feed).toContain('<media:content');
  });

  test('pages declare canonical, hreflang, RSS and JSON-LD', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/ar$/);
    await expect(page.locator('link[rel=alternate][hreflang=fr]')).toHaveCount(1);
    await expect(page.locator('link[rel=alternate][hreflang=x-default]')).toHaveCount(1);
    await expect(page.locator('link[rel=alternate][type="application/rss+xml"]')).toHaveCount(1);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = ld.flatMap((s) => { const j = JSON.parse(s); return (Array.isArray(j) ? j : j['@graph'] ?? [j]).map((x: { '@type': string }) => x['@type']); });
    expect(types).toEqual(expect.arrayContaining(['NewsMediaOrganization', 'WebSite']));
    await page.goto('/ar/search?q=test');
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  });
});
