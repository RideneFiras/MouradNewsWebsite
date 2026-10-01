// Design review screenshots (docs/02 "Acceptance checks for design").
// Usage: node scripts/screenshots.mjs <phase-folder> [baseUrl]
// Needs the app running (pnpm dev or pnpm start) with demo content loaded.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { routeRemoteImages } from '../tests/support/route-images.mjs';

const folder = process.argv[2] ?? 'phase1';
const base = process.argv[3] ?? 'http://localhost:3000';
const out = `docs/screenshots/${folder}`;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext();
const probe = await ctx.newPage();
// Find a demo article with a photo and a French one, and an author slug, from the pages themselves.
await probe.goto(`${base}/ar/section/cap-bon`);
const arArticle = await probe.locator('main a[href*="/ar/article/"]').first().getAttribute('href');
await probe.goto(`${base}/fr/latest`);
const frArticle = await probe.locator('main a[href*="/fr/article/"]').first().getAttribute('href');
await probe.close();

const pages = {
  home: (l) => `/${l}`,
  category: (l) => `/${l}/section/cap-bon`,
  article: (l) => (l === 'ar' ? arArticle : frArticle),
  author: (l) => `/${l}/author/demo-leila-ben-youssef`,
  search: (l) => `/${l}/search?q=${l === 'ar' ? encodeURIComponent('قليبية') : 'Kelibia'}`,
  mediakit: (l) => `/${l}/advertise`,
  '404': (l) => `/${l}/this-page-does-not-exist`,
};
for (const [name, path] of Object.entries(pages)) {
  for (const l of ['ar', 'fr']) {
    for (const w of [375, 1280]) {
      const page = await ctx.newPage();
      await page.setViewportSize({ width: w, height: 900 });
      await routeRemoteImages(page);
      const p = path(l);
      if (!p) continue;
      await page.goto(base + p, { waitUntil: 'networkidle', timeout: 120000 });
      await page.screenshot({ path: `${out}/${name}-${l}-${w}.png`, fullPage: true });
      await page.close();
      console.log('shot', name, l, w);
    }
  }
}
await browser.close();
