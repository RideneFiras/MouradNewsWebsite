/**
 * Link-preview picture ("og:image"): 1200×630 JPEG, the size WhatsApp, Facebook and X show
 * as a large card. WebP and tall originals came out as a small square thumbnail.
 * Wide pictures are cropped to fill (around the focal point); square and tall ones (posters,
 * portraits) are shown whole on the paper colour, so a poster's title and dates survive.
 * Same geometry for the admin upload (canvas) and the publish/backfill scripts (sharp).
 */
export const SHARE_W = 1200;
export const SHARE_H = 630;
export const SHARE_NAME = 'share.jpg';
export const SHARE_BG = '#f5f1e8'; // --paper (canvas and sharp can't read CSS tokens)

export interface ShareLayout {
  /** Source rectangle (in source pixels) and where it lands on the 1200×630 canvas. */
  sx: number; sy: number; sw: number; sh: number;
  dx: number; dy: number; dw: number; dh: number;
  fill: boolean;
}

export function shareLayout(w: number, h: number, focalX = 0.5, focalY = 0.5): ShareLayout {
  const target = SHARE_W / SHARE_H;
  if (w / h >= 1.3) {
    // Crop to 1200:630 around the focal point.
    let sw = w, sh = h;
    if (w / h > target) sw = Math.round(h * target);
    else sh = Math.round(w / target);
    const sx = Math.round(Math.min(Math.max(focalX * w - sw / 2, 0), w - sw));
    const sy = Math.round(Math.min(Math.max(focalY * h - sh / 2, 0), h - sh));
    return { sx, sy, sw, sh, dx: 0, dy: 0, dw: SHARE_W, dh: SHARE_H, fill: true };
  }
  // Whole picture, full height, centred on paper.
  const dh = SHARE_H;
  const dw = Math.round((w * dh) / h);
  return { sx: 0, sy: 0, sw: w, sh: h, dx: Math.round((SHARE_W - dw) / 2), dy: 0, dw, dh, fill: false };
}
