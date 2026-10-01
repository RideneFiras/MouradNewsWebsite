// Quick screenshot helper: node scripts/shot.mjs <url> <out.png> [width] [fullPage]
import { chromium } from '@playwright/test';
import { routeRemoteImages } from '../tests/support/route-images.mjs';
const [url, out, width = '1280', full = '1'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1 });
await routeRemoteImages(page);
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.screenshot({ path: out, fullPage: full === '1' });
console.log(res?.status(), out, errors.length ? 'ERRORS: ' + errors.join(' | ').slice(0, 800) : '');
await browser.close();
