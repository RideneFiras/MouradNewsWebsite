// node scripts/shot-clip.mjs <url> <out-prefix> <width> <segments> [segmentHeight]
import { chromium } from '@playwright/test';
import { routeRemoteImages } from '../tests/support/route-images.mjs';
const [url, prefix, width = '375', segs = '2', h = '1300'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
await routeRemoteImages(p);
await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
for (let i = 0; i < Number(segs); i++) await p.screenshot({ path: `${prefix}-${i}.png`, fullPage: true, clip: { x: 0, y: i * Number(h), width: Number(width), height: Number(h) } });
await b.close();
