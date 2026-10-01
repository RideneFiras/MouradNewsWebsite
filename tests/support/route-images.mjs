// The cloud sandbox re-signs HTTPS with its own CA, which Playwright's Chromium does not
// trust. Instead of disabling certificate checks, remote demo images are fetched from
// Node (which trusts the sandbox CA via NODE_EXTRA_CA_CERTS), cached on disk (Wikimedia
// rate-limits repeated requests) and handed to the page. Harmless on a normal machine.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const dir = join(tmpdir(), 'elborj-image-cache');
mkdirSync(dir, { recursive: true });

async function load(url) {
  const file = join(dir, createHash('sha1').update(url).digest('hex'));
  if (existsSync(file)) return readFileSync(file);
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'ElBorjTests/1.0 (demo screenshots)' } });
    if (res.ok) {
      const body = Buffer.from(await res.arrayBuffer());
      writeFileSync(file, body);
      return body;
    }
    if (res.status !== 429) return null;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return null;
}

export async function routeRemoteImages(page) {
  await page.route(/^https:\/\/upload\.wikimedia\.org\//, async (route) => {
    const body = await load(route.request().url()).catch(() => null);
    if (!body) return route.abort();
    await route.fulfill({ status: 200, body, headers: { 'content-type': 'image/jpeg', 'cache-control': 'max-age=86400' } });
  });
}
