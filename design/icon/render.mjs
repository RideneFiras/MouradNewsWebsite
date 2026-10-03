// Site icon (favicon / home-screen icon): the Borj icon mark on paper, square, no rounding.
// Run from the repo root: node design/icon/render.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
const dir = 'design/icon/';
const mark = readFileSync('design/logo/borj-icon.svg', 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
// The mark spans x 2–58, y -7–62 (lighthouse mast above the box): 80-unit square around its centre.
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -12.5 80 80"><rect x="-10" y="-12.5" width="80" height="80" fill="#F5F1E8"/>${mark}</svg>\n`;
writeFileSync(dir + 'icon.svg', tile);
for (const s of [480, 180, 32, 16]) await sharp(Buffer.from(tile), { density: 72 * (s / 80) * 4 }).resize(s, s).png().toFile(`${dir}icon-${s}.png`);
// App icons served by the site itself (public/icons): Chrome on Android only offers
// "Install" with a 192 px and a 512 px icon from the manifest. "maskable" has a wider margin
// so Android's round/squircle mask never cuts the mark; apple-touch-icon is for iOS.
const maskable = tile.replace('viewBox="-10 -12.5 80 80"><rect x="-10" y="-12.5" width="80" height="80"', 'viewBox="-22 -24.5 104 104"><rect x="-22" y="-24.5" width="104" height="104"');
for (const [name, svgText, size] of [['icon-192', tile, 192], ['icon-512', tile, 512], ['icon-maskable-512', maskable, 512], ['apple-touch-icon', tile, 180]]) {
  await sharp(Buffer.from(svgText), { density: 72 * (size / 80) * 4 }).resize(size, size).png().toFile(`public/icons/${name}.png`);
}

// Preview strip at real sizes (and 4x zoom of the small ones) for review.
const imgs = await Promise.all([180, 32, 16].map((s) => sharp(`${dir}icon-${s}.png`).resize(s * (s < 64 ? 4 : 1), null, { kernel: 'nearest' }).toBuffer()));
await sharp({ create: { width: 180 + 128 + 64 + 60, height: 200, channels: 3, background: '#cccccc' } })
  .composite([{ input: imgs[0], left: 10, top: 10 }, { input: imgs[1], left: 210, top: 10 }, { input: imgs[2], left: 360, top: 10 }])
  .png().toFile(dir + 'preview.png');
