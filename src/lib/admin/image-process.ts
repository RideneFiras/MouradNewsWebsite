// Client-side image processing before upload (docs/03 "Images and media"):
// WebP variants at 480/960/1600 px + an original capped at 2400 px. Re-encoding through a
// canvas drops EXIF (location etc.); orientation is applied first. No paid image service.
// Plus share.jpg, the 1200×630 link-preview picture (src/lib/public/share-image.ts).
import { SHARE_BG, SHARE_H, SHARE_NAME, SHARE_W, shareLayout } from '@/lib/public/share-image';

export const VARIANT_WIDTHS = [480, 960, 1600] as const;
const MAX_ORIGINAL = 2400;
const QUALITY = 0.82;

export interface ProcessedImage {
  width: number;
  height: number;
  files: { name: string; blob: Blob; width: number; type: string }[];
  mime: string;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), type, quality));
}

async function resize(bitmap: ImageBitmap, width: number): Promise<Blob> {
  const w = Math.min(width, bitmap.width);
  const h = Math.round((bitmap.height * w) / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  return toBlob(canvas, 'image/webp', QUALITY);
}

async function shareImage(bitmap: ImageBitmap): Promise<Blob> {
  const l = shareLayout(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.fillStyle = SHARE_BG;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, l.sx, l.sy, l.sw, l.sh, l.dx, l.dy, l.dw, l.dh);
  return toBlob(canvas, 'image/jpeg', QUALITY);
}

export async function processImage(file: File): Promise<ProcessedImage> {
  if (file.type === 'image/svg+xml') {
    return { width: 1, height: 1, mime: 'image/svg+xml', files: [{ name: 'original.svg', blob: file, width: 0, type: 'image/svg+xml' }] };
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const files: ProcessedImage['files'] = [];
    const originalWidth = Math.min(bitmap.width, MAX_ORIGINAL);
    files.push({ name: 'original.webp', blob: await resize(bitmap, originalWidth), width: originalWidth, type: 'image/webp' });
    for (const w of VARIANT_WIDTHS) {
      if (w < bitmap.width) files.push({ name: `w${w}.webp`, blob: await resize(bitmap, w), width: w, type: 'image/webp' });
    }
    files.push({ name: SHARE_NAME, blob: await shareImage(bitmap), width: SHARE_W, type: 'image/jpeg' });
    const height = Math.round((bitmap.height * originalWidth) / bitmap.width);
    return { width: originalWidth, height, mime: 'image/webp', files };
  } finally {
    bitmap.close();
  }
}
