// share.jpg (1200×630 link preview) with sharp, same geometry as the admin uploader
// (src/lib/public/share-image.ts). Used by publish-article.ts and backfill-share-images.ts.
import sharp from 'sharp';
import { SHARE_BG, SHARE_H, SHARE_W, shareLayout } from '../../src/lib/public/share-image';

export async function shareJpeg(input: string | Buffer, focalX = 0.5, focalY = 0.5): Promise<Buffer> {
  const src = sharp(input, { failOn: 'none' }).rotate();
  const { data: oriented, info } = await src.toBuffer({ resolveWithObject: true });
  const l = shareLayout(info.width, info.height, focalX, focalY);
  const part = await sharp(oriented)
    .extract({ left: l.sx, top: l.sy, width: l.sw, height: l.sh })
    .resize({ width: l.dw, height: l.dh, fit: 'fill' })
    .toBuffer();
  return sharp({ create: { width: SHARE_W, height: SHARE_H, channels: 3, background: SHARE_BG } })
    .composite([{ input: part, left: l.dx, top: l.dy }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
