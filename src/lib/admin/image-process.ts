// Client-side image processing before upload (docs/03 "Images and media"):
// WebP variants at 480/960/1600 px + an original capped at 2400 px. Re-encoding through a
// canvas drops EXIF (location etc.); orientation is applied first. No paid image service.

export const VARIANT_WIDTHS = [480, 960, 1600] as const;
const MAX_ORIGINAL = 2400;
const QUALITY = 0.82;

export interface ProcessedImage {
  width: number;
  height: number;
  files: { name: string; blob: Blob; width: number }[];
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

export async function processImage(file: File): Promise<ProcessedImage> {
  if (file.type === 'image/svg+xml') {
    return { width: 1, height: 1, mime: 'image/svg+xml', files: [{ name: 'original.svg', blob: file, width: 0 }] };
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const files: ProcessedImage['files'] = [];
    const originalWidth = Math.min(bitmap.width, MAX_ORIGINAL);
    files.push({ name: 'original.webp', blob: await resize(bitmap, originalWidth), width: originalWidth });
    for (const w of VARIANT_WIDTHS) {
      if (w < bitmap.width) files.push({ name: `w${w}.webp`, blob: await resize(bitmap, w), width: w });
    }
    const height = Math.round((bitmap.height * originalWidth) / bitmap.width);
    return { width: originalWidth, height, mime: 'image/webp', files };
  } finally {
    bitmap.close();
  }
}
