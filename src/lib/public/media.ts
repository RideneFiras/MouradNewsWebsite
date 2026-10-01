import { mediaUrl } from '@/lib/env';
import type { MediaRef, Lang } from '@/lib/data/types';

export interface ImageProps {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
  alt: string;
  objectPosition: string;
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
    objectPosition: `${Math.round(Number(m.focal_x ?? 0.5) * 100)}% ${Math.round(Number(m.focal_y ?? 0.5) * 100)}%`,
  };
}

export function largestUrl(m: MediaRef | null | undefined): string | null {
  if (!m) return null;
  const widths = Object.keys(m.variants ?? {}).filter((w) => /^\d+$/.test(w)).sort((a, b) => Number(b) - Number(a));
  return mediaUrl(widths[0] ? m.variants[widths[0]] : m.path);
}
