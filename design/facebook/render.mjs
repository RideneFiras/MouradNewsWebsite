// Renders the Facebook profile and cover pictures: node design/facebook/render.mjs (from the repo root).
import { chromium } from '@playwright/test';
const dir = process.cwd() + '/design/facebook/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const [name, w, h] of [['profile', 1080, 1080], ['cover', 1640, 624]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('file://' + dir + name + '.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${dir}${name}-guide.png` });            // with crop guides (review only)
  await p.evaluate(() => document.getElementById('g').remove());
  await p.screenshot({ path: `${dir}${name}.png` });                   // the file to upload
}
await b.close();
