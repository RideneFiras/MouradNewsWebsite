import { mediaUrl } from '@/lib/env';
import type { MediaRef, Lang } from '@/lib/data/types';
import { SHARE_H, SHARE_W } from './share-image';

export interface ImageProps {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
  alt: string;
  objectPosition: string;
}

/**
 * Crop point for object-fit: cover. A tall picture (portrait photo, poster) cropped to 3:2
 * around its centre loses the face or the poster's title, which are near the top. So when
 * nobody has set a focal point (still the 0.5/0.5 default), tall pictures are cropped from
 * near the top. A focal point set in the editor always wins (except exactly the centre).
 */
export const TALL_DEFAULT_FOCAL_Y = 0.1;
export function objectPosition(m: Pick<MediaRef, 'focal_x' | 'focal_y' | 'width' | 'height'>): string {
  const fx = Number(m.focal_x ?? 0.5);
  let fy = Number(m.focal_y ?? 0.5);
  const tall = !!m.width && !!m.height && m.height > m.width;
  if (tall && fx === 0.5 && fy === 0.5) fy = TALL_DEFAULT_FOCAL_Y;
  return `${Math.round(fx * 100)}% ${Math.round(fy * 100)}%`;
}

export function imageProps(m: MediaRef, lang: Lang, altOverride?: string | null): ImageProps | null {
  const variants = m.variants ?? {};
  const entries = Object.entries(variants)
    .filter(([w]) => /^\d+$/.test(w))
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  const src = mediaUrl(variants['960'] ?? entries[entries.length - 1]?.[1] ?? m.path);
  if (!src) return null;
  const srcSet = entries.map(([w, p]) => `${mediaUrl(p)} ${w}w`).join(', ');
  return {
    src,
    srcSet: srcSet || undefined,
    width: m.width ?? undefined,
    height: m.height ?? undefined,
    alt: altOverride?.trim() || (lang === 'fr' ? m.alt_fr || m.alt_ar : m.alt_ar || m.alt_fr) || '',
    objectPosition: objectPosition(m),
  };
}

export function largestUrl(m: MediaRef | null | undefined): string | null {
  if (!m) return null;
  const widths = Object.keys(m.variants ?? {}).filter((w) => /^\d+$/.test(w)).sort((a, b) => Number(b) - Number(a));
  return mediaUrl(widths[0] ? m.variants[widths[0]] : m.path);
}

/** The 1200×630 JPEG link-preview picture, when the upload made one (share-image.ts). */
export function shareImage(m: MediaRef | null | undefined): { url: string; width: number; height: number; type: string } | null {
  const path = m?.variants?.share;
  const url = path ? mediaUrl(path) : null;
  return url ? { url, width: SHARE_W, height: SHARE_H, type: 'image/jpeg' } : null;
}
