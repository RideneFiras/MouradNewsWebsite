import { chromium } from '@playwright/test';
import { routeRemoteImages } from '../tests/support/route-images.mjs';
const b = await chromium.launch();
for (let k = 0; k < 2; k++) {
  const ctx = await b.newContext({ viewport: { width: 375, height: 740 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await routeRemoteImages(p);
  await p.addInitScript(() => { window.__s = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__s.push({ v: e.value, t: Math.round(e.startTime), n: e.sources?.map((s) => s.node?.className || s.node?.nodeName).join('|') }); }).observe({ type: 'layout-shift', buffered: true }); });
  await p.goto(process.argv[2], { waitUntil: 'load' });
  for (let y = 0; y < 6; y++) { await p.mouse.wheel(0, 700); await p.waitForTimeout(250); }
  await p.waitForTimeout(1000);
  console.log(JSON.stringify(await p.evaluate(() => window.__s)));
  await ctx.close();
}
await b.close();
