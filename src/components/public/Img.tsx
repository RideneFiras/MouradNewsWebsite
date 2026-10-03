import type { MediaRef, Lang } from '@/lib/data/types';
import { imageProps } from '@/lib/public/media';

interface Props {
  media: MediaRef;
  lang: Lang;
  alt?: string | null;
  ratio?: '3/2' | '1/1' | '4/3' | 'auto';
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/** Plain <img srcset> from pre-generated WebP variants; focal point as object-position (wide pictures), whole picture (tall ones). 0 radius, no filters. */
export function Img({ media, lang, alt, ratio = '3/2', sizes = '100vw', priority = false, className = '' }: Props) {
  const p = imageProps(media, lang, alt);
  if (!p) return null;
  // Tall pictures (posters, scanned statements, portrait photos) are shown whole on the
  // paper background instead of being cropped to the box: a poster cut in half reads badly.
  // A focal point set in the media library means "crop here", so it keeps the crop.
  const focalSet = Number(media.focal_x ?? 0.5) !== 0.5 || Number(media.focal_y ?? 0.5) !== 0.5;
  const tall = ratio !== 'auto' && !focalSet && !!media.width && !!media.height && media.height > media.width * 1.05;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- deliberate: no paid image optimisation (docs/03)
    <img
      src={p.src}
      srcSet={p.srcSet}
      sizes={p.srcSet ? sizes : undefined}
      width={p.width}
      height={p.height}
      alt={p.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding={priority ? 'sync' : 'async'}
      // ratio "auto": the whole image, never cropped (posters); width follows its height cap.
      className={`block ${ratio === 'auto' ? 'mx-auto h-auto max-w-full' : 'w-full'} bg-paper-2 ${className}`}
      style={{ aspectRatio: ratio === 'auto' ? undefined : ratio, objectFit: tall ? 'contain' : 'cover', objectPosition: tall ? '50% 50%' : p.objectPosition }}
    />
  );
}
